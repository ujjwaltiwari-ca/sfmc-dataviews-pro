const CREATOR_URL = 'https://ujjwaltiwari.com';
const LINKEDIN_URL = 'https://linkedin.com/in/ujjwaltiwari';

const nameLinkClassName =
  'font-medium text-slate-700 transition-colors hover:text-cyan-600 hover:underline dark:text-slate-300 dark:hover:text-cyan-400';

const linkedInLinkClassName =
  'text-slate-400 transition-colors hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/60 py-6 dark:border-slate-800/60">
      <p className="text-center text-[13px] leading-relaxed text-slate-500/90 dark:text-slate-400">
        © 2026 DataViews.pro. Crafted by{' '}
        <a
          href={CREATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={nameLinkClassName}
        >
          Ujjwal Tiwari
        </a>
        . All rights reserved.{' '}
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkedInLinkClassName}
          aria-label="Ujjwal Tiwari on LinkedIn"
        >
          LinkedIn
        </a>
      </p>
    </footer>
  );
}
