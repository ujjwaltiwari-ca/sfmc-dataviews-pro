const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamail.com',
] as const;

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

  return (DISPOSABLE_EMAIL_DOMAINS as readonly string[]).includes(domain);
}
