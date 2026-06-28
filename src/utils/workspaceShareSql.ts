/** Max SQL length included in share URLs (avoids browser URL limits). */
export const MAX_SHARE_SQL_URL_CHARS = 6_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeShareSql(sql: string): string | null {
  const trimmed = sql.trim();
  if (!trimmed || trimmed.length > MAX_SHARE_SQL_URL_CHARS) {
    return null;
  }

  return bytesToBase64Url(new TextEncoder().encode(trimmed));
}

export function decodeShareSql(encoded: string | null | undefined): string | null {
  if (!encoded?.trim()) {
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(encoded.trim()));
    const trimmed = decoded.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
