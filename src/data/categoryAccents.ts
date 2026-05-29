import type { DataViewCategory } from './schemas/types';

/** Stroke colors for join-path SVG lines (matches card category accents). */
export const CATEGORY_STROKE: Record<DataViewCategory, string> = {
  Sending: '#3b82f6',
  Tracking: '#10b981',
  Journey: '#8b5cf6',
  Subscribers: '#f59e0b',
  Subscription: '#f43f5e',
  Automation: '#8b5cf6',
  Mobile: '#06b6d4',
  GroupConnect: '#84cc16',
  Social: '#ec4899',
  Other: '#78716c',
  SendLog: '#f97316',
  Synchronized: '#6366f1',
};

export function getCategoryStroke(category: DataViewCategory | undefined): string {
  if (!category) {
    return '#64748b';
  }
  return CATEGORY_STROKE[category];
}
