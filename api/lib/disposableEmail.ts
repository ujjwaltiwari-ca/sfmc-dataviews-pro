import disposableDomains from 'disposable-email-domains';

const DISPOSABLE_DOMAIN_SET = new Set(
  (disposableDomains as readonly string[]).map((domain) => domain.toLowerCase()),
);

export function getEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 0) {
    return null;
  }

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return domain || null;
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) {
    return false;
  }

  return DISPOSABLE_DOMAIN_SET.has(domain);
}
