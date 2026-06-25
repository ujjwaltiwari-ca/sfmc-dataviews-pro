import { loadEnvLocal } from './loadEnvLocal.mjs';

loadEnvLocal();

const supabaseHost = (() => {
  const raw = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
})();

const stagingVars = ['STAGING_PASSWORD', 'STAGING_COOKIE_SECRET'].filter((key) =>
  Boolean(process.env[key]?.trim()),
);

console.log('=== Deploy preflight ===');
console.log(`Supabase host: ${supabaseHost ?? '(not configured locally)'}`);
console.log(
  stagingVars.length === 0
    ? 'Staging gate: disabled (public launch — no STAGING_* env vars locally)'
    : `Staging gate: ENABLED locally via ${stagingVars.join(', ')}`,
);

if (!supabaseHost) {
  console.warn('[warn] VITE_SUPABASE_URL is not set locally.');
}

if (stagingVars.length > 0) {
  console.warn('[warn] For public launch, remove STAGING_PASSWORD and STAGING_COOKIE_SECRET from Vercel.');
} else {
  console.log('[ok] No local staging gate variables detected.');
}
