const clean = (v: string | undefined): string => (v ?? '').trim();

export const SUPABASE_URL = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined);
export const SUPABASE_ANON_KEY = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

/** Supabase এর URL ও anon key সেট করা আছে কিনা */
export const isConfigured: boolean = /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
