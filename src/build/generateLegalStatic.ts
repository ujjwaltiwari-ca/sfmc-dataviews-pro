import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_NAME } from '../constants/brand.js';
import { LEGAL_PAGES, type LegalPageContent } from '../content/legalPages.js';
import { escapeHtml, SITE_ORIGIN } from '../utils/seoStatic.js';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIR, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const PAGE_STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    color: #0f172a;
    background: #f8fafc;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e2e8f0; background: #0b1220; }
    .card { background: #111827; border-color: #1e293b; }
    .muted { color: #94a3b8; }
    a { color: #22d3ee; }
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem 1.75rem;
    margin-bottom: 1.25rem;
  }
  h1 { font-size: 1.75rem; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 0.5rem; }
  h2:first-child { margin-top: 0; }
  .muted { color: #64748b; font-size: 0.9rem; }
  nav.top { font-size: 0.875rem; margin-bottom: 1.25rem; }
  a { color: #0891b2; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
  li { margin-bottom: 0.35rem; }
  footer.legal-footer { margin-top: 2rem; font-size: 0.85rem; }
`.trim();

function renderLegalPage(page: LegalPageContent): string {
  const canonical = `${SITE_ORIGIN}/${page.slug}/`;
  const sections = page.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((text) => `<p>${escapeHtml(text)}</p>`)
        .join('\n');
      const bullets = section.bullets
        ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
      return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)} | ${escapeHtml(BRAND_NAME)}</title>
  <meta name="description" content="${escapeHtml(page.metaDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(page.title)} | ${escapeHtml(BRAND_NAME)}" />
  <meta property="og:description" content="${escapeHtml(page.metaDescription)}" />
  <meta property="og:image" content="${SITE_ORIGIN}/og-preview.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>${PAGE_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <nav class="top" aria-label="Breadcrumb">
      <a href="/">${escapeHtml(BRAND_NAME)}</a> → ${escapeHtml(page.title)}
    </nav>
    <article class="card">
      <h1>${escapeHtml(page.title)}</h1>
      <p class="muted">Last updated: ${escapeHtml(page.lastUpdated)}</p>
      ${sections}
    </article>
    <footer class="legal-footer muted">
      <a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms of Use</a> · <a href="/">${escapeHtml(BRAND_NAME)}</a>
    </footer>
  </div>
</body>
</html>`;
}

export function generateLegalStaticAssets(): number {
  let count = 0;
  for (const page of LEGAL_PAGES) {
    const pageDir = path.join(PUBLIC_DIR, page.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderLegalPage(page), 'utf8');
    count += 1;
  }
  return count;
}
