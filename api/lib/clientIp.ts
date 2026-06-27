import type { IncomingMessage } from 'node:http';

export function getClientIp(req: IncomingMessage): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1] ?? 'unknown';
    }
  }

  return req.socket?.remoteAddress ?? 'unknown';
}
