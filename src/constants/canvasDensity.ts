export type CanvasDensity = 'comfortable' | 'compact';

export const CANVAS_DENSITY_STORAGE_KEY = 'sfmc-canvas-density';

export function readCanvasDensityPreference(): CanvasDensity {
  try {
    const stored = localStorage.getItem(CANVAS_DENSITY_STORAGE_KEY);
    if (stored === 'compact' || stored === 'comfortable') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'comfortable';
}

export function canvasGridItemClassName(density: CanvasDensity): string {
  if (density === 'compact') {
    return 'animate-fade-up w-full min-w-0 sm:w-[calc((100%-0.75rem)/2)] sm:max-w-[calc((100%-0.75rem)/2)] md:w-[calc((100%-1.5rem)/3)] md:max-w-[calc((100%-1.5rem)/3)] xl:w-[calc((100%-2.25rem)/4)] xl:max-w-[calc((100%-2.25rem)/4)]';
  }
  return 'animate-fade-up w-full min-w-0 md:w-[calc((100%-1.25rem)/2)] md:max-w-[calc((100%-1.25rem)/2)] xl:w-[calc((100%-2.5rem)/3)] xl:max-w-[calc((100%-2.5rem)/3)]';
}

export function canvasGridGapClassName(density: CanvasDensity): string {
  return density === 'compact' ? 'gap-3' : 'gap-5';
}

export function canvasMainMaxWidthClassName(density: CanvasDensity): string {
  return density === 'compact' ? 'max-w-[90rem]' : 'max-w-7xl';
}
