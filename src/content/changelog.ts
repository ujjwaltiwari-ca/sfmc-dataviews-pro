export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0',
    date: 'June 2026',
    title: 'General Availability',
    highlights: [
      'Interactive schema canvas for 29+ core SFMC Data Views with relationship highlighting',
      'SQL Sandbox with BFS auto-join pathfinding, templates, and Query Studio utilities',
      'Shareable workspace URLs — copy link to preserve table selections and sandbox settings',
      'Comfortable / Compact canvas density toggle for high-resolution screens',
      'AI Copilot for signed-in users (schema browser and SQL sandbox remain free)',
      'Static reference pages at /views/ and practitioner SQL guides at /guides/',
    ],
  },
];

export const WHATS_NEW_STORAGE_KEY = 'sfmc-whats-new-seen';
export const WHATS_NEW_VERSION = '1.0';
export const VISIT_COUNT_STORAGE_KEY = 'sfmc-visit-count';

export function hasSeenWhatsNew(): boolean {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY) === WHATS_NEW_VERSION;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION);
  } catch {
    /* ignore */
  }
}

/** Increments the persisted visit counter once per app load. */
export function recordAppVisit(): number {
  try {
    const next = Number.parseInt(localStorage.getItem(VISIT_COUNT_STORAGE_KEY) ?? '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_STORAGE_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

/** Auto-open What's New only from the second visit onward. */
export function shouldAutoOpenWhatsNew(): boolean {
  if (hasSeenWhatsNew()) {
    return false;
  }

  try {
    const visits = Number.parseInt(localStorage.getItem(VISIT_COUNT_STORAGE_KEY) ?? '0', 10);
    return visits >= 2;
  } catch {
    return false;
  }
}
