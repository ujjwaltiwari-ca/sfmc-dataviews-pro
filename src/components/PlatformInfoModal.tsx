import { useEffect, useId } from 'react';
import { Info, Sparkles, X } from 'lucide-react';

type PlatformInfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PlatformInfoModal({ isOpen, onClose }: PlatformInfoModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Close platform info"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50/90 to-white px-6 py-5 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                DataViews.pro
              </p>
              <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                Platform Info &amp; Credits
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition-all duration-200 ease-in-out hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Public Beta Release
          </div>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            SFMC Schema Architect is an interactive workspace for exploring Salesforce Marketing Cloud
            Data Views, visualizing relationships, and generating production-ready SQL.
          </p>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attribution
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Engineered with the assistance of Gemini and Cursor AI. System prompts and schemas are
              closely grounded on official Salesforce Documentation, the pioneering ecosystem research of{' '}
              <a
                href="https://mateuszdabrowski.pl/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-cyan-600 underline-offset-2 transition-colors hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                Mateusz Dąbrowski&apos;s technical blog
              </a>
              , and structural benchmarks from{' '}
              <a
                href="https://dataviews.io"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-cyan-600 underline-offset-2 transition-colors hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                dataviews.io
              </a>
              .
            </p>
          </div>

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Info
              className="mr-1 inline-block h-3.5 w-3.5 shrink-0 align-[-2px]"
              aria-hidden
            />
            Created by{' '}
            <a
              href="https://ujjwaltiwari.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-600 underline-offset-2 transition-colors hover:text-cyan-600 hover:underline dark:text-slate-300 dark:hover:text-cyan-400"
            >
              Ujjwal Tiwari
            </a>
            , Senior Salesforce Platform Architect — Waterloo, Ontario, Canada.
          </p>
        </div>
      </div>
    </div>
  );
}
