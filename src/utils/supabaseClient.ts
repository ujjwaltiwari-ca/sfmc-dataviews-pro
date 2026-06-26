import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export { isSupabaseConfigured } from './supabaseEnv';

function createBrowserClient(): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use AI Copilot.',
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/** Lazy singleton — schema browser works without Supabase env vars. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient();
  }
  return client;
}
