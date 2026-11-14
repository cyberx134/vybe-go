import {
  COUNTRIES,
  FILTER_COUNTRIES,
  GENDERS,
  LIMITS,
  REPORT_REASONS,
  type Gender,
  type GenderPreference,
  type ReportReason,
} from './constants.js';
import type { IceCandidateInit, MatchMessage, QueueFilters, ReportPayload } from './protocol.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export const isGender = (v: unknown): v is Gender =>
  typeof v === 'string' && (GENDERS as readonly string[]).includes(v);

export const isGenderPreference = (v: unknown): v is GenderPreference => v === 'any' || isGender(v);

export const isCountry = (v: unknown): v is (typeof COUNTRIES)[number] =>
  typeof v === 'string' && (COUNTRIES as readonly string[]).includes(v);

export const isCountryFilter = (v: unknown): v is (typeof FILTER_COUNTRIES)[number] =>
  typeof v === 'string' && (FILTER_COUNTRIES as readonly string[]).includes(v);

export function parseQueueFilters(input: unknown): QueueFilters | null {
  if (!isRecord(input)) return null;
  const { selfGender, selfCountry, wantGender, wantCountry } = input;
  if (!isGender(selfGender) || !isCountry(selfCountry)) return null;
  if (!isGenderPreference(wantGender) || !isCountryFilter(wantCountry)) return null;
  return { selfGender, selfCountry, wantGender, wantCountry };
}

/** মেসেজ টেক্সট পরিষ্কার করে; অবৈধ হলে null */
export function parseChatText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(CONTROL_CHARS_RE, '').trim();
  if (cleaned.length === 0 || cleaned.length > LIMITS.maxMessageLength) return null;
  return cleaned;
}

function parseCandidate(input: unknown): IceCandidateInit | null {
  if (!isRecord(input)) return null;
  const { candidate, sdpMid, sdpMLineIndex, usernameFragment } = input;
  if (typeof candidate !== 'string' || candidate.length > LIMITS.maxCandidateLength) return null;
  if (sdpMid != null && typeof sdpMid !== 'string') return null;
  if (sdpMLineIndex != null && (typeof sdpMLineIndex !== 'number' || !Number.isInteger(sdpMLineIndex))) return null;
  if (usernameFragment != null && typeof usernameFragment !== 'string') return null;
  return { candidate, sdpMid: sdpMid ?? null, sdpMLineIndex: sdpMLineIndex ?? null, usernameFragment: usernameFragment ?? null };
}

/** ম্যাচ-চ্যানেল থেকে আসা কাঁচা বার্তা যাচাই করে; অবৈধ হলে null */
export function parseMatchMessage(input: unknown): MatchMessage | null {
  if (!isRecord(input)) return null;
  switch (input.t) {
    case 'hello':
      return { t: 'hello' };
    case 'leave':
      return { t: 'leave' };
    case 'offer':
    case 'answer': {
      const sdp = input.sdp;
      if (typeof sdp !== 'string' || sdp.length === 0 || sdp.length > LIMITS.maxSdpLength) return null;
      return { t: input.t, sdp };
    }
    case 'candidate': {
      const candidate = parseCandidate(input.candidate);
      return candidate ? { t: 'candidate', candidate } : null;
    }
    case 'chat': {
      const text = parseChatText(input.text);
      if (!text) return null;
      const ts = typeof input.ts === 'number' && Number.isFinite(input.ts) ? input.ts : Date.now();
      return { t: 'chat', text, ts };
    }
    default:
      return null;
  }
}

export function parseReport(input: unknown): ReportPayload | null {
  if (!isRecord(input) || !isUuid(input.matchId)) return null;
  if (typeof input.reason !== 'string' || !(REPORT_REASONS as readonly string[]).includes(input.reason)) return null;
  const reason = input.reason as ReportReason;

  let details: string | undefined;
  if (input.details != null) {
    if (typeof input.details !== 'string') return null;
    details = input.details.replace(CONTROL_CHARS_RE, '').trim().slice(0, LIMITS.maxReportDetails) || undefined;
  }

  let evidence: string[] | undefined;
  if (input.evidence != null) {
    if (!Array.isArray(input.evidence)) return null;
    evidence = input.evidence
      .filter((l): l is string => typeof l === 'string')
      .slice(-LIMITS.maxReportEvidenceLines)
      .map((l) => l.replace(CONTROL_CHARS_RE, '').slice(0, LIMITS.maxMessageLength));
  }
  return { matchId: input.matchId, reason, details, evidence };
}
