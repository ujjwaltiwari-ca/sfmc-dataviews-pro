import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Sparkles, X, Zap, Shield } from 'lucide-react';
import {
  TOUR_TARGETS,
  tourCardTarget,
  type OnboardingTourStep,
} from '../constants/onboardingTour';

type Rect = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

type SpotlightRect = Rect & { id: string };

const TOUR_STEP_META: Record<
  Exclude<OnboardingTourStep, 0>,
  {
    title: string;
    body: string;
    icon: typeof Sparkles;
    placement: 'top' | 'bottom' | 'left' | 'right';
  }
> = {
  1: {
    title: 'The Canvas',
    body: "👋 Welcome Architect! Let's build a bulletproof query. Click the checkboxes on _Job and _Open to add them to the canvas.",
    icon: Sparkles,
    placement: 'bottom',
  },
  2: {
    title: 'The Moat',
    body: '⚡ Instant Deterministic Auto-Join: Look at that! Our local compiler mapped out the exact composite key relationship path instantly—no flaky AI hallucinations required.',
    icon: Zap,
    placement: 'right',
  },
  3: {
    title: 'The Guardian',
    body: '🛡️ The 2 AM Timeout Shield: Try copying this code. If you forget an EventDate lookback filter on tracking views, our built-in compiler will instantly intercept the action to save your production automations from timing out!',
    icon: Shield,
    placement: 'top',
  },
};

function mergeRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) {
    return null;
  }
  const tops = rects.map((r) => r.top);
  const lefts = rects.map((r) => r.left);
  const rights = rects.map((r) => r.left + r.width);
  const bottoms = rects.map((r) => r.top + r.height);
  const top = Math.min(...tops);
  const left = Math.min(...lefts);
  const right = Math.max(...rights);
  const bottom = Math.max(...bottoms);
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function padRect(rect: Rect, padding: number): Rect {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function queryTarget(selector: string): Rect | null {
  const node = document.querySelector(selector);
  if (!node) {
    return null;
  }
  return node.getBoundingClientRect();
}

function resolveStepSpotlights(step: OnboardingTourStep): SpotlightRect[] {
  if (step === 1) {
    const cardRects = ['_Job', '_Open']
      .map((name) => {
        const rect = queryTarget(`[data-tour="${tourCardTarget(name)}"]`);
        return rect ? { id: name, ...rect } : null;
      })
      .filter((entry): entry is SpotlightRect => entry !== null);

    const gridRect = queryTarget(`[data-tour="${TOUR_TARGETS.canvasGrid}"]`);
    if (cardRects.length > 0) {
      return cardRects.map((r) => ({ ...padRect(r, 8), id: r.id }));
    }
    if (gridRect) {
      return [{ id: 'canvas', ...padRect(gridRect, 12) }];
    }
    return [];
  }

  if (step === 2) {
    const bfs = queryTarget(`[data-tour="${TOUR_TARGETS.bfsJoinPath}"]`);
    if (bfs) {
      return [{ id: 'bfs', ...padRect(bfs, 10) }];
    }
    return [];
  }

  if (step === 3) {
    const editor = queryTarget(`[data-tour="${TOUR_TARGETS.sqlEditor}"]`);
    const copy = queryTarget(`[data-tour="${TOUR_TARGETS.copySql}"]`);
    const rects: SpotlightRect[] = [];
    if (editor) {
      rects.push({ id: 'editor', ...padRect(editor, 8) });
    }
    if (copy) {
      rects.push({ id: 'copy', ...padRect(copy, 6) });
    }
    return rects;
  }

  return [];
}

function computeTooltipStyle(
  anchor: Rect | null,
  placement: 'top' | 'bottom' | 'left' | 'right',
): CSSProperties {
  const margin = 16;
  const maxWidth = 360;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 768;

  if (!anchor) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth,
    };
  }

  const centerX = anchor.left + anchor.width / 2;
  const centerY = anchor.top + anchor.height / 2;

  if (placement === 'bottom') {
    const top = Math.min(anchor.top + anchor.height + margin, viewportH - 220);
    const left = Math.min(Math.max(margin, centerX - maxWidth / 2), viewportW - maxWidth - margin);
    return { top, left, maxWidth };
  }

  if (placement === 'top') {
    const top = Math.max(margin, anchor.top - margin - 200);
    const left = Math.min(Math.max(margin, centerX - maxWidth / 2), viewportW - maxWidth - margin);
    return { top, left, maxWidth };
  }

  if (placement === 'right') {
    const left = Math.min(anchor.left + anchor.width + margin, viewportW - maxWidth - margin);
    const top = Math.min(Math.max(margin, centerY - 100), viewportH - 240);
    return { top, left, maxWidth };
  }

  const left = Math.max(margin, anchor.left - maxWidth - margin);
  const top = Math.min(Math.max(margin, centerY - 100), viewportH - 240);
  return { top, left, maxWidth };
}

type OnboardingTourProps = {
  step: OnboardingTourStep;
  onNext: () => void;
  onFinish: () => void;
  onDismiss: () => void;
};

export function OnboardingTour({ step, onNext, onFinish, onDismiss }: OnboardingTourProps) {
  const [spotlights, setSpotlights] = useState<SpotlightRect[]>([]);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const next = resolveStepSpotlights(step);
    setSpotlights(next);
    const merged = mergeRects(next);
    setAnchorRect(merged);
  }, [step]);

  useLayoutEffect(() => {
    if (step === 0) {
      return;
    }
    measure();
  }, [step, measure]);

  useEffect(() => {
    if (step === 0) {
      return;
    }

    const handleUpdate = () => measure();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    const scrollRoot = document.querySelector('.surface-canvas');
    scrollRoot?.addEventListener('scroll', handleUpdate);

    const observer = new ResizeObserver(handleUpdate);
    observer.observe(document.body);

    const pollId = window.setInterval(handleUpdate, 400);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      scrollRoot?.removeEventListener('scroll', handleUpdate);
      observer.disconnect();
      window.clearInterval(pollId);
    };
  }, [step, measure]);

  if (step === 0) {
    return null;
  }

  const meta = TOUR_STEP_META[step];
  const StepIcon = meta.icon;
  const tooltipStyle = computeTooltipStyle(anchorRect, meta.placement);

  const mergedSpotlight = mergeRects(spotlights);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[70]"
      role="presentation"
      aria-hidden={false}
    >
      {mergedSpotlight ? (
        <div
          className="tour-spotlight-cutout pointer-events-none"
          style={{
            top: mergedSpotlight.top,
            left: mergedSpotlight.left,
            width: mergedSpotlight.width,
            height: mergedSpotlight.height,
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" aria-hidden />
      )}

      {spotlights.map((spot) => (
        <div
          key={`ring-${spot.id}`}
          className="tour-spotlight-ring pointer-events-none"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
          aria-hidden
        />
      ))}

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="onboarding-tour-title"
        className="pointer-events-auto fixed z-[71] animate-fade-up"
        style={tooltipStyle}
      >
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-900/80 p-5 shadow-[0_0_40px_rgba(6,182,212,0.12),0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]"
            aria-hidden
          />

          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="relative pr-8">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <StepIcon className="h-4 w-4" aria-hidden />
              </span>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
                60-Second Tour · Step {step} of 3
              </p>
            </div>
            <h2
              id="onboarding-tour-title"
              className="mt-2 text-base font-semibold tracking-tight text-white"
            >
              {meta.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{meta.body}</p>

            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dot === step
                      ? 'w-6 bg-cyan-400'
                      : dot < step
                        ? 'w-1.5 bg-cyan-500/50'
                        : 'w-1.5 bg-slate-600'
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {step === 1 ? (
                <p className="text-xs text-slate-500">
                  Select <span className="font-mono text-cyan-400/90">_Job</span> and{' '}
                  <span className="font-mono text-cyan-400/90">_Open</span> to continue automatically.
                </p>
              ) : step === 2 ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/60 hover:bg-cyan-500/25"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinish}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/25"
                >
                  Finish Tour &amp; Explore
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
