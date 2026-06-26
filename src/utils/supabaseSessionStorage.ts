/** Detect a persisted Supabase session without loading the Supabase client. */
export function hasPersistedSupabaseSession(): boolean {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
        return true;
      }
    }
  } catch {
    /* ignore storage errors */
  }
  return false;
}
