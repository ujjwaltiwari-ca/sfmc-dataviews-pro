import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from '../utils/seoStatic.js';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIR, '../..');
const SITEMAP_PATH = path.join(PROJECT_ROOT, 'public', 'sitemap.xml');

export type SitemapEntry = {
  loc: string;
  priority: string;
};

export function writeSitemap(entries: SitemapEntry[]): void {
  const today = new Date().toISOString().slice(0, 10);
  const body = entries
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

export function buildDefaultSitemapEntries(options: {
  viewUrls: string[];
  guideUrls?: string[];
}): SitemapEntry[] {
  return [
    { loc: `${SITE_ORIGIN}/`, priority: '1.0' },
    { loc: `${SITE_ORIGIN}/views/`, priority: '0.9' },
    { loc: `${SITE_ORIGIN}/guides/`, priority: '0.85' },
    ...(options.guideUrls ?? [])
      .filter((url) => url !== `${SITE_ORIGIN}/guides/`)
      .map((loc) => ({ loc, priority: '0.75' })),
    { loc: `${SITE_ORIGIN}/privacy/`, priority: '0.3' },
    { loc: `${SITE_ORIGIN}/terms/`, priority: '0.3' },
    ...options.viewUrls.map((loc) => ({ loc, priority: '0.8' })),
  ];
}
