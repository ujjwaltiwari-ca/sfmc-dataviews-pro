import { useEffect, useId } from 'react';
import { Sparkles, X } from 'lucide-react';
import { BRAND_NAME, BRAND_RELEASE_LABEL } from '../constants/brand';
import { CHANGELOG, markWhatsNewSeen } from '../content/changelog';

type WhatsNewModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
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

  const handleDismiss = () => {
    markWhatsNewSeen();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Close what's new"
        onClick={handleDismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50/90 to-cyan-50/50 px-6 py-5 dark:border-slate-800 dark:from-violet-950/40 dark:to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                What&apos;s New
              </p>
              <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {BRAND_NAME} {BRAND_RELEASE_LABEL}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-2 text-slate-500 transition-all duration-200 ease-in-out hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(min(90vh,640px)-5.5rem)] overflow-y-auto px-6 py-6">
          {CHANGELOG.map((release) => (
            <section key={release.version}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {release.title} · {release.date}
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {release.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-700 hover:to-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          >
            Got it — start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
