const SANDBOX_MIN_HEIGHT_PX = 150;
const SANDBOX_DEFAULT_HEIGHT_VIEWPORT_RATIO = 0.4;
const SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO = 0.8;

/** Collapsed header chrome — keep in sync with App canvas padding when minimized. */
export const SANDBOX_COLLAPSED_CHROME_HEIGHT_PX = 72;

/** Draggable resize gutter (`h-1.5`) above the expanded drawer. */
export const SANDBOX_RESIZE_GUTTER_HEIGHT_PX = 6;

export { SANDBOX_MIN_HEIGHT_PX, SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO };

export function clampSandboxHeight(height: number): number {
  if (typeof window === 'undefined') {
    return Math.max(height, SANDBOX_MIN_HEIGHT_PX);
  }
  const maxHeight = Math.floor(window.innerHeight * SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO);
  return Math.min(Math.max(height, SANDBOX_MIN_HEIGHT_PX), maxHeight);
}

export function getDefaultSandboxHeight(): number {
  if (typeof window === 'undefined') {
    return 400;
  }
  return clampSandboxHeight(Math.round(window.innerHeight * SANDBOX_DEFAULT_HEIGHT_VIEWPORT_RATIO));
}

export function getMaxSandboxHeight(): number {
  if (typeof window === 'undefined') {
    return 640;
  }
  return clampSandboxHeight(Math.floor(window.innerHeight * SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO));
}
