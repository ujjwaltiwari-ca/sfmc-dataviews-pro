import {
  type ElementType,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_SHOW_DELAY_MS = 400;

type TruncatedTextProps = {
  text: string;
  className?: string;
  as?: ElementType;
  /** Use line-clamp overflow detection (descriptions) instead of single-line truncate. */
  clampLines?: 2 | 3;
  /** Prose tooltips wrap below the element; mono shows above on one line. */
  tooltipVariant?: 'mono' | 'prose';
};

const TOOLTIP_BASE_CLASS =
  'pointer-events-none fixed z-[110] -translate-x-1/2 rounded-lg border border-slate-700/90 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg shadow-black/35 dark:border-slate-600 dark:bg-slate-950';

const TOOLTIP_VARIANT_CLASS = {
  mono: `${TOOLTIP_BASE_CLASS} max-w-[min(28rem,calc(100vw-2rem))] -translate-y-full font-mono font-normal leading-snug`,
  prose: `${TOOLTIP_BASE_CLASS} max-w-xs text-left font-normal leading-relaxed`,
} as const;

function isTextOverflowing(element: HTMLElement, clampLines?: 2 | 3): boolean {
  if (clampLines) {
    return element.scrollHeight > element.clientHeight + 1;
  }
  return element.scrollWidth > element.clientWidth + 1;
}

export function TruncatedText({
  text,
  className = '',
  as: Component = 'span',
  clampLines,
  tooltipVariant = 'mono',
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement>(null);
  const tooltipId = useId();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    setIsOverflowing(isTextOverflowing(element, clampLines));
  }, [clampLines]);

  useEffect(() => {
    measure();
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, text]);

  useEffect(
    () => () => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current);
      }
    },
    [],
  );

  const updatePosition = useCallback(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    setPosition({
      top: tooltipVariant === 'prose' ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [tooltipVariant]);

  const clearShowTimer = () => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const scheduleShow = () => {
    if (!isOverflowing) {
      return;
    }
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      updatePosition();
      setIsTooltipVisible(true);
      showTimerRef.current = null;
    }, TOOLTIP_SHOW_DELAY_MS);
  };

  const hideTooltip = () => {
    clearShowTimer();
    setIsTooltipVisible(false);
  };

  return (
    <>
      <Component
        ref={ref}
        className={`${className}${isOverflowing ? ' cursor-help' : ''}`.trim()}
        onMouseEnter={scheduleShow}
        onMouseLeave={hideTooltip}
        onFocus={scheduleShow}
        onBlur={hideTooltip}
        tabIndex={isOverflowing ? 0 : undefined}
        aria-describedby={isTooltipVisible && isOverflowing ? tooltipId : undefined}
      >
        {text}
      </Component>
      {isTooltipVisible && isOverflowing
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className={TOOLTIP_VARIANT_CLASS[tooltipVariant]}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
