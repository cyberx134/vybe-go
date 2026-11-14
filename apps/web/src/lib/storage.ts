import { COUNTRIES, FILTER_COUNTRIES, isCountry, isCountryFilter, isGender, isGenderPreference, type Gender, type GenderPreference } from '@vybe/shared';

const KEYS = {
  profile: 'vybe.profile.v1',
  filters: 'vybe.filters.v1',
} as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / storage full — সেশনে কাজ চলবে */
  }
}

export interface Profile {
  gender: Gender;
  country: (typeof COUNTRIES)[number];
  acceptedAt: number;
}

export function loadProfile(): Profile | null {
  const raw = read(KEYS.profile);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    if (isGender(p.gender) && isCountry(p.country) && typeof p.acceptedAt === 'number') {
      return { gender: p.gender, country: p.country, acceptedAt: p.acceptedAt };
    }
  } catch {
    /* অবৈধ JSON */
  }
  return null;
}

export function saveProfile(profile: Profile): void {
  write(KEYS.profile, JSON.stringify(profile));
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(KEYS.profile);
  } catch {
    /* ignore */
  }
}

export interface SavedFilters {
  wantGender: GenderPreference;
  wantCountry: (typeof FILTER_COUNTRIES)[number];
}

export const DEFAULT_FILTERS: SavedFilters = { wantGender: 'any', wantCountry: 'Global' };

export function loadFilters(): SavedFilters {
  const raw = read(KEYS.filters);
  if (!raw) return DEFAULT_FILTERS;
  try {
    const f = JSON.parse(raw) as Partial<SavedFilters>;
    if (isGenderPreference(f.wantGender) && isCountryFilter(f.wantCountry)) {
      return { wantGender: f.wantGender, wantCountry: f.wantCountry };
    }
  } catch {
    /* অবৈধ JSON */
  }
  return DEFAULT_FILTERS;
}

export function saveFilters(filters: SavedFilters): void {
  write(KEYS.filters, JSON.stringify(filters));
}
