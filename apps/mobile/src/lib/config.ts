const clean = (v: string | undefined): string => (v ?? '').trim();

export const SUPABASE_URL = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const isConfigured: boolean = /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
