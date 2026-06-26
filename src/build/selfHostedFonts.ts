import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BUILD_DIR, '../..');
const FONT_PACKAGE_DIR = path.join(PROJECT_ROOT, 'node_modules', '@fontsource', 'plus-jakarta-sans');
const PUBLIC_FONTS_DIR = path.join(PROJECT_ROOT, 'public', 'fonts');

const FONT_WEIGHTS = [400, 500, 600, 700] as const;

export const SELF_HOSTED_FONT_FACE_CSS = FONT_WEIGHTS.map(
  (weight) => `@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url('/fonts/plus-jakarta-sans-latin-${weight}-normal.woff2') format('woff2');
}`,
).join('\n');

function buildFontStylesheet(): string {
  return `${SELF_HOSTED_FONT_FACE_CSS}
`;
}

export function copySelfHostedFontsToPublic(): void {
  const sourceFilesDir = path.join(FONT_PACKAGE_DIR, 'files');
  if (!fs.existsSync(sourceFilesDir)) {
    throw new Error(
      'Missing @fontsource/plus-jakarta-sans package files. Run npm install before building.',
    );
  }

  fs.mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });

  for (const weight of FONT_WEIGHTS) {
    const fileName = `plus-jakarta-sans-latin-${weight}-normal.woff2`;
    fs.copyFileSync(path.join(sourceFilesDir, fileName), path.join(PUBLIC_FONTS_DIR, fileName));
  }

  fs.writeFileSync(path.join(PUBLIC_FONTS_DIR, 'plus-jakarta-sans.css'), buildFontStylesheet(), 'utf8');
}
