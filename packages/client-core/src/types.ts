import type {
  ErrorCode,
  IceCandidateInit,
  IceServerConfig,
  JoinQueueResult,
  MatchFound,
  MatchMessage,
  PollStateResult,
  QueueFilters,
  ReportPayload,
  ReportResult,
} from '@vybe/shared';

/* ------------------------------------------------------------------ *
 * WebRTC — ওয়েব (DOM) ও মোবাইল (react-native-webrtc) এর সাধারণ অংশ
 * ------------------------------------------------------------------ */
export interface TrackLike {
  kind: string;
  enabled: boolean;
  stop(): void;
}

export interface StreamLike {
  getTracks(): TrackLike[];
}

export interface SessionDescriptionLike {
  type: string;
  sdp?: string;
}

export interface SenderLike {
  track: TrackLike | null;
  replaceTrack(track: TrackLike | null): Promise<void>;
}

export interface IceCandidateLike {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface PeerLike<S extends StreamLike> {
  readonly connectionState: string;
  readonly remoteDescription: unknown;
  addTrack(track: TrackLike, stream: S): unknown;
  getSenders(): SenderLike[];
  createOffer(): Promise<SessionDescriptionLike>;
  createAnswer(): Promise<SessionDescriptionLike>;
  setLocalDescription(description: SessionDescriptionLike): Promise<void>;
  setRemoteDescription(description: SessionDescriptionLike): Promise<void>;
  addIceCandidate(candidate: IceCandidateInit): Promise<void>;
  close(): void;
  onicecandidate: ((event: { candidate: IceCandidateLike | null }) => void) | null;
  ontrack: ((event: { streams?: readonly S[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
}

/* ------------------------------------------------------------------ *
 * Transport — ব্যাকএন্ডের সাথে যোগাযোগের চুক্তি (এখন Supabase)
 * ------------------------------------------------------------------ */
export class TransportError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** BANNED হলে কখন পর্যন্ত (unix ms) */
    readonly until?: number,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export interface TransportEvents {
  /** সার্ভার জানাল: আপনার জন্য ম্যাচ পাওয়া গেছে */
  onMatch(match: MatchFound): void;
  /** অপর পক্ষ ম্যাচ শেষ করেছে */
  onEnded(matchId: string): void;
  onBanned(until: number): void;
  /** Realtime সংযোগ চালু/বন্ধ */
  onConnection(up: boolean): void;
}

export interface MatchChannel {
  send(message: MatchMessage): Promise<void>;
  close(): Promise<void>;
}

export interface Transport {
  connect(events: TransportEvents): Promise<void>;
  disconnect(): Promise<void>;
  join(filters: QueueFilters): Promise<JoinQueueResult>;
  leaveQueue(): Promise<void>;
  pollState(currentMatchId: string | null): Promise<PollStateResult>;
  endMatch(matchId: string): Promise<void>;
  report(payload: ReportPayload): Promise<ReportResult>;
  block(matchId: string): Promise<void>;
  onlineCount(): Promise<number>;
  fetchIceServers(): Promise<IceServerConfig[]>;
  /** চ্যানেল SUBSCRIBED হলে resolve করে */
  openMatchChannel(matchId: string, onMessage: (message: MatchMessage) => void): Promise<MatchChannel>;
}

/* ------------------------------------------------------------------ *
 * Engine
 * ------------------------------------------------------------------ */
export interface EngineDeps<S extends StreamLike> {
  transport: Transport;
  /** প্ল্যাটফর্ম-নির্দিষ্ট RTCPeerConnection তৈরি */
  createPeer(iceServers: IceServerConfig[]): PeerLike<S>;
}

export type Phase = 'offline' | 'idle' | 'searching' | 'connecting' | 'connected';

export interface ChatLine {
  id: number;
  mine: boolean;
  text: string;
  ts: number;
}

export interface Notice {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

export interface EngineState<S extends StreamLike> {
  phase: Phase;
  online: number;
  matchId: string | null;
  partnerCountry: string | null;
  remoteStream: S | null;
  messages: ChatLine[];
  hasLocalStream: boolean;
  notice: Notice | null;
  /** ব্যান হলে কখন পর্যন্ত (unix ms); না জানা থাকলে 0 */
  banUntil: number | null;
}
