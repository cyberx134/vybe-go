import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import type { IceCandidateInit, JoinQueueResult, MatchMessage, PollStateResult, QueueFilters, ReportPayload, ReportResult } from '@vybe/shared';
import { ChatEngine } from './engine.js';
import {
  TransportError,
  type MatchChannel,
  type PeerLike,
  type SessionDescriptionLike,
  type StreamLike,
  type Transport,
  type TransportEvents,
} from './types.js';

/* ---------- ফেক স্ট্রিম ও পিয়ার ---------- */
class FakeStream implements StreamLike {
  getTracks() {
    return [{ kind: 'video', enabled: true, stop() {} }, { kind: 'audio', enabled: true, stop() {} }];
  }
}

class FakePeer implements PeerLike<FakeStream> {
  connectionState = 'new';
  remoteDescription: unknown = null;
  localDescription: unknown = null;
  onicecandidate: PeerLike<FakeStream>['onicecandidate'] = null;
  ontrack: PeerLike<FakeStream>['ontrack'] = null;
  onconnectionstatechange: PeerLike<FakeStream>['onconnectionstatechange'] = null;
  addTrack() {
    return {};
  }
  getSenders() {
    return [];
  }
  async createOffer(): Promise<SessionDescriptionLike> {
    return { type: 'offer', sdp: 'OFFER' };
  }
  async createAnswer(): Promise<SessionDescriptionLike> {
    return { type: 'answer', sdp: 'ANSWER' };
  }
  async setLocalDescription(d: SessionDescriptionLike) {
    this.localDescription = d;
    this.maybeConnect();
  }
  async setRemoteDescription(d: SessionDescriptionLike) {
    this.remoteDescription = d;
    this.maybeConnect();
  }
  async addIceCandidate(_c: IceCandidateInit) {}
  close() {
    this.connectionState = 'closed';
  }
  private maybeConnect() {
    if (this.localDescription && this.remoteDescription && this.connectionState === 'new') {
      this.connectionState = 'connected';
      this.ontrack?.({ streams: [new FakeStream()] });
      this.onconnectionstatechange?.();
    }
  }
}

/* ---------- ফেক ব্যাকএন্ড (Supabase এর আচরণ নকল) ---------- */
interface FakeMatch {
  a: FakeTransport;
  b: FakeTransport;
  ended: boolean;
}

class FakeHub {
  waiting: Array<{ transport: FakeTransport; filters: QueueFilters }> = [];
  matches = new Map<string, FakeMatch>();
  channels = new Map<string, Map<FakeTransport, (m: MatchMessage) => void>>();
  seq = 0;
}

class FakeTransport implements Transport {
  events!: TransportEvents;
  joinError: TransportError | null = null;

  constructor(private readonly hub: FakeHub) {}

  async connect(events: TransportEvents) {
    this.events = events;
    events.onConnection(true);
  }
  async disconnect() {}

  private endActive() {
    for (const [id, m] of this.hub.matches) {
      if (m.ended || (m.a !== this && m.b !== this)) continue;
      m.ended = true;
      (m.a === this ? m.b : m.a).events.onEnded(id);
    }
  }

  async join(filters: QueueFilters): Promise<JoinQueueResult> {
    if (this.joinError) throw this.joinError;
    this.endActive();
    this.hub.waiting = this.hub.waiting.filter((w) => w.transport !== this);
    const waiter = this.hub.waiting.shift();
    if (!waiter) {
      this.hub.waiting.push({ transport: this, filters });
      return { status: 'queued' };
    }
    const id = `match-${++this.hub.seq}`;
    this.hub.matches.set(id, { a: waiter.transport, b: this, ended: false });
    queueMicrotask(() => waiter.transport.events.onMatch({ matchId: id, initiator: true, partnerCountry: filters.selfCountry }));
    return { status: 'matched', match: { matchId: id, initiator: false, partnerCountry: waiter.filters.selfCountry } };
  }
  async leaveQueue() {
    this.hub.waiting = this.hub.waiting.filter((w) => w.transport !== this);
  }
  async pollState(current: string | null): Promise<PollStateResult> {
    const m = current ? this.hub.matches.get(current) : undefined;
    return { inQueue: this.hub.waiting.some((w) => w.transport === this), match: null, currentEnded: current ? (m?.ended ?? true) : false };
  }
  async endMatch(id: string) {
    const m = this.hub.matches.get(id);
    if (!m || m.ended) return;
    m.ended = true;
    (m.a === this ? m.b : m.a).events.onEnded(id);
  }
  async report(_p: ReportPayload): Promise<ReportResult> {
    return { accepted: true, banned: false };
  }
  async block() {}
  async onlineCount() {
    return 2;
  }
  async fetchIceServers() {
    return [];
  }
  async openMatchChannel(id: string, onMessage: (m: MatchMessage) => void): Promise<MatchChannel> {
    const members = this.hub.channels.get(id) ?? new Map();
    this.hub.channels.set(id, members);
    members.set(this, onMessage);
    return {
      send: async (message) => {
        for (const [who, handler] of members) if (who !== this) setImmediate(() => handler(message));
      },
      close: async () => {
        members.delete(this);
      },
    };
  }
}

/* ---------- সহায়ক ---------- */
const filters = (country: string): QueueFilters => ({ selfGender: 'boy', selfCountry: country, wantGender: 'any', wantCountry: 'Global' });

async function until(check: () => boolean, label: string, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for: ${label}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

function makePair() {
  const hub = new FakeHub();
  const make = () => {
    const transport = new FakeTransport(hub);
    const engine = new ChatEngine<FakeStream>({ transport, createPeer: () => new FakePeer() });
    engine.setLocalStream(new FakeStream());
    engine.connect();
    return { engine, transport };
  };
  return { hub, a: make(), b: make() };
}

describe('ChatEngine', () => {
  const engines: Array<ChatEngine<FakeStream>> = [];
  after(() => engines.forEach((e) => e.dispose()));

  it('connects to the backend and starts idle', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle', 'a idle');
    assert.equal(a.engine.getState().hasLocalStream, true);
  });

  it('matches two users, completes the offer/answer handshake and shows remote video', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle' && b.engine.getState().phase === 'idle', 'both idle');

    assert.equal(await a.engine.start(filters('Bangladesh')), true);
    assert.equal(a.engine.getState().phase, 'searching');
    await b.engine.start(filters('India'));

    await until(() => a.engine.getState().phase === 'connected' && b.engine.getState().phase === 'connected', 'both connected');
    assert.equal(a.engine.getState().partnerCountry, 'India');
    assert.equal(b.engine.getState().partnerCountry, 'Bangladesh');
    assert.ok(a.engine.getState().remoteStream);
    assert.ok(b.engine.getState().remoteStream);
  });

  it('delivers chat messages and throttles bursts', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle', 'idle');
    await a.engine.start(filters('Bangladesh'));
    await b.engine.start(filters('India'));
    await until(() => a.engine.getState().phase === 'connected', 'connected');

    assert.equal(await a.engine.sendMessage('hello  '), true);
    await until(() => b.engine.getState().messages.some((m) => m.text === 'hello' && !m.mine), 'chat delivered');
    assert.equal(await a.engine.sendMessage('too fast'), false);
    assert.equal(await a.engine.sendMessage('   '), false);
  });

  it('swipe-next: the partner is told, both search again and reconnect to a NEW match', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle', 'idle');
    await a.engine.start(filters('Bangladesh'));
    await b.engine.start(filters('India'));
    await until(() => a.engine.getState().phase === 'connected' && b.engine.getState().phase === 'connected', 'connected');
    const firstId = a.engine.getState().matchId;

    await a.engine.next();
    await until(
      () => a.engine.getState().phase === 'connected' && b.engine.getState().phase === 'connected' && a.engine.getState().matchId !== firstId,
      'reconnected with a new match',
    );
    assert.equal(a.engine.getState().matchId, b.engine.getState().matchId);
  });

  it('stop returns to idle, clears the remote stream and tells the partner', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle', 'idle');
    await a.engine.start(filters('Bangladesh'));
    await b.engine.start(filters('India'));
    await until(() => a.engine.getState().phase === 'connected', 'connected');

    a.engine.stop();
    assert.equal(a.engine.getState().phase, 'idle');
    assert.equal(a.engine.getState().remoteStream, null);
    assert.equal(a.engine.getState().matchId, null);
    await until(() => b.engine.getState().phase === 'searching', 'partner goes back to searching');
  });

  it('refuses to start without a camera stream', async () => {
    const hub = new FakeHub();
    const engine = new ChatEngine<FakeStream>({ transport: new FakeTransport(hub), createPeer: () => new FakePeer() });
    engines.push(engine);
    engine.connect();
    await until(() => engine.getState().phase === 'idle', 'idle');
    assert.equal(await engine.start(filters('Bangladesh')), false);
    assert.equal(engine.getState().phase, 'idle');
    assert.match(engine.getState().notice?.text ?? '', /Camera/);
  });

  it('shows the banned state when the backend rejects the join', async () => {
    const hub = new FakeHub();
    const transport = new FakeTransport(hub);
    const engine = new ChatEngine<FakeStream>({ transport, createPeer: () => new FakePeer() });
    engines.push(engine);
    engine.setLocalStream(new FakeStream());
    engine.connect();
    await until(() => engine.getState().phase === 'idle', 'idle');
    transport.joinError = new TransportError('BANNED', 'Access paused', 1_900_000_000_000);
    await engine.start(filters('Bangladesh'));
    assert.equal(engine.getState().banUntil, 1_900_000_000_000);
    assert.equal(engine.getState().phase, 'offline');
  });

  it('report sends the report and moves on to the next partner', async () => {
    const { a, b } = makePair();
    engines.push(a.engine, b.engine);
    await until(() => a.engine.getState().phase === 'idle', 'idle');
    await a.engine.start(filters('Bangladesh'));
    await b.engine.start(filters('India'));
    await until(() => a.engine.getState().phase === 'connected', 'connected');
    assert.equal(await b.engine.report('spam', 'ad bot'), true);
    assert.match(b.engine.getState().notice?.text ?? '', /Report sent|Your partner left/);
  });
});
