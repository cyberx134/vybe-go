import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCountry,
  isCountryFilter,
  isGender,
  isGenderPreference,
  type COUNTRIES,
  type FILTER_COUNTRIES,
  type Gender,
  type GenderPreference,
} from '@vybe/shared';

const KEYS = {
  profile: 'vybe.profile.v1',
  filters: 'vybe.filters.v1',
} as const;

export interface Profile {
  gender: Gender;
  country: (typeof COUNTRIES)[number];
  acceptedAt: number;
}

export interface SavedFilters {
  wantGender: GenderPreference;
  wantCountry: (typeof FILTER_COUNTRIES)[number];
}

export const DEFAULT_FILTERS: SavedFilters = { wantGender: 'any', wantCountry: 'Global' };

async function read(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* স্টোরেজ ব্যর্থ হলে সেশনে কাজ চলবে */
  }
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await read(KEYS.profile);
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

export const saveProfile = (profile: Profile): Promise<void> => write(KEYS.profile, JSON.stringify(profile));

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.profile);
  } catch {
    /* ignore */
  }
}

export async function loadFilters(): Promise<SavedFilters> {
  const raw = await read(KEYS.filters);
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

export const saveFilters = (filters: SavedFilters): Promise<void> => write(KEYS.filters, JSON.stringify(filters));
