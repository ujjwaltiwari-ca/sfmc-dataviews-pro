import { BRAND_LAUNCH_CTA, BRAND_NAME } from '../constants/brand.js';
import { SCHEMA_DISCLAIMER, SCHEMA_LAST_REVIEWED } from '../constants/schemaMeta.js';
import { escapeHtml, SITE_ORIGIN } from '../utils/seoStatic.js';

export const STATIC_PAGE_STYLES = `
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
    th { background: #0f172a; color: #cbd5e1; }
    td { border-color: #1e293b; }
    a { color: #22d3ee; }
    .btn-primary { background: #0891b2; color: #fff; }
    .btn-secondary { background: #1e293b; color: #e2e8f0; border-color: #334155; }
    .disclaimer { background: #0f172a; border-color: #334155; }
  }
  .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }
  h1 { font-size: 1.75rem; margin: 0 0 0.35rem; letter-spacing: -0.02em; }
  h2 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; }
  h2:first-child { margin-top: 0; }
  .muted { color: #64748b; font-size: 0.95rem; }
  .badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #ecfeff;
    color: #0e7490;
    margin-right: 0.35rem;
  }
  code, pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
  }
  pre {
    margin: 0.75rem 0 0;
    padding: 0.85rem 1rem;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 8px;
    overflow-x: auto;
  }
  a { color: #0891b2; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem; }
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.65rem 1.15rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }
  a.btn:hover { text-decoration: none; }
  a.btn-primary, a.btn-primary:visited { background: #0891b2; color: #fff !important; }
  a.btn-secondary, a.btn-secondary:visited { background: #fff; color: #0f172a !important; border: 1px solid #cbd5e1; }
  @media (prefers-color-scheme: dark) {
    a.btn-secondary, a.btn-secondary:visited { background: #1e293b; color: #e2e8f0 !important; border-color: #334155; }
  }
  nav.top { font-size: 0.875rem; margin-bottom: 1.25rem; }
  ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
  li { margin-bottom: 0.35rem; }
  ul.guide-list { list-style: none; padding: 0; margin: 0; }
  ul.guide-list li { margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
  @media (prefers-color-scheme: dark) {
    ul.guide-list li { border-bottom-color: #1e293b; }
  }
  .disclaimer {
    margin-top: 1.5rem;
    padding: 0.85rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .meta { font-size: 0.85rem; margin-top: 0.35rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th, td { text-align: left; padding: 0.55rem 0.65rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; }
  @media (prefers-color-scheme: dark) {
    th { background: #0f172a; color: #cbd5e1; }
    td { border-color: #1e293b; }
  }
  .cta-hint { margin: 0.35rem 0 0; font-size: 0.8rem; }
  ul.index-list { columns: 2; gap: 2rem; padding-left: 1.1rem; margin: 0; }
  @media (max-width: 640px) { ul.index-list { columns: 1; } }
  ul.index-list li { margin-bottom: 0.35rem; break-inside: avoid; }
`.trim();

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function renderSchemaDisclaimer(): string {
  return `<footer class="disclaimer muted" role="contentinfo">
    <p><strong>Schema accuracy:</strong> Reference last reviewed ${escapeHtml(SCHEMA_LAST_REVIEWED)}. ${escapeHtml(SCHEMA_DISCLAIMER)}</p>
  </footer>`;
}

export function renderStaticPageLayout(options: {
  title: string;
  description: string;
  canonical: string;
  breadcrumbHtml: string;
  body: string;
  jsonLd?: Record<string, unknown>;
  includeSchemaDisclaimer?: boolean;
}): string {
  const jsonLdBlock = options.jsonLd
    ? `<script type="application/ld+json">${serializeJsonLd(options.jsonLd)}</script>`
    : '';
  const disclaimer =
    options.includeSchemaDisclaimer !== false ? renderSchemaDisclaimer() : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.title)}</title>
  <meta name="description" content="${escapeHtml(options.description)}" />
  <link rel="canonical" href="${escapeHtml(options.canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(options.canonical)}" />
  <meta property="og:title" content="${escapeHtml(options.title)}" />
  <meta property="og:description" content="${escapeHtml(options.description)}" />
  <meta property="og:image" content="${SITE_ORIGIN}/og-preview.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>${STATIC_PAGE_STYLES}</style>
  ${jsonLdBlock}
</head>
<body>
  <div class="wrap">
    <nav class="top" aria-label="Breadcrumb">${options.breadcrumbHtml}</nav>
    ${options.body}
    ${disclaimer}
  </div>
</body>
</html>`;
}

export function viewsBreadcrumb(suffix = ''): string {
  const base = `<a href="/">${escapeHtml(BRAND_NAME)}</a> → <a href="/views/">Data View Reference</a>`;
  return suffix ? `${base} → ${suffix}` : base;
}

export function guidesBreadcrumb(suffix = ''): string {
  const base = `<a href="/">${escapeHtml(BRAND_NAME)}</a> → <a href="/guides/">SQL Guides</a>`;
  return suffix ? `${base} → ${suffix}` : base;
}

export function primaryCta(href: string, label = BRAND_LAUNCH_CTA): string {
  return `<a class="btn btn-primary" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}
