import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { PROFILE_ATTRIBUTE_HELP_TEXT } from '../data/schemas/helpers';

export function ProfileAttributeHelp() {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const show = () => {
    updatePosition();
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-label="Profile attribute help"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      {isVisible &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="pointer-events-none fixed z-[100] w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-left text-[11px] font-normal leading-snug tracking-normal text-slate-600 shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/40"
          >
            {PROFILE_ATTRIBUTE_HELP_TEXT}
          </span>,
          document.body,
        )}
    </>
  );
}
