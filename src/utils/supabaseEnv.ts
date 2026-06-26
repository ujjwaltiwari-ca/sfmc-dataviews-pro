/** Env check only — no @supabase/supabase-js import (safe for the main bundle). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() && import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  );
}
