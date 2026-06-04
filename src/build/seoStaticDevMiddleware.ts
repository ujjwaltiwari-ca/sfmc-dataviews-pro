import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vite dev does not map `/views/sent/` → `public/views/sent/index.html` (SPA wins).
 * This middleware serves generated SEO HTML before the React fallback.
 */
export function resolveSeoStaticHtmlPath(
  pathname: string,
  publicViewsDir: string,
): string | null {
  if (!pathname.startsWith('/views')) {
    return null;
  }

  const base = path.resolve(publicViewsDir);
  let relative = pathname.slice('/views'.length) || '/';

  if (relative.endsWith('/')) {
    relative = `${relative}index.html`;
  } else if (!relative.endsWith('.html')) {
    relative = `${relative}/index.html`;
  }

  const resolved = path.resolve(path.join(base, relative));
  const baseWithSep = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  if (resolved !== base && !resolved.startsWith(baseWithSep)) {
    return null;
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return resolved;
  }

  return null;
}

export function createSeoStaticDevMiddleware(publicViewsDir: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const filePath = resolveSeoStaticHtmlPath(pathname, publicViewsDir);

    if (!filePath || req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        next();
      }
    });
    stream.pipe(res);
  };
}
