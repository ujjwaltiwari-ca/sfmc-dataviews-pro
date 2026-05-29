import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function resolveSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
}

function resolveSupabaseAnonKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
}

function resolveSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

let serverClient: SupabaseClient | null = null;

export function resetSupabaseServerClient(): void {
  serverClient = null;
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (serverClient) {
    return serverClient;
  }

  const url = resolveSupabaseUrl();
  const serviceRoleKey = resolveSupabaseServiceRoleKey();
  const anonKey = resolveSupabaseAnonKey();
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    return null;
  }

  serverClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}
