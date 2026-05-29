const LINKEDIN_URL = 'https://linkedin.com/in/ujjwaltiwari';

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200/40 pt-8 dark:border-slate-800/60">
      <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        SFMC Schema Architect is an AI-assisted experimentation and learning project created by
        Ujjwal Tiwari. For feedback or collaboration, connect on{' '}
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          LinkedIn
        </a>
        .
      </p>
    </footer>
  );
}
