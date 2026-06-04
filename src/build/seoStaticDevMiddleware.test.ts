import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveSeoStaticHtmlPath } from './seoStaticDevMiddleware';

describe('resolveSeoStaticHtmlPath', () => {
  const viewsDir = path.join(process.cwd(), 'public', 'views');

  it('resolves trailing-slash view URLs to index.html', () => {
    const resolved = resolveSeoStaticHtmlPath('/views/sent/', viewsDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/views\/sent\/index\.html$/);
  });

  it('resolves the views index', () => {
    const resolved = resolveSeoStaticHtmlPath('/views/', viewsDir);
    expect(resolved?.replace(/\\/g, '/')).toMatch(/public\/views\/index\.html$/);
  });

  it('blocks path traversal outside public/views', () => {
    expect(resolveSeoStaticHtmlPath('/views/../../../package.json', viewsDir)).toBeNull();
    expect(resolveSeoStaticHtmlPath('/views/sent/../../index.html', viewsDir)).toBeNull();
  });
});
