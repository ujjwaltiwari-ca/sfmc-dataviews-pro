import { SchemaArchitectMark } from './SchemaArchitectMark';
import {
  OPEN_DOCUMENTATION_EVENT,
  OPEN_PLATFORM_INFO_EVENT,
} from '../constants/siteChromeEvents';

const CREATOR_URL = 'https://ujjwaltiwari.com';
const LINKEDIN_URL = 'https://www.linkedin.com/in/ujjwaltiwari/';
const COMMUNITY_GUIDES_URL =
  'https://help.salesforce.com/s/articleView?id=sf.mc_as_data_view.htm&type=5';

const footerLinkClassName =
  'text-[13px] font-medium text-slate-600 transition-colors hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400';

const nameLinkClassName =
  'font-medium text-slate-700 transition-colors hover:text-cyan-600 hover:underline dark:text-slate-300 dark:hover:text-cyan-400';

export function SiteFooter() {
  const openDocumentation = () => {
    window.dispatchEvent(new CustomEvent(OPEN_DOCUMENTATION_EVENT));
  };

  const openPlatformInfo = () => {
    window.dispatchEvent(new CustomEvent(OPEN_PLATFORM_INFO_EVENT));
  };

  return (
    <footer className="mt-8 border-t border-slate-200/60 pt-8 dark:border-slate-800/60">
      <div className="flex flex-col items-center gap-6 sm:gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <SchemaArchitectMark className="h-4 w-4 rounded-md shadow-sm shadow-cyan-500/20 ring-1 ring-slate-900/5 dark:ring-white/10" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Built for SFMC Developers
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          aria-label="Footer"
        >
          <a href="/views/" className={footerLinkClassName}>
            Data View Reference
          </a>
          <button type="button" onClick={openDocumentation} className={footerLinkClassName}>
            Documentation
          </button>
          <button type="button" onClick={openPlatformInfo} className={footerLinkClassName}>
            Platform Info
          </button>
          <a
            href={COMMUNITY_GUIDES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={footerLinkClassName}
          >
            Community Guides
          </a>
        </nav>

        <p className="max-w-md text-center text-[13px] leading-relaxed text-slate-500/90 dark:text-slate-400">
          DataViews.pro is new and still under active development. If you notice a schema issue, bug,
          or idea, please contact me on{' '}
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={nameLinkClassName}
          >
            LinkedIn
          </a>
          .
        </p>

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
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
