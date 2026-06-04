import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataViewField, DataViewTable } from '../data/schemas/types.js';
import {
  buildArchitectDeepLink,
  buildExampleSelectSql,
  buildMetaDescription,
  buildPageTitle,
  escapeHtml,
  formatFieldType,
  getSeoSchemaTables,
  SITE_ORIGIN,
  tableNameToSlug,
  viewPagePath,
  viewPageUrl,
} from '../utils/seoStatic.js';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIR, '../..');
const PUBLIC_VIEWS_DIR = path.join(PROJECT_ROOT, 'public', 'views');
const SITEMAP_PATH = path.join(PROJECT_ROOT, 'public', 'sitemap.xml');

const PAGE_STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    line-height: 1.5;
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
  h2 { font-size: 1.1rem; margin: 0 0 0.75rem; }
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
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th, td { text-align: left; padding: 0.55rem 0.65rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; }
  code, pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
  }
  pre {
    margin: 0;
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
  .cta-hint { margin: 0.35rem 0 0; font-size: 0.8rem; }
  nav.top { font-size: 0.875rem; margin-bottom: 1.25rem; }
  ul.index-list { columns: 2; gap: 2rem; padding-left: 1.1rem; margin: 0; }
  @media (max-width: 640px) { ul.index-list { columns: 1; } }
  ul.index-list li { margin-bottom: 0.35rem; break-inside: avoid; }
`.trim();

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function renderLayout(options: {
  title: string;
  description: string;
  canonical: string;
  body: string;
  jsonLd?: Record<string, unknown>;
}): string {
  const jsonLdBlock = options.jsonLd
    ? `<script type="application/ld+json">${serializeJsonLd(options.jsonLd)}</script>`
    : '';

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
  <style>${PAGE_STYLES}</style>
  ${jsonLdBlock}
</head>
<body>
  <div class="wrap">
    <nav class="top" aria-label="Breadcrumb">
      <a href="/">DataViews.pro</a> → <a href="/views/">Data View Reference</a>
    </nav>
    ${options.body}
  </div>
</body>
</html>`;
}

function renderFieldFlags(field: DataViewField): string {
  const flags: string[] = [];
  if (field.isPrimaryKey) flags.push('PK');
  if (field.relatesTo?.length) flags.push('FK');
  if (field.isIndexed) flags.push('IDX');
  if (field.isNullable) flags.push('NULL');
  return flags.length > 0 ? flags.join(', ') : '—';
}

function renderRelations(field: DataViewField, tablesByName: Map<string, DataViewTable>): string {
  if (!field.relatesTo?.length) {
    return '—';
  }
  return field.relatesTo
    .map((relation) => {
      const related = tablesByName.get(relation.table);
      const label = `${relation.table}.${relation.field}`;
      if (!related) {
        return escapeHtml(label);
      }
      const href = viewPagePath(tableNameToSlug(relation.table));
      return `<a href="${href}">${escapeHtml(label)}</a>`;
    })
    .join('<br />');
}

function renderViewPage(table: DataViewTable, tablesByName: Map<string, DataViewTable>): string {
  const slug = tableNameToSlug(table.name);
  const canonical = viewPageUrl(slug);
  const deepLink = buildArchitectDeepLink(table.name);
  const exampleSql = buildExampleSelectSql(table);

  const rows = table.fields
    .map(
      (field) => `<tr>
  <td><code>${escapeHtml(field.name)}</code></td>
  <td>${escapeHtml(formatFieldType(field))}</td>
  <td>${escapeHtml(renderFieldFlags(field))}</td>
  <td>${renderRelations(field, tablesByName)}</td>
  <td>${escapeHtml(field.description)}</td>
</tr>`,
    )
    .join('\n');

  const body = `
    <article class="card">
      <span class="badge">${escapeHtml(table.category)}</span>
      <h1>${escapeHtml(table.name)}</h1>
      <p class="muted">${escapeHtml(table.description)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${escapeHtml(deepLink)}">Launch Schema Architect</a>
        <a class="btn btn-secondary" href="/views/">All data views</a>
      </div>
      <p class="cta-hint muted">Opens <code>${escapeHtml(table.name)}</code> in the interactive canvas with SQL Sandbox.</p>
    </article>
    <section class="card" aria-labelledby="fields-heading">
      <h2 id="fields-heading">Fields (${table.fields.length})</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Type</th>
            <th scope="col">Flags</th>
            <th scope="col">Relations</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <section class="card" aria-labelledby="sql-heading">
      <h2 id="sql-heading">Example query</h2>
      <pre><code>${escapeHtml(exampleSql)}</code></pre>
      <p class="muted">Valid in Query Studio and Automation Studio Query Activities. GROUP BY is only needed for aggregates; ORDER BY is optional but recommended with TOP so rows are meaningful. Narrow date ranges on large tracking views to avoid timeouts.</p>
    </section>
  `;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: buildPageTitle(table),
    url: canonical,
    description: buildMetaDescription(table),
    isPartOf: {
      '@type': 'WebSite',
      name: 'DataViews.pro',
      url: SITE_ORIGIN,
    },
    about: {
      '@type': 'Dataset',
      name: table.name,
      description: table.description,
      keywords: `SFMC, Salesforce Marketing Cloud, ${table.name}, data view`,
    },
  };

  return renderLayout({
    title: buildPageTitle(table),
    description: buildMetaDescription(table),
    canonical,
    body,
    jsonLd,
  });
}

function renderIndexPage(tables: DataViewTable[]): string {
  const grouped = new Map<string, DataViewTable[]>();
  for (const table of tables) {
    const list = grouped.get(table.category) ?? [];
    list.push(table);
    grouped.set(table.category, list);
  }

  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, categoryTables]) => {
      const items = categoryTables
        .map((table) => {
          const slug = tableNameToSlug(table.name);
          return `<li><a href="${viewPagePath(slug)}"><code>${escapeHtml(table.name)}</code></a> — ${escapeHtml(table.description.slice(0, 80))}${table.description.length > 80 ? '…' : ''}</li>`;
        })
        .join('\n');
      return `<section class="card"><h2>${escapeHtml(category)}</h2><ul class="index-list">${items}</ul></section>`;
    })
    .join('\n');

  const body = `
    <header class="card">
      <h1>SFMC Data Views Reference</h1>
      <p class="muted">
        Field-level reference for ${tables.length} Salesforce Marketing Cloud system data views,
        SendLog templates, and synchronized CRM extensions — types, keys, joins, and example SQL.
        Open any table in Schema Architect to build queries with auto-joins and the SQL Sandbox.
      </p>
      <div class="actions">
        <a class="btn btn-primary" href="/">Launch Schema Architect</a>
      </div>
    </header>
    ${sections}
  `;

  return renderLayout({
    title: 'SFMC Data Views Reference Index | DataViews.pro',
    description:
      'Browse every Salesforce Marketing Cloud system data view with field definitions, primary keys, foreign keys, and SQL examples. Open any table in the interactive Schema Architect.',
    canonical: `${SITE_ORIGIN}/views/`,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'SFMC Data Views Reference',
      url: `${SITE_ORIGIN}/views/`,
      description:
        'Index of Salesforce Marketing Cloud data view schema reference pages on DataViews.pro.',
      isPartOf: { '@type': 'WebSite', name: 'DataViews.pro', url: SITE_ORIGIN },
    },
  });
}

function writeSitemap(tables: DataViewTable[]): void {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_ORIGIN}/`, priority: '1.0' },
    { loc: `${SITE_ORIGIN}/views/`, priority: '0.9' },
    ...tables.map((table) => ({
      loc: viewPageUrl(tableNameToSlug(table.name)),
      priority: '0.8',
    })),
  ];

  const body = urls
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
}

function emptyDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      emptyDirectory(fullPath);
      fs.rmdirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

export function generateSeoStaticAssets(): { tableCount: number; pageCount: number } {
  const tables = getSeoSchemaTables();
  const tablesByName = new Map(tables.map((table) => [table.name, table]));

  emptyDirectory(PUBLIC_VIEWS_DIR);
  fs.mkdirSync(PUBLIC_VIEWS_DIR, { recursive: true });

  for (const table of tables) {
    const slug = tableNameToSlug(table.name);
    const pageDir = path.join(PUBLIC_VIEWS_DIR, slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderViewPage(table, tablesByName), 'utf8');
  }

  fs.writeFileSync(path.join(PUBLIC_VIEWS_DIR, 'index.html'), renderIndexPage(tables), 'utf8');
  writeSitemap(tables);

  return { tableCount: tables.length, pageCount: tables.length + 1 };
}
