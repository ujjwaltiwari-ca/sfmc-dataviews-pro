import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveStaticHtmlPath } from './seoStaticDevMiddleware';

describe('resolveStaticHtmlPath', () => {
  const publicDir = path.join(process.cwd(), 'public');

  it('resolves trailing-slash view URLs to index.html', () => {
    const resolved = resolveStaticHtmlPath('/views/sent/', publicDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/views\/sent\/index\.html$/);
  });

  it('resolves the views index', () => {
    const resolved = resolveStaticHtmlPath('/views/', publicDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/views\/index\.html$/);
  });

  it('resolves the guides index', () => {
    const resolved = resolveStaticHtmlPath('/guides/', publicDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/guides\/index\.html$/);
  });

  it('resolves a guide article path', () => {
    const resolved = resolveStaticHtmlPath('/guides/join-sent-to-open/', publicDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/guides\/join-sent-to-open\/index\.html$/);
  });

  it('blocks path traversal outside public/views', () => {
    expect(resolveStaticHtmlPath('/views/../../../package.json', publicDir)).toBeNull();
    expect(resolveStaticHtmlPath('/views/sent/../../index.html', publicDir)).toBeNull();
  });
});
