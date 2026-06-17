import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  guidesBreadcrumb,
  primaryCta,
  renderStaticPageLayout,
} from './staticPageLayout.js';
import { BRAND_NAME } from '../constants/brand.js';
import { SEO_GUIDES, type GuideSection, type SeoGuide } from '../content/seoGuides.js';
import { escapeHtml, SITE_ORIGIN, viewPagePath } from '../utils/seoStatic.js';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIR, '../..');
const PUBLIC_GUIDES_DIR = path.join(PROJECT_ROOT, 'public', 'guides');

function renderSection(section: GuideSection): string {
  const paragraphs = (section.paragraphs ?? [])
    .map((text) => `<p>${escapeHtml(text)}</p>`)
    .join('\n');
  const bullets = section.bullets
    ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  const sql = section.sql
    ? `<pre><code>${escapeHtml(section.sql)}</code></pre>`
    : '';

  return `<section>
  <h2>${escapeHtml(section.heading)}</h2>
  ${paragraphs}
  ${bullets}
  ${sql}
</section>`;
}

function renderGuidePage(guide: SeoGuide): string {
  const canonical = `${SITE_ORIGIN}/guides/${guide.slug}/`;
  const sections = guide.sections.map(renderSection).join('\n');
  const relatedLinks = (guide.relatedViews ?? [])
    .map(
      (view) =>
        `<a href="${viewPagePath(view.slug)}"><code>${escapeHtml(view.name)}</code></a>`,
    )
    .join(' · ');

  const body = `
    <article class="card">
      <span class="badge">${escapeHtml(guide.category)}</span>
      <h1>${escapeHtml(guide.title)}</h1>
      <p class="meta muted">${guide.readMinutes} min read · SFMC SQL practitioner guide</p>
      ${sections}
      <div class="actions">
        ${guide.workspaceDeepLink ? primaryCta(guide.workspaceDeepLink, 'Try in workspace') : primaryCta('/')}
        <a class="btn btn-secondary" href="/guides/">All guides</a>
      </div>
      ${relatedLinks ? `<p class="muted" style="margin-top:1rem">Related reference: ${relatedLinks}</p>` : ''}
    </article>
  `;

  return renderStaticPageLayout({
    title: `${guide.title} | ${BRAND_NAME}`,
    description: guide.metaDescription,
    canonical,
    breadcrumbHtml: guidesBreadcrumb(escapeHtml(guide.title)),
    body,
    includeSchemaDisclaimer: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.metaDescription,
      url: canonical,
      author: { '@type': 'Person', name: 'Ujjwal Tiwari' },
      publisher: { '@type': 'Organization', name: BRAND_NAME },
      isPartOf: { '@type': 'WebSite', name: BRAND_NAME, url: SITE_ORIGIN },
    },
  });
}

function renderGuidesIndex(): string {
  const items = SEO_GUIDES.map(
    (guide) => `<li>
      <a href="/guides/${guide.slug}/"><strong>${escapeHtml(guide.title)}</strong></a>
      <span class="muted"> — ${escapeHtml(guide.metaDescription.slice(0, 120))}${guide.metaDescription.length > 120 ? '…' : ''}</span>
    </li>`,
  ).join('\n');

  const body = `
    <header class="card">
      <h1>SFMC SQL Practitioner Guides</h1>
      <p class="muted">
        Join patterns, Journey Builder queries, timeout avoidance, and subscriber scoping —
        short guides with copy-ready SQL for Query Studio and Automation Studio.
      </p>
      <div class="actions">${primaryCta('/')}</div>
    </header>
    <section class="card">
      <ul class="guide-list">${items}</ul>
    </section>
  `;

  return renderStaticPageLayout({
    title: `SFMC SQL Guides | ${BRAND_NAME}`,
    description:
      'Practitioner SQL guides for Salesforce Marketing Cloud Data Views — joins, journeys, tracking timeouts, and subscriber patterns.',
    canonical: `${SITE_ORIGIN}/guides/`,
    breadcrumbHtml: guidesBreadcrumb(),
    body,
    includeSchemaDisclaimer: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'SFMC SQL Guides',
      url: `${SITE_ORIGIN}/guides/`,
      isPartOf: { '@type': 'WebSite', name: BRAND_NAME, url: SITE_ORIGIN },
    },
  });
}

export function generateGuideStaticAssets(): { guideCount: number; guideUrls: string[] } {
  fs.mkdirSync(PUBLIC_GUIDES_DIR, { recursive: true });

  for (const guide of SEO_GUIDES) {
    const pageDir = path.join(PUBLIC_GUIDES_DIR, guide.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderGuidePage(guide), 'utf8');
  }

  fs.writeFileSync(path.join(PUBLIC_GUIDES_DIR, 'index.html'), renderGuidesIndex(), 'utf8');

  const guideUrls = [
    `${SITE_ORIGIN}/guides/`,
    ...SEO_GUIDES.map((guide) => `${SITE_ORIGIN}/guides/${guide.slug}/`),
  ];

  return { guideCount: SEO_GUIDES.length, guideUrls };
}
