/** দেশের তালিকা (ডেমোর তালিকার হুবহু অনুরূপ + "Other"). "Global" শুধু ফিল্টারে ব্যবহৃত হয়। */
export const COUNTRIES = [
  'Bangladesh',
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Japan',
  'Brazil',
  'Germany',
  'Turkey',
  'Indonesia',
  'Other',
] as const;

export type Country = (typeof COUNTRIES)[number];

export const GLOBAL_COUNTRY = 'Global' as const;
export const FILTER_COUNTRIES = [GLOBAL_COUNTRY, ...COUNTRIES] as const;
export type CountryFilter = (typeof FILTER_COUNTRIES)[number];

export const GENDERS = ['boy', 'girl'] as const;
export type Gender = (typeof GENDERS)[number];
export type GenderPreference = Gender | 'any';

export const REPORT_REASONS = [
  'nudity',
  'harassment',
  'spam',
  'underage',
  'violence',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  nudity: 'Nudity or sexual content',
  harassment: 'Harassment or hate',
  spam: 'Spam or scam',
  underage: 'Looks under 18',
  violence: 'Violence or self-harm',
  other: 'Something else',
};

export const LIMITS = {
  maxMessageLength: 180,
  maxReportDetails: 500,
  maxReportEvidenceLines: 10,
  maxSdpLength: 24_000,
  maxCandidateLength: 2_000,
  /** রিপোর্ট করা যাবে ম্যাচ শেষ হওয়ার কত মিলিসেকেন্ড পর পর্যন্ত */
  reportWindowMs: 5 * 60_000,
} as const;

export const MIN_AGE = 18;
