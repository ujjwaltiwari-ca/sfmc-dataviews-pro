export type CanvasViewMode = 'grid' | 'graph';

export const CANVAS_VIEW_MODE_STORAGE_KEY = 'sfmc-canvas-view-mode';

export function readCanvasViewModePreference(): CanvasViewMode {
  try {
    const stored = localStorage.getItem(CANVAS_VIEW_MODE_STORAGE_KEY);
    return stored === 'graph' ? 'graph' : 'grid';
  } catch {
    return 'grid';
  }
}

export function writeCanvasViewModePreference(mode: CanvasViewMode): void {
  try {
    localStorage.setItem(CANVAS_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
