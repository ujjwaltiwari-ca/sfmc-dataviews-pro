import { loadEnvLocal } from './loadEnvLocal.mjs';

loadEnvLocal();

const siteUrl = process.env.VERIFY_SITE_URL?.trim() || 'https://dataviews.pro';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!serviceRoleKey) {
  console.error('[migrate] SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  process.exit(1);
}

const response = await fetch(`${siteUrl}/api/apply-migration`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
});

const payload = await response.json().catch(() => ({}));
console.log(`[migrate] POST ${siteUrl}/api/apply-migration → HTTP ${response.status}`);
console.log(JSON.stringify(payload, null, 2));

if (!response.ok) {
  process.exit(1);
}
