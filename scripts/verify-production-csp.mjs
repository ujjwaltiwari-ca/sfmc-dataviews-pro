const SITE_URL = process.env.VERIFY_SITE_URL?.trim() || 'https://dataviews.pro/';

async function main() {
  const response = await fetch(SITE_URL, { redirect: 'follow' });
  const csp = response.headers.get('content-security-policy');
  const hsts = response.headers.get('strict-transport-security');

  console.log(`=== CSP verification for ${SITE_URL} ===`);
  console.log(`HTTP ${response.status}`);

  if (!csp) {
    console.error('[fail] Content-Security-Policy header is missing.');
    console.error('       Deploy the latest vercel.json headers with: vercel deploy --prod');
    process.exit(1);
  }

  console.log('[ok] Content-Security-Policy present');

  const requiredFragments = [
    "default-src 'self'",
    'googletagmanager.com',
    "font-src 'self'",
    'supabase.co',
    'google-analytics.com',
    'vitals.vercel-insights.com',
  ];

  const missing = requiredFragments.filter((fragment) => !csp.includes(fragment));
  if (missing.length > 0) {
    console.error('[fail] CSP is missing expected sources:', missing.join(', '));
    process.exit(1);
  }

  console.log('[ok] CSP includes Supabase, GA, Vercel Analytics, and self-hosted fonts');

  if (!hsts) {
    console.warn('[warn] Strict-Transport-Security header is missing (may appear after deploy).');
  } else {
    console.log('[ok] Strict-Transport-Security present');
  }
}

main().catch((error) => {
  console.error('[fail] Could not verify production headers:', error instanceof Error ? error.message : error);
  process.exit(1);
});
