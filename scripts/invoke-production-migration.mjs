import { loadEnvLocal } from './loadEnvLocal.mjs';

loadEnvLocal();

const siteUrl = process.env.VERIFY_SITE_URL?.trim() || 'https://dataviews.pro';
const migrationSecret = process.env.MIGRATION_SECRET?.trim();

if (!migrationSecret) {
  console.error('[migrate] MIGRATION_SECRET is required in .env.local');
  process.exit(1);
}

const response = await fetch(`${siteUrl}/api/apply-migration`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${migrationSecret}`,
    'Content-Type': 'application/json',
  },
});

const payload = await response.json().catch(() => ({}));
console.log(`[migrate] POST ${siteUrl}/api/apply-migration → HTTP ${response.status}`);
console.log(JSON.stringify(payload, null, 2));

if (!response.ok) {
  process.exit(1);
}
