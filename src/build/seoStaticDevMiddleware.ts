import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ROOT_STATIC_SLUGS = new Set(['privacy', 'terms']);

/**
 * Vite dev does not map `/views/sent/` → `public/views/sent/index.html` (SPA wins).
 * This middleware serves generated SEO, guide, and legal HTML before the React fallback.
 */
export function resolveStaticHtmlPath(
  pathname: string,
  publicDir: string,
): string | null {
  if (pathname.startsWith('/views')) {
    const publicViewsDir = path.join(publicDir, 'views');
    return resolveNestedIndexHtml(pathname, publicViewsDir, '/views');
  }

  if (pathname.startsWith('/guides')) {
    const publicGuidesDir = path.join(publicDir, 'guides');
    return resolveNestedIndexHtml(pathname, publicGuidesDir, '/guides');
  }

  const slugMatch = pathname.match(/^\/([^/]+)\/?$/);
  if (slugMatch && ROOT_STATIC_SLUGS.has(slugMatch[1])) {
    const filePath = path.join(publicDir, slugMatch[1], 'index.html');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

function resolveNestedIndexHtml(
  pathname: string,
  baseDir: string,
  mountPrefix: string,
): string | null {
  if (!pathname.startsWith(mountPrefix)) {
    return null;
  }

  const base = path.resolve(baseDir);
  let relative = pathname.slice(mountPrefix.length) || '/';

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

/** @deprecated Use resolveStaticHtmlPath */
export function resolveSeoStaticHtmlPath(pathname: string, publicViewsDir: string): string | null {
  const publicDir = path.resolve(publicViewsDir, '..');
  if (pathname.startsWith('/views')) {
    return resolveNestedIndexHtml(pathname, publicViewsDir, '/views');
  }
  return resolveStaticHtmlPath(pathname, publicDir);
}

export function createSeoStaticDevMiddleware(publicDir: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const filePath = resolveStaticHtmlPath(pathname, publicDir);

    if (!filePath || (req.method !== 'GET' && req.method !== 'HEAD')) {
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
