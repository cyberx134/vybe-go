import {
  parseChatText,
  LIMITS,
  type IceCandidateInit,
  type IceServerConfig,
  type MatchFound,
  type MatchMessage,
  type QueueFilters,
  type ReportReason,
} from '@vybe/shared';
import {
  TransportError,
  type ChatLine,
  type EngineDeps,
  type EngineState,
  type MatchChannel,
  type PeerLike,
  type StreamLike,
  type Transport,
} from './types.js';

const CONNECT_TIMEOUT_MS = 25_000;
const DISCONNECTED_GRACE_MS = 8_000;
const POLL_INTERVAL_MS = 8_000;
const STATS_INTERVAL_MS = 30_000;
const HELLO_INTERVAL_MS = 1_000;
const HELLO_MAX_ATTEMPTS = 25;
const CHAT_MIN_INTERVAL_MS = 350;

const noop = (): void => undefined;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL = <S extends StreamLike>(): EngineState<S> => ({
  phase: 'offline',
  online: 0,
  matchId: null,
  partnerCountry: null,
  remoteStream: null,
  messages: [],
  hasLocalStream: false,
  notice: null,
  banUntil: null,
});

/**
 * VYBE GO এর প্ল্যাটফর্ম-নিরপেক্ষ চ্যাট ইঞ্জিন: matchmaking + signaling + WebRTC + চ্যাট স্টেট।
 * ওয়েব ও মোবাইল একই ক্লাস ব্যবহার করে; ব্যাকএন্ড (Transport) ও RTCPeerConnection বাইরে থেকে ইনজেক্ট হয়।
 *
 * Signaling হ্যান্ডশেক: যে আগে অপেক্ষায় ছিল (initiator) সে offer বানায়, কিন্তু অপর পক্ষের চ্যানেল
 * subscribe হওয়ার আগে পাঠালে offer হারিয়ে যায়। তাই অপর পক্ষ subscribe হয়ে "hello" পাঠাতে থাকে,
 * initiator hello পেলে offer পাঠায় (hello আবার এলে একই offer পুনরায় পাঠায়)।
 */
export class ChatEngine<S extends StreamLike> {
  private readonly transport: Transport;
  private state: EngineState<S> = INITIAL<S>();
  private readonly listeners = new Set<() => void>();

  private started = false;
  private disposed = false;
  private realtimeUp = false;
  private localStream: S | null = null;
  private filters: QueueFilters | null = null;

  private searchToken = 0;
  private setupToken = 0;
  private channel: MatchChannel | null = null;
  private peer: PeerLike<S> | null = null;
  private isInitiator = false;
  private offerSdp: string | null = null;
  private pendingMessages: MatchMessage[] = [];
  private pendingCandidates: IceCandidateInit[] = [];
  private chain: Promise<void> = Promise.resolve();

  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private helloTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  private lineId = 0;
  private noticeId = 0;
  private lastChatAt = 0;

  constructor(private readonly deps: EngineDeps<S>) {
    this.transport = deps.transport;
  }

  /* ---------- React-friendly store API (useSyncExternalStore এর সাথে মানানসই) ---------- */

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): EngineState<S> => this.state;

  private setState(patch: Partial<EngineState<S>>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }

  private notify(text: string, tone: 'info' | 'error' = 'info'): void {
    this.noticeId += 1;
    this.setState({ notice: { id: this.noticeId, text, tone } });
  }

  /* ---------- জীবনচক্র ---------- */

  connect(): void {
    if (this.started) return;
    this.started = true;
    void this.runConnect();
  }

  private async runConnect(): Promise<void> {
    let delay = 1_500;
    while (!this.disposed) {
      try {
        await this.transport.connect({
          onMatch: (match) => this.onMatchFound(match),
          onEnded: (matchId) => {
            if (matchId === this.state.matchId) this.onPartnerGone();
          },
          onBanned: (until) => this.onBanned(until),
          onConnection: (up) => this.onConnection(up),
        });
        if (this.disposed) return;
        this.onConnection(true);
        this.startBackgroundTimers();
        return;
      } catch (error) {
        if (error instanceof TransportError && error.code === 'BANNED') {
          this.onBanned(error.until ?? 0);
          return;
        }
        await sleep(delay);
        delay = Math.min(delay * 2, 15_000);
      }
    }
  }

  private onConnection(up: boolean): void {
    this.realtimeUp = up;
    if (up && this.state.phase === 'offline' && this.state.banUntil === null) this.setState({ phase: 'idle' });
    else if (!up && this.state.phase === 'idle') this.setState({ phase: 'offline' });
  }

  private onBanned(until: number): void {
    this.closeMatch(false);
    this.stopBackgroundTimers();
    this.searchToken += 1;
    this.setState({ banUntil: until, phase: 'offline', matchId: null, partnerCountry: null, remoteStream: null });
    void this.transport.disconnect().catch(noop);
  }

  dispose(): void {
    this.disposed = true;
    this.searchToken += 1;
    this.closeMatch(false);
    this.stopBackgroundTimers();
    void this.transport.disconnect().catch(noop);
    this.listeners.clear();
  }

  private startBackgroundTimers(): void {
    this.stopBackgroundTimers();
    this.pollTimer = setInterval(() => void this.pollTick(), POLL_INTERVAL_MS);
    this.statsTimer = setInterval(() => void this.refreshStats(), STATS_INTERVAL_MS);
    void this.refreshStats();
  }

  private stopBackgroundTimers(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.pollTimer = null;
    this.statsTimer = null;
  }

  private async refreshStats(): Promise<void> {
    try {
      const online = await this.transport.onlineCount();
      if (!this.disposed) this.setState({ online });
    } catch {
      /* পরের চক্রে আবার চেষ্টা */
    }
  }

  /**
   * Realtime বার্তা হারালে (ব্যাকগ্রাউন্ড ট্যাব, নেটওয়ার্ক জিটার) এই পোলিংই ভরসা:
   * অপেক্ষারত অবস্থায় ম্যাচ খোঁজে ও queue এ হার্টবিট দেয়; কলে থাকলে ম্যাচ শেষ হয়েছে কিনা দেখে।
   */
  private async pollTick(): Promise<void> {
    if (this.polling || this.disposed) return;
    const phase = this.state.phase;
    if (phase !== 'searching' && phase !== 'connecting' && phase !== 'connected') return;
    this.polling = true;
    try {
      const result = await this.transport.pollState(phase === 'searching' ? null : this.state.matchId);
      if (phase === 'searching' && this.state.phase === 'searching') {
        if (result.match) this.onMatchFound(result.match);
        else if (!result.inQueue && this.filters) void this.start(this.filters);
      } else if (phase !== 'searching' && result.currentEnded && this.state.matchId) {
        this.onPartnerGone();
      }
    } catch (error) {
      if (error instanceof TransportError && error.code === 'BANNED') this.onBanned(error.until ?? 0);
    } finally {
      this.polling = false;
    }
  }

  /* ---------- লোকাল মিডিয়া ---------- */

  setLocalStream(stream: S | null): void {
    const previous = this.localStream;
    this.localStream = stream;
    this.setState({ hasLocalStream: stream !== null });

    if (stream && this.peer && previous !== stream) {
      const senders = this.peer.getSenders();
      for (const track of stream.getTracks()) {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) void sender.replaceTrack(track).catch(noop);
      }
    }
  }

  /* ---------- ম্যাচ নিয়ন্ত্রণ (স্লাইড-ইশারা এগুলোকেই ডাকে) ---------- */

  /** শুরু করা, অথবা বর্তমান ম্যাচ ছেড়ে পরের জন খোঁজা */
  async start(filters: QueueFilters): Promise<boolean> {
    if (this.disposed || this.state.banUntil !== null) return false;
    if (!this.realtimeUp || this.state.phase === 'offline') {
      this.notify('Still connecting to the server…', 'error');
      return false;
    }
    if (!this.localStream) {
      this.notify('Camera and microphone are required', 'error');
      return false;
    }

    this.filters = filters;
    const token = ++this.searchToken;
    this.closeMatch(true);
    this.setState({ phase: 'searching', matchId: null, partnerCountry: null, remoteStream: null, messages: [] });

    try {
      const result = await this.transport.join(filters);
      if (token !== this.searchToken || this.disposed) {
        if (result.status === 'matched') void this.transport.endMatch(result.match.matchId).catch(noop);
        return false;
      }
      if (result.status === 'matched') this.onMatchFound(result.match);
      return true;
    } catch (error) {
      if (token !== this.searchToken) return false;
      if (error instanceof TransportError && error.code === 'BANNED') {
        this.onBanned(error.until ?? 0);
        return false;
      }
      this.notify(error instanceof TransportError ? error.message : 'Could not start. Please try again.', 'error');
      this.setState({ phase: this.realtimeUp ? 'idle' : 'offline' });
      return false;
    }
  }

  async next(): Promise<void> {
    if (this.filters) await this.start(this.filters);
  }

  /** থামানো — উপরে লগো ফিরে আসে, নিচে ক্যামেরা চালু থাকে */
  stop(): void {
    this.searchToken += 1;
    const matchId = this.state.matchId;
    this.closeMatch(true);
    void this.transport.leaveQueue().catch(noop);
    if (matchId) void this.transport.endMatch(matchId).catch(noop);
    this.setState({
      phase: this.realtimeUp ? 'idle' : 'offline',
      matchId: null,
      partnerCountry: null,
      remoteStream: null,
      messages: [],
    });
  }

  /* ---------- চ্যাট / রিপোর্ট / ব্লক ---------- */

  async sendMessage(raw: string): Promise<boolean> {
    const text = parseChatText(raw);
    const channel = this.channel;
    if (!text || !channel || !this.state.matchId) return false;
    const now = Date.now();
    if (now - this.lastChatAt < CHAT_MIN_INTERVAL_MS) {
      this.notify('Slow down a little');
      return false;
    }
    this.lastChatAt = now;
    try {
      await channel.send({ t: 'chat', text, ts: now });
    } catch {
      this.notify('Message not sent', 'error');
      return false;
    }
    this.pushLine(true, text, now);
    return true;
  }

  async report(reason: ReportReason, details?: string): Promise<boolean> {
    const matchId = this.state.matchId;
    if (!matchId) return false;
    const evidence = this.state.messages.slice(-LIMITS.maxReportEvidenceLines).map((l) => `${l.mine ? 'me' : 'them'}: ${l.text}`);
    try {
      const result = await this.transport.report({ matchId, reason, details: details?.trim() || undefined, evidence });
      if (!result.accepted) {
        this.notify('Too many reports. Please try again later.', 'error');
        return false;
      }
    } catch (error) {
      this.notify(error instanceof TransportError ? error.message : 'Could not send the report', 'error');
      return false;
    }
    this.notify('Report sent. Thank you for keeping VYBE GO safe.');
    await this.next();
    return true;
  }

  async block(): Promise<boolean> {
    const matchId = this.state.matchId;
    if (!matchId) return false;
    try {
      await this.transport.block(matchId);
    } catch (error) {
      this.notify(error instanceof TransportError ? error.message : 'Could not block this user', 'error');
      return false;
    }
    this.notify('User blocked');
    await this.next();
    return true;
  }

  private pushLine(mine: boolean, text: string, ts: number): void {
    this.lineId += 1;
    const line: ChatLine = { id: this.lineId, mine, text, ts };
    this.setState({ messages: [...this.state.messages, line].slice(-200) });
  }

  /* ---------- ম্যাচ স্থাপন, signaling ও WebRTC ---------- */

  private onMatchFound(match: MatchFound): void {
    if (this.state.matchId === match.matchId) return;
    if (this.state.phase !== 'searching') {
      void this.transport.endMatch(match.matchId).catch(noop);
      return;
    }
    this.closeMatch(false);
    this.setState({
      phase: 'connecting',
      matchId: match.matchId,
      partnerCountry: match.partnerCountry,
      messages: [],
      remoteStream: null,
    });
    this.connectTimer = setTimeout(() => {
      if (this.state.phase === 'connecting' && this.state.matchId === match.matchId) {
        this.failMatch('Could not connect. Finding someone else…');
      }
    }, CONNECT_TIMEOUT_MS);
    void this.setupMatch(match);
  }

  private async setupMatch(match: MatchFound): Promise<void> {
    const token = ++this.setupToken;
    this.isInitiator = match.initiator;

    let iceServers: IceServerConfig[];
    let channel: MatchChannel;
    try {
      [iceServers, channel] = await Promise.all([
        this.transport.fetchIceServers(),
        this.transport.openMatchChannel(match.matchId, (message) => this.onMatchMessage(token, message)),
      ]);
    } catch {
      if (token === this.setupToken) this.failMatch('Could not connect. Finding someone new…');
      return;
    }
    if (token !== this.setupToken || !this.localStream) {
      void channel.close().catch(noop);
      return;
    }

    this.channel = channel;
    const peer = this.deps.createPeer(iceServers);
    this.peer = peer;

    peer.onicecandidate = (event) => {
      const c = event.candidate;
      if (!c || token !== this.setupToken) return;
      void this.channel
        ?.send({
          t: 'candidate',
          candidate: {
            candidate: c.candidate,
            sdpMid: c.sdpMid ?? null,
            sdpMLineIndex: c.sdpMLineIndex ?? null,
            usernameFragment: c.usernameFragment ?? null,
          },
        })
        .catch(noop);
    };

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream && token === this.setupToken) this.setState({ remoteStream: stream });
    };

    peer.onconnectionstatechange = () => {
      if (token !== this.setupToken) return;
      const state = peer.connectionState;
      if (state === 'connected') {
        this.clearMatchTimers();
        if (this.state.phase === 'connecting') this.setState({ phase: 'connected' });
      } else if (state === 'disconnected') {
        if (!this.disconnectTimer) {
          this.disconnectTimer = setTimeout(() => this.failMatch('Connection lost. Finding someone new…'), DISCONNECTED_GRACE_MS);
        }
      } else if (state === 'failed') {
        this.failMatch('Connection failed. Finding someone new…');
      }
    };

    for (const track of this.localStream.getTracks()) peer.addTrack(track, this.localStream);

    if (!match.initiator) this.startHello(token);

    const queued = this.pendingMessages;
    this.pendingMessages = [];
    for (const message of queued) this.onMatchMessage(token, message);
  }

  private startHello(token: number): void {
    let attempts = 0;
    const tick = (): void => {
      if (token !== this.setupToken || attempts >= HELLO_MAX_ATTEMPTS) {
        this.stopHello();
        return;
      }
      attempts += 1;
      void this.channel?.send({ t: 'hello' }).catch(noop);
    };
    this.stopHello();
    tick();
    this.helloTimer = setInterval(tick, HELLO_INTERVAL_MS);
  }

  private stopHello(): void {
    if (this.helloTimer) clearInterval(this.helloTimer);
    this.helloTimer = null;
  }

  private onMatchMessage(token: number, message: MatchMessage): void {
    if (token !== this.setupToken) return;

    if (message.t === 'chat') {
      this.pushLine(false, message.text, Date.now());
      return;
    }
    if (message.t === 'leave') {
      this.onPartnerGone();
      return;
    }
    const peer = this.peer;
    if (!peer) {
      this.pendingMessages.push(message);
      return;
    }

    switch (message.t) {
      case 'hello':
        if (this.isInitiator) this.enqueue(token, () => this.sendOffer(peer, token));
        break;
      case 'offer':
        if (!this.isInitiator) {
          this.stopHello();
          this.enqueue(token, () => this.handleOffer(peer, token, message.sdp));
        }
        break;
      case 'answer':
        if (this.isInitiator) this.enqueue(token, () => this.handleAnswer(peer, token, message.sdp));
        break;
      case 'candidate':
        this.enqueue(token, () => this.handleCandidate(peer, token, message.candidate));
        break;
      default:
        break;
    }
  }

  private enqueue(token: number, task: () => Promise<void>): void {
    this.chain = this.chain.then(task).catch(() => {
      if (token === this.setupToken) this.failMatch('Connection problem. Finding someone new…');
    });
  }

  private async sendOffer(peer: PeerLike<S>, token: number): Promise<void> {
    if (token !== this.setupToken) return;
    if (!this.offerSdp) {
      const offer = await peer.createOffer();
      if (token !== this.setupToken || !offer.sdp) return;
      await peer.setLocalDescription(offer);
      this.offerSdp = offer.sdp;
    }
    await this.channel?.send({ t: 'offer', sdp: this.offerSdp });
  }

  private async handleOffer(peer: PeerLike<S>, token: number, sdp: string): Promise<void> {
    if (token !== this.setupToken || peer.remoteDescription) return;
    await peer.setRemoteDescription({ type: 'offer', sdp });
    await this.flushCandidates(peer, token);
    const answer = await peer.createAnswer();
    if (token !== this.setupToken || !answer.sdp) return;
    await peer.setLocalDescription(answer);
    await this.channel?.send({ t: 'answer', sdp: answer.sdp });
  }

  private async handleAnswer(peer: PeerLike<S>, token: number, sdp: string): Promise<void> {
    if (token !== this.setupToken || peer.remoteDescription) return;
    await peer.setRemoteDescription({ type: 'answer', sdp });
    await this.flushCandidates(peer, token);
  }

  private async handleCandidate(peer: PeerLike<S>, token: number, candidate: IceCandidateInit): Promise<void> {
    if (token !== this.setupToken) return;
    if (peer.remoteDescription) await peer.addIceCandidate(candidate);
    else this.pendingCandidates.push(candidate);
  }

  private async flushCandidates(peer: PeerLike<S>, token: number): Promise<void> {
    const buffered = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of buffered) {
      if (token !== this.setupToken) return;
      await peer.addIceCandidate(candidate);
    }
  }

  private onPartnerGone(): void {
    if (!this.state.matchId) return;
    this.closeMatch(false);
    this.notify('Your partner left. Finding someone new…');
    void this.next();
  }

  private failMatch(message: string): void {
    this.closeMatch(true);
    this.notify(message, 'error');
    void this.next();
  }

  private clearMatchTimers(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.connectTimer = null;
    this.disconnectTimer = null;
    this.stopHello();
  }

  /** চলমান ম্যাচের সব রিসোর্স বন্ধ করে। notifyPeer হলে অপর পক্ষকে সঙ্গে সঙ্গে "leave" জানায়। */
  private closeMatch(notifyPeer: boolean): void {
    this.setupToken += 1;
    this.clearMatchTimers();
    this.pendingMessages = [];
    this.pendingCandidates = [];
    this.offerSdp = null;

    const channel = this.channel;
    const peer = this.peer;
    this.channel = null;
    this.peer = null;

    if (channel) {
      const closing = notifyPeer ? channel.send({ t: 'leave' }).catch(noop) : Promise.resolve();
      void closing.then(() => channel.close()).catch(noop);
    }
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      try {
        peer.close();
      } catch {
        /* ইতিমধ্যে বন্ধ */
      }
    }
  }
}
