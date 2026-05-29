const CREATOR_URL = 'https://www.ujjwaltiwari.ca';
const LINKEDIN_URL = 'https://linkedin.com/in/ujjwaltiwari';

const linkClassName =
  'font-medium text-blue-600 transition-all hover:underline dark:text-blue-400';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/60 py-6 dark:border-slate-800/60">
      <p className="text-center text-[13px] text-slate-500/90 dark:text-slate-400">
        SFMC Schema Architect is an AI-assisted experimentation and learning project created by{' '}
        <a
          href={CREATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          Ujjwal Tiwari
        </a>
        . For feedback or collaboration, connect on{' '}
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          LinkedIn
        </a>
        .
      </p>
    </footer>
  );
}
