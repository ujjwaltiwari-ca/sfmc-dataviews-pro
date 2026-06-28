import type { ViewSegmentId } from '../data/viewSegments';

export type OnboardingIntentId = 'find-subscriber' | 'measure-send' | 'audit-journey';

export type OnboardingIntent = {
  id: OnboardingIntentId;
  title: string;
  description: string;
  segment: ViewSegmentId;
  tableNames: string[];
  templateId: string;
};

export const ONBOARDING_INTENTS: OnboardingIntent[] = [
  {
    id: 'find-subscriber',
    title: 'Find a subscriber',
    description:
      'Locate suppressed or bounced subscribers — the first step after a large send or list import.',
    segment: 'core',
    tableNames: ['_Subscribers', '_Bounce'],
    templateId: 'recent-hard-bounces',
  },
  {
    id: 'measure-send',
    title: 'Measure a send',
    description:
      'Compare opens and clicks per JobID to spot underperforming campaigns before your next deployment.',
    segment: 'core',
    tableNames: ['_Sent', '_Open', '_Click'],
    templateId: 'click-to-open-rate-by-job',
  },
  {
    id: 'audit-journey',
    title: 'Audit a journey',
    description:
      'Review running and draft journeys with version metadata for governance and cleanup.',
    segment: 'core',
    tableNames: ['_Journey'],
    templateId: 'journey-entry-audit',
  },
];

export const ONBOARDING_DISMISSED_STORAGE_KEY = 'sfmc-ws-onboarding-dismissed';

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
