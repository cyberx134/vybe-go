import type { Gender, GenderPreference, ReportReason } from './constants.js';

export interface QueueFilters {
  /** ইউজার নিজে কী (onboarding এ নির্বাচিত) */
  selfGender: Gender;
  selfCountry: string;
  /** ইউজার কার সাথে কথা বলতে চায় */
  wantGender: GenderPreference;
  /** "Global" অথবা নির্দিষ্ট দেশ */
  wantCountry: string;
}

export interface IceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceConfigResponse {
  iceServers: IceServerConfig[];
  ttlSeconds: number;
}

export interface MatchFound {
  matchId: string;
  /** true হলে এই পক্ষ SDP offer তৈরি করবে (যে আগে থেকে অপেক্ষায় ছিল) */
  initiator: boolean;
  partnerCountry: string;
}

/** ম্যাচ-চ্যানেলে (Supabase Realtime Broadcast) যে বার্তাগুলো আদান-প্রদান হয় */
export type MatchMessage =
  | { t: 'hello' }
  | { t: 'offer'; sdp: string }
  | { t: 'answer'; sdp: string }
  | { t: 'candidate'; candidate: IceCandidateInit }
  | { t: 'chat'; text: string; ts: number }
  | { t: 'leave' };

export type JoinQueueResult = { status: 'queued' } | { status: 'matched'; match: MatchFound };

export interface PollStateResult {
  inQueue: boolean;
  /** এই ইউজারের সক্রিয় ম্যাচ (থাকলে) — Realtime বার্তা মিস হলে এটাই ভরসা */
  match: MatchFound | null;
  /** ক্লায়েন্টের জানা ম্যাচটি সার্ভারে শেষ হয়েছে কিনা */
  currentEnded: boolean;
}

export interface ReportPayload {
  matchId: string;
  reason: ReportReason;
  details?: string;
  /** রিপোর্টকারীর সম্মতিতে পাঠানো সর্বশেষ কিছু মেসেজ */
  evidence?: string[];
}

export interface ReportResult {
  accepted: boolean;
  banned: boolean;
}

export type ErrorCode = 'BANNED' | 'AUTH_REQUIRED' | 'INVALID' | 'NOT_IN_MATCH' | 'NETWORK' | 'SERVER';
