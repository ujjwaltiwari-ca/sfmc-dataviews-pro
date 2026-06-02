export const ONBOARDING_TOUR_STORAGE_KEY = 'sfmc-onboarding-tour-completed';

/** 0 = inactive; 1–3 = tour steps */
export type OnboardingTourStep = 0 | 1 | 2 | 3;

export const TOUR_STEP_ONE_TABLES = ['_Job', '_Open'] as const;

export const TOUR_TARGETS = {
  canvasGrid: 'tour-canvas-grid',
  bfsJoinPath: 'tour-bfs-join-path',
  sqlEditor: 'tour-sql-editor',
  copySql: 'tour-copy-sql',
} as const;

export function tourCardTarget(tableName: string): string {
  return `tour-card-${tableName}`;
}
