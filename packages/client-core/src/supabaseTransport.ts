import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
  isUuid,
  parseMatchMessage,
  type IceServerConfig,
  type JoinQueueResult,
  type MatchFound,
  type MatchMessage,
  type PollStateResult,
  type QueueFilters,
  type ReportPayload,
  type ReportResult,
} from '@vybe/shared';
import {
  TransportError,
  type MatchChannel,
  type Transport,
  type TransportEvents,
} from './types.js';

/** Auth সেশন সংরক্ষণের ন্যূনতম চুক্তি (ওয়েবে localStorage, মোবাইলে AsyncStorage) */
export interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface SupabaseTransportConfig {
  url: string;
  anonKey: string;
  /** না দিলে ব্রাউজারের localStorage */
  storage?: AuthStorage;
}

const FALLBACK_ICE: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const SUBSCRIBE_TIMEOUT_MS = 10_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** DB এর snake_case JSON → MatchFound */
export function parseMatchPayload(raw: unknown): MatchFound | null {
  if (!isRecord(raw)) return null;
  const { match_id: matchId, initiator, partner_country: partnerCountry } = raw;
  if (!isUuid(matchId) || typeof initiator !== 'boolean' || typeof partnerCountry !== 'string') return null;
  return { matchId, initiator, partnerCountry: partnerCountry.slice(0, 40) };
}

function mapError(error: { message?: string; status?: number; name?: string }): TransportError {
  const message = error.message ?? 'Unknown error';
  if (message.startsWith('BANNED:')) {
    const until = Number(message.slice('BANNED:'.length));
    return new TransportError('BANNED', 'Access paused', Number.isFinite(until) ? until : 0);
  }
  if (message.includes('NOT_IN_MATCH')) return new TransportError('NOT_IN_MATCH', 'This conversation can no longer be used.');
  if (message.includes('INVALID')) return new TransportError('INVALID', 'Invalid request.');
  if (message.includes('AUTH_REQUIRED')) return new TransportError('AUTH_REQUIRED', 'Please sign in again.');
  if (/fetch|network|failed to|timeout/i.test(message) || error.name === 'TypeError') return new TransportError('NETWORK', message);
  return new TransportError('SERVER', message);
}

function subscribe(channel: RealtimeChannel, onStatus?: (status: string) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TransportError('NETWORK', 'Realtime connection timed out')), SUBSCRIBE_TIMEOUT_MS);
    channel.subscribe((status) => {
      onStatus?.(status);
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new TransportError('NETWORK', `Realtime error: ${status}`));
      }
    });
  });
}

/**
 * Supabase ব্যাকএন্ড:
 *  - Anonymous Auth → প্রতি ডিভাইসের স্থায়ী বেনামী ইউজার
 *  - Postgres RPC → matchmaking, report, block (supabase/migrations)
 *  - Realtime Broadcast → signaling ও চ্যাট (ম্যাচ-চ্যানেল), ম্যাচ-নোটিফিকেশন (ইউজার-চ্যানেল)
 *  - Edge Function `ice` → TURN credential
 */
export class SupabaseTransport implements Transport {
  private readonly client: SupabaseClient;
  private userChannel: RealtimeChannel | null = null;

  constructor(config: SupabaseTransportConfig) {
    this.client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(config.storage ? { storage: config.storage } : {}),
      },
      realtime: { params: { eventsPerSecond: 40 } },
    });
  }

  async connect(events: TransportEvents): Promise<void> {
    const { auth } = this.client;
    const first = await auth.getSession();
    let session = first.data.session;

    if (session) {
      const { error } = await auth.getUser();
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) {
          await auth.signOut();
          session = null;
        } else {
          throw mapError(error);
        }
      }
    }
    if (!session) {
      const { data, error } = await auth.signInAnonymously();
      if (error || !data.session) throw new TransportError('AUTH_REQUIRED', error?.message ?? 'Anonymous sign-in failed');
      session = data.session;
    }

    await this.subscribeUserChannel(session.user.id, events);
  }

  private async subscribeUserChannel(userId: string, events: TransportEvents): Promise<void> {
    if (this.userChannel) await this.client.removeChannel(this.userChannel);
    const channel = this.client.channel(`user:${userId}`, { config: { broadcast: { self: false } } });
    this.userChannel = channel;

    channel.on('broadcast', { event: 'match' }, ({ payload }) => {
      const match = parseMatchPayload(payload);
      if (match) events.onMatch(match);
    });
    channel.on('broadcast', { event: 'ended' }, ({ payload }) => {
      const id = isRecord(payload) ? payload.match_id : null;
      if (isUuid(id)) events.onEnded(id);
    });
    channel.on('broadcast', { event: 'banned' }, ({ payload }) => {
      const until = isRecord(payload) ? Number(payload.until) : 0;
      events.onBanned(Number.isFinite(until) ? until : 0);
    });

    await subscribe(channel, (status) => {
      if (status === 'SUBSCRIBED') events.onConnection(true);
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') events.onConnection(false);
    });
  }

  async disconnect(): Promise<void> {
    this.userChannel = null;
    await this.client.removeAllChannels();
  }

  private async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      if (error) throw mapError(error);
      return data as T;
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw mapError(error as Error);
    }
  }

  async join(filters: QueueFilters): Promise<JoinQueueResult> {
    const data = await this.rpc<Record<string, unknown>>('join_queue', {
      p_self_gender: filters.selfGender,
      p_self_country: filters.selfCountry,
      p_want_gender: filters.wantGender,
      p_want_country: filters.wantCountry,
    });
    if (data?.status === 'matched') {
      const match = parseMatchPayload(data);
      if (match) return { status: 'matched', match };
      throw new TransportError('SERVER', 'Malformed match response');
    }
    return { status: 'queued' };
  }

  async leaveQueue(): Promise<void> {
    await this.rpc('leave_queue');
  }

  async pollState(currentMatchId: string | null): Promise<PollStateResult> {
    const data = await this.rpc<Record<string, unknown>>('poll_state', { p_match_id: currentMatchId });
    return {
      inQueue: data?.in_queue === true,
      match: parseMatchPayload(data?.match),
      currentEnded: data?.current_ended === true,
    };
  }

  async endMatch(matchId: string): Promise<void> {
    await this.rpc('end_match', { p_match_id: matchId });
  }

  async report(payload: ReportPayload): Promise<ReportResult> {
    const data = await this.rpc<Record<string, unknown>>('report_user', {
      p_match_id: payload.matchId,
      p_reason: payload.reason,
      p_details: payload.details ?? null,
      p_evidence: payload.evidence ?? [],
    });
    return { accepted: data?.accepted === true, banned: data?.banned === true };
  }

  async block(matchId: string): Promise<void> {
    await this.rpc('block_user', { p_match_id: matchId });
  }

  async onlineCount(): Promise<number> {
    const count = await this.rpc<number>('online_count');
    return typeof count === 'number' && Number.isFinite(count) ? count : 0;
  }

  async fetchIceServers(): Promise<IceServerConfig[]> {
    try {
      const { data, error } = await this.client.functions.invoke('ice', { body: {} });
      if (error || !isRecord(data) || !Array.isArray(data.iceServers) || data.iceServers.length === 0) return FALLBACK_ICE;
      return data.iceServers as IceServerConfig[];
    } catch {
      return FALLBACK_ICE;
    }
  }

  async openMatchChannel(matchId: string, onMessage: (message: MatchMessage) => void): Promise<MatchChannel> {
    const channel = this.client.channel(`match:${matchId}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'm' }, ({ payload }) => {
      const message = parseMatchMessage(payload);
      if (message) onMessage(message);
    });
    try {
      await subscribe(channel);
    } catch (error) {
      await this.client.removeChannel(channel);
      throw error;
    }
    return {
      send: async (message) => {
        await channel.send({ type: 'broadcast', event: 'm', payload: message });
      },
      close: async () => {
        await this.client.removeChannel(channel);
      },
    };
  }
}
