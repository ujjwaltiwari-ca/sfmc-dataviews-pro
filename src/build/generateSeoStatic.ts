import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateGuideStaticAssets } from './generateGuideStatic.js';
import {
  primaryCta,
  renderStaticPageLayout,
  viewsBreadcrumb,
} from './staticPageLayout.js';
import { buildDefaultSitemapEntries, writeSitemap } from './writeSitemap.js';
import { BRAND_NAME } from '../constants/brand.js';
import { SCHEMA_LAST_REVIEWED } from '../constants/schemaMeta.js';
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
      <p class="muted" style="font-size:0.82rem">Schema last reviewed ${SCHEMA_LAST_REVIEWED}</p>
      <div class="actions">
        ${primaryCta(deepLink)}
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

  return renderStaticPageLayout({
    title: buildPageTitle(table),
    description: buildMetaDescription(table),
    canonical,
    breadcrumbHtml: viewsBreadcrumb(`<code>${escapeHtml(table.name)}</code>`),
    body,
    includeSchemaDisclaimer: true,
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
        Open any table in ${escapeHtml(BRAND_NAME)} to build queries with auto-joins and the SQL Sandbox.
      </p>
      <div class="actions">
        ${primaryCta('/')}
        <a class="btn btn-secondary" href="/guides/">SQL Guides</a>
      </div>
      <p class="muted" style="font-size:0.82rem;margin-top:0.75rem">Schema reference last reviewed ${SCHEMA_LAST_REVIEWED}</p>
    </header>
    ${sections}
  `;

  return renderStaticPageLayout({
    title: 'SFMC Data Views Reference Index | DataViews.pro',
    description:
      `Browse every Salesforce Marketing Cloud system data view with field definitions, primary keys, foreign keys, and SQL examples. Open any table in the interactive ${BRAND_NAME} workspace.`,
    canonical: `${SITE_ORIGIN}/views/`,
    breadcrumbHtml: viewsBreadcrumb(),
    body,
    includeSchemaDisclaimer: true,
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

function writeViewsSitemap(tables: DataViewTable[], guideUrls: string[]): void {
  const viewUrls = tables.map((table) => viewPageUrl(tableNameToSlug(table.name)));
  writeSitemap(buildDefaultSitemapEntries({ viewUrls, guideUrls }));
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

  const { guideUrls } = generateGuideStaticAssets();
  writeViewsSitemap(tables, guideUrls);

  return { tableCount: tables.length, pageCount: tables.length + 1 };
}
