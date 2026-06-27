/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Braces,
  Calendar,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  FileText,
  GitBranch,
  Hash,
  Info,
  Route,
  Save,
  Search,
  Shield,
  Terminal,
  Users,
  Zap,
  GripHorizontal,
  Maximize2,
} from 'lucide-react';
import type { DataViewTable } from '../data/sfmcSchema';
import {
  applySqlKeywordCase,
  applySqlUtilityFilters,
  applyTargetDeScaffolding,
  buildActiveSubscriberPredicate,
  buildUniqueEventPredicate,
  generateSfmcSql,
  getUniqueEventTablesInJoinGraph,
  resolveFilterAlias,
  suggestBridgeTable,
  UNIQUE_EVENT_FILTER_INACTIVE_HINT,
  lacksTrackingViewDateLookback,
  stripLeadingSqlComments,
  type SqlKeywordCase,
} from '../utils/sqlGenerator';
import { sfmcQueryTemplates, QUERY_TEMPLATE_CATEGORIES } from '../data/queryTemplates';
import type { QueryTemplateCategory } from '../data/queryTemplates';
import type { ViewSegmentId } from '../data/viewSegments';
import type { BuContextMode } from '../constants/buContext';
import { sfmcDataViews } from '../data/sfmcSchema';
import { FieldExpressionLabel, SqlSyntaxSnippet } from './SqlStyledCode';
import { getIdentifierSyntaxClass, SYNTAX_TEXT_CLASS } from '../utils/typeSyntax';
import type { SandboxEditorTab, SandboxPreferences } from '../utils/workspacePersistence';
import {
  buildDefaultParameterValues,
  buildTemplateParameterDefinitions,
  interpolateTemplateSql,
  parseTemplatePlaceholders,
} from '../utils/templatePlaceholders';
import { TemplateParametersPanel } from './TemplateParametersPanel';
import { TrackingQueryWarningDialog } from './TrackingQueryWarningDialog';
import { SandboxSqlCodeMirror } from './SandboxSqlCodeMirror';
import { SandboxQueryHistory } from './SandboxQueryHistory';
import { SavedQueriesPanel } from './SavedQueriesPanel';
import { createSavedQuery } from '../utils/savedQueriesApi';
import type { SavedQuery } from '../utils/savedQueriesApi';
import { useAuth } from '../context/authContext.shared';
import { appendSandboxQuerySnapshot } from '../utils/sandboxQueryHistory';
import type { SandboxQuerySnapshot } from '../utils/sandboxQueryHistory';
import { sanitizeNumericSqlLiteral } from '../utils/sqlSanitize';
import {
  clampSandboxHeight,
  getDefaultSandboxHeight,
  getMaxSandboxHeight,
  SANDBOX_COLLAPSED_CHROME_HEIGHT_PX,
  SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO,
  SANDBOX_MIN_HEIGHT_PX,
} from '../constants/sandboxLayout';

const QUERY_STUDIO_TIP =
  'Quick tip: Copy the SQL below, adjust Job IDs and filters for your business unit, then run it in Query Studio or as a Query Activity in Automation Studio.';

const COPIED_FEEDBACK_MS = 2200;

const SANDBOX_SHELL_CLASS =
  'pointer-events-auto flex flex-col bg-white border border-slate-200/60 shadow-[0_-4px_24px_rgba(15,23,42,0.06),0_-12px_40px_rgba(15,23,42,0.04)] dark:bg-slate-950 dark:border-slate-800/60 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]';

const GLASS_PANEL_CLASS =
  'rounded-xl border border-slate-200/60 bg-slate-900/[0.03] shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:border-slate-800/60 dark:bg-slate-900/50 dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)]';

const SIDEBAR_COLUMN_CLASS =
  'rounded-xl bg-slate-900/[0.03] p-3 dark:bg-slate-900/30';

const SECTION_TITLE_CLASS = 'text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100';

const COUNT_BADGE_CLASS =
  'font-mono text-[11px] font-semibold text-blue-500 dark:text-blue-400';

function buildSqlPreviewLine(source: string, maxLength = 96): string {
  const normalized = stripLeadingSqlComments(source).replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function QueryStudioTipIcon({ tip }: { tip: string }) {
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
        className="inline-flex shrink-0 rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-label="Query Studio quick tip"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info
          className="h-4 w-4 cursor-help text-slate-400 transition-colors hover:text-slate-200"
          aria-hidden
        />
      </button>
      {isVisible &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="pointer-events-none fixed z-[100] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700/90 bg-slate-900 px-3 py-2 text-left text-[11px] font-normal leading-snug tracking-normal text-slate-200 shadow-lg shadow-black/50"
          >
            {tip}
          </span>,
          document.body,
        )}
    </>
  );
}

type EditorTab = SandboxEditorTab;

export type { SandboxEditorTab };

function EditorTabButton({
  id,
  label,
  isActive,
  onClick,
  icon,
}: {
  id: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls="sql-editor-panel"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
        isActive
          ? 'text-sky-400 after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:bg-sky-400/80'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TemplateLibraryGrid({
  onSelectTemplate,
}: {
  onSelectTemplate: (templateId: string) => void;
}) {
  const [category, setCategory] = useState<QueryTemplateCategory>('All');
  const [search, setSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sfmcQueryTemplates.filter((template) => {
      if (category !== 'All' && template.category !== category) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        template.title.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.category.toLowerCase().includes(needle)
      );
    });
  }, [category, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            {filteredTemplates.length} of {sfmcQueryTemplates.length} templates
          </p>
          <label className="relative min-w-[10rem] flex-1 sm:max-w-xs">
            <span className="sr-only">Search templates</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Template categories">
          {QUERY_TEMPLATE_CATEGORIES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setCategory(entry)}
              aria-pressed={category === entry}
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                category === entry
                  ? 'bg-sky-600/90 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
      <div className="scrollbar-sql-editor min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        {filteredTemplates.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No templates match your filters.</p>
        ) : (
          <div className="grid auto-rows-min grid-cols-1 content-start gap-3 sm:grid-cols-2">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate(template.id)}
                className="group flex flex-col rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3.5 text-left transition-all hover:border-sky-500/40 hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <span className="flex items-center gap-2 font-mono text-sm font-semibold leading-snug text-slate-100 group-hover:text-sky-300">
                  <Zap className="h-4 w-4 shrink-0 text-amber-400/90" aria-hidden />
                  {template.title}
                </span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  {template.category}
                </span>
                <span className="mt-2 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveQueryControl({
  title,
  sqlText,
  tableSelection,
  segment,
  filterState,
  onSaved,
  onSignInRequired,
}: {
  title: string;
  sqlText: string;
  tableSelection: string[];
  segment: ViewSegmentId;
  filterState: {
    sandboxPreferences: Partial<SandboxPreferences>;
    buContext: BuContextMode;
  };
  onSaved: () => void;
  onSignInRequired?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [queryTitle, setQueryTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = sqlText.trim().length > 0 || tableSelection.length > 0;

  const handleSave = async () => {
    if (!user) {
      onSignInRequired?.();
      return;
    }
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createSavedQuery({
        title: queryTitle.trim() || title,
        sqlText,
        tableSelection,
        segment,
        filterState,
      });
      setOpen(false);
      setQueryTitle('');
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canSave) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!user) {
            onSignInRequired?.();
            return;
          }
          setOpen((previous) => !previous);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 transition-all hover:border-sky-500/40 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      >
        <Save className="h-3.5 w-3.5" aria-hidden />
        Save query
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <label htmlFor="save-query-title" className="font-mono text-[10px] uppercase text-slate-500">
            Query name
          </label>
          <input
            id="save-query-title"
            type="text"
            value={queryTitle}
            onChange={(event) => setQueryTitle(event.target.value)}
            placeholder={title}
            maxLength={120}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSave();
              }
              if (event.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
          {error ? (
            <p className="mt-2 text-[10px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="rounded bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface SqlGeneratorProps {
  selectedTableNames: string[];
  schemaTables?: DataViewTable[];
  sql: string;
  onSqlChange: (sql: string) => void;
  isVisible: boolean;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  sandboxPreferences: SandboxPreferences;
  onSandboxPreferencesChange: (patch: Partial<SandboxPreferences>) => void;
  activeTemplateId: string | null;
  onActiveTemplateIdChange: (templateId: string | null) => void;
  /** When true, skip overwriting sql from card-driven generation (e.g. copilot apply). */
  preserveSql?: boolean;
  editorTab?: SandboxEditorTab;
  onEditorTabChange?: (tab: SandboxEditorTab) => void;
  /** Increment to reset template selection (e.g. header shortcut). */
  templatesShortcutNonce?: number;
  /** Notifies parent when the user-resized drawer height changes (for canvas padding). */
  onSandboxHeightChange?: (height: number) => void;
  /** When true, generated SQL uses Ent. prefix on system data views. */
  enterpriseBuMode?: boolean;
  segment: ViewSegmentId;
  buContext: BuContextMode;
  onSignInRequired?: () => void;
  onRestoreSavedQuery: (query: SavedQuery) => void;
}

function SelectColumnModeControl({
  compactSelect,
  onChange,
}: {
  compactSelect: boolean;
  onChange: (compact: boolean) => void;
}) {
  return (
    <div
      className="flex items-center rounded-lg border border-slate-700/60 bg-slate-900/80 p-0.5"
      role="group"
      aria-label="SELECT column mode"
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
          compactSelect
            ? 'bg-slate-700 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-pressed={compactSelect}
        title="Include only the most common columns for each selected data view"
      >
        Essential columns
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
          !compactSelect
            ? 'bg-slate-700 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-pressed={!compactSelect}
        title="Include every field from the data view cards you selected"
      >
        All columns
      </button>
    </div>
  );
}

function UtilityToggle({
  id,
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  disabled = false,
  plainDescription = false,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: typeof Calendar;
  disabled?: boolean;
  plainDescription?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ease-out ${
        disabled
          ? 'cursor-not-allowed border-slate-200/50 bg-slate-50/50 opacity-70 dark:border-slate-800/50 dark:bg-slate-900/25'
          : checked
            ? 'cursor-pointer border-cyan-400/50 bg-cyan-50/80 shadow-[0_4px_12px_rgba(6,182,212,0.08)] dark:border-cyan-500/40 dark:bg-cyan-950/30'
            : 'cursor-pointer border-slate-200/60 bg-white/60 hover:border-slate-300/60 hover:bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-900/40 dark:hover:border-slate-600/60 dark:hover:bg-slate-800/50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
          <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
          {label}
        </span>
        {plainDescription ? (
          <span className="mt-1 block break-words text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            {description}
          </span>
        ) : (
          <span className="mt-1 block min-w-0 break-words leading-snug">
            <SqlSyntaxSnippet text={description} className="whitespace-normal" />
          </span>
        )}
      </span>
    </label>
  );
}

function CampaignJobIdFilter({
  checked,
  jobId,
  onCheckedChange,
  onJobIdChange,
  previewPredicate,
}: {
  checked: boolean;
  jobId: string;
  onCheckedChange: (value: boolean) => void;
  onJobIdChange: (value: string) => void;
  previewPredicate: string;
}) {
  return (
    <div
      className={`rounded-xl border transition-all duration-300 ease-out ${
        checked
          ? 'border-cyan-400/50 bg-cyan-50/80 shadow-[0_4px_12px_rgba(6,182,212,0.08)] dark:border-cyan-500/40 dark:bg-cyan-950/30'
          : 'border-slate-200/60 bg-white/60 hover:border-slate-300/60 hover:bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-900/40 dark:hover:border-slate-600/60 dark:hover:bg-slate-800/50'
      }`}
    >
      <label
        htmlFor="filter-campaign-job-id"
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
      >
        <input
          id="filter-campaign-job-id"
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-800"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            <Hash className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden />
            Filter by Campaign JobID
          </span>
          <span className="mt-1 block leading-snug">
            <SqlSyntaxSnippet text={previewPredicate} />
          </span>
        </span>
      </label>
      {checked && (
        <div className="border-t border-slate-200/60 px-3 pb-3 pt-2 dark:border-slate-700/50">
          <label htmlFor="campaign-job-id-value" className="sr-only">
            Campaign JobID
          </label>
          <input
            id="campaign-job-id-value"
            type="text"
            inputMode="numeric"
            value={jobId}
            onChange={(event) => onJobIdChange(sanitizeNumericSqlLiteral(event.target.value))}
            placeholder="e.g., 123456"
            className="w-full rounded-lg border border-slate-200/60 bg-white/90 px-2.5 py-1.5 font-mono text-xs text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-slate-400 transition-all duration-300 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      )}
    </div>
  );
}

function KeywordCaseToggle({
  value,
  onChange,
}: {
  value: SqlKeywordCase;
  onChange: (value: SqlKeywordCase) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/60 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/40">
      <div className="flex items-start gap-3">
        <CaseSensitive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Keyword case</p>
          <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
            Switch core SQL keywords between uppercase and lowercase in the output.
          </p>
          <div
            className="mt-2 inline-flex rounded-lg border border-slate-200/60 bg-slate-100/60 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-700/50 dark:bg-slate-800/60"
            role="group"
            aria-label="SQL keyword case"
          >
            <button
              type="button"
              onClick={() => onChange('upper')}
              aria-pressed={value === 'upper'}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                value === 'upper'
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              UPPERCASE
            </button>
            <button
              type="button"
              onClick={() => onChange('lower')}
              aria-pressed={value === 'lower'}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                value === 'lower'
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              lowercase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SqlGenerator({
  selectedTableNames,
  schemaTables,
  sql,
  onSqlChange,
  isVisible,
  isExpanded,
  onExpandedChange,
  sandboxPreferences,
  onSandboxPreferencesChange,
  activeTemplateId,
  onActiveTemplateIdChange,
  preserveSql = false,
  editorTab: editorTabProp,
  onEditorTabChange,
  templatesShortcutNonce = 0,
  onSandboxHeightChange,
  enterpriseBuMode = false,
  segment,
  buContext,
  onSignInRequired,
  onRestoreSavedQuery,
}: SqlGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [copyWarningOpen, setCopyWarningOpen] = useState(false);
  const [historyRefreshNonce, setHistoryRefreshNonce] = useState(0);
  const [savedQueriesRefreshNonce, setSavedQueriesRefreshNonce] = useState(0);
  const [sandboxHeight, setSandboxHeight] = useState(getDefaultSandboxHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [showExpandHint, setShowExpandHint] = useState(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(getDefaultSandboxHeight());
  const prevSelectionCountRef = useRef(selectedTableNames.length);
  const {
    compactSelect,
    limitPast30Days,
    filterUniqueEvents,
    excludeTestSends,
    filterActiveSubscribersOnly,
    filterByCampaignJobId,
    campaignJobId,
    includeTargetDeScaffolding,
    keywordCase,
    editorTab: preferenceEditorTab,
  } = sandboxPreferences;
  const editorTab = editorTabProp ?? preferenceEditorTab;
  const [templateParamValues, setTemplateParamValues] = useState<Record<string, string>>(() => {
    if (activeTemplateId) {
      const template = sfmcQueryTemplates.find((item) => item.id === activeTemplateId);
      if (template) {
        return buildDefaultParameterValues(parseTemplatePlaceholders(template.sql));
      }
    }
    return {};
  });

  const [prevTemplateId, setPrevTemplateId] = useState(activeTemplateId);
  if (activeTemplateId !== prevTemplateId) {
    setPrevTemplateId(activeTemplateId);
    if (activeTemplateId) {
      const template = sfmcQueryTemplates.find((item) => item.id === activeTemplateId);
      setTemplateParamValues(
        template ? buildDefaultParameterValues(parseTemplatePlaceholders(template.sql)) : {},
      );
    } else {
      setTemplateParamValues({});
    }
  }

  /** When true, Pathfinder stops overwriting sandbox SQL so manual edits (e.g. EventDate) persist. */
  const [manualSqlLocked, setManualSqlLocked] = useState(false);

  const [prevSelectedCount, setPrevSelectedCount] = useState(selectedTableNames.length);
  if (selectedTableNames.length !== prevSelectedCount) {
    setPrevSelectedCount(selectedTableNames.length);
    setManualSqlLocked(false);
  }

  const activeTemplate = useMemo(
    () => sfmcQueryTemplates.find((item) => item.id === activeTemplateId) ?? null,
    [activeTemplateId],
  );

  const templatePlaceholders = useMemo(
    () => (activeTemplate ? parseTemplatePlaceholders(activeTemplate.sql) : []),
    [activeTemplate],
  );

  const templateParameterDefinitions = useMemo(
    () => buildTemplateParameterDefinitions(templatePlaceholders),
    [templatePlaceholders],
  );

  const showTemplateParametersPanel =
    editorTab === 'templates' &&
    activeTemplateId !== null &&
    templatePlaceholders.length > 0;

  const schema = schemaTables ?? sfmcDataViews;

  const generation = useMemo(
    () =>
      generateSfmcSql(selectedTableNames, schemaTables, {
        requireSubscribersJoin: filterActiveSubscribersOnly,
        filterUniqueEvents,
        compactSelect,
        enterpriseBuMode,
      }),
    [
      selectedTableNames,
      schemaTables,
      filterActiveSubscribersOnly,
      filterUniqueEvents,
      compactSelect,
      enterpriseBuMode,
    ],
  );

  const {
    baseSql,
    bridgingTables,
    disconnectedTables,
    userSelectedTables,
    architecture,
    filterAlias,
    joinTables,
  } = generation;

  const subscribersInJoinPath = joinTables.includes('_Subscribers');

  const jobIdFilterAlias = useMemo(
    () => resolveFilterAlias(userSelectedTables, joinTables, schema, ['JobID']),
    [userSelectedTables, joinTables, schema],
  );

  const campaignJobIdActive =
    filterByCampaignJobId && campaignJobId.trim().length > 0;

  const uniqueEventTablesInGraph = useMemo(
    () => getUniqueEventTablesInJoinGraph(joinTables),
    [joinTables],
  );

  const isUniqueEventFilterApplicable = uniqueEventTablesInGraph.length > 0;
  const isUniqueEventFilterActive = filterUniqueEvents && isUniqueEventFilterApplicable;

  const uniqueEventFilterPreview = useMemo(() => {
    if (!isUniqueEventFilterApplicable) {
      return UNIQUE_EVENT_FILTER_INACTIVE_HINT;
    }
    return uniqueEventTablesInGraph
      .map((tableName) => `AND ${buildUniqueEventPredicate(tableName)}`)
      .join(' ');
  }, [isUniqueEventFilterApplicable, uniqueEventTablesInGraph]);

  const filteredSql = useMemo(
    () =>
      applySqlUtilityFilters(
        baseSql,
        {
          limitPast30Days,
          excludeTestSends,
          filterActiveSubscribersOnly:
            filterActiveSubscribersOnly && subscribersInJoinPath,
          filterByCampaignJobId: campaignJobIdActive,
          campaignJobId,
          jobIdFilterAlias,
        },
        filterAlias,
        keywordCase,
      ),
    [
      baseSql,
      limitPast30Days,
      excludeTestSends,
      filterActiveSubscribersOnly,
      subscribersInJoinPath,
      campaignJobIdActive,
      campaignJobId,
      jobIdFilterAlias,
      filterAlias,
      keywordCase,
    ],
  );

  const casedSql = useMemo(
    () => applySqlKeywordCase(filteredSql, keywordCase),
    [filteredSql, keywordCase],
  );

  const displaySql = useMemo(
    () =>
      applyTargetDeScaffolding(
        casedSql,
        architecture.rootTable,
        keywordCase,
        includeTargetDeScaffolding,
      ),
    [casedSql, architecture.rootTable, keywordCase, includeTargetDeScaffolding],
  );

  const formatUtilityPreview = (expression: string) =>
    applySqlKeywordCase(expression, keywordCase);

  useEffect(() => {
    if (!activeTemplate) {
      return;
    }

    const placeholders = parseTemplatePlaceholders(activeTemplate.sql);
    if (placeholders.length === 0) {
      onSqlChange(activeTemplate.sql);
      return;
    }

    onSqlChange(interpolateTemplateSql(activeTemplate.sql, templateParamValues));
  }, [activeTemplate, templateParamValues, onSqlChange]);

  useEffect(() => {
    if (preserveSql || manualSqlLocked || selectedTableNames.length === 0 || editorTab !== 'live') {
      return;
    }
    onSqlChange(displaySql);
  }, [displaySql, onSqlChange, preserveSql, manualSqlLocked, selectedTableNames.length, editorTab]);

  const handleTemplateParameterChange = useCallback((token: string, value: string) => {
    setTemplateParamValues((previous) => ({ ...previous, [token]: value }));
  }, []);

  const handleEditorTabChange = (tab: EditorTab) => {
    if (onEditorTabChange) {
      onEditorTabChange(tab);
    } else {
      onSandboxPreferencesChange({ editorTab: tab });
    }
    if (tab === 'live') {
      onActiveTemplateIdChange(null);
      if (!preserveSql && selectedTableNames.length > 0) {
        onSqlChange(displaySql);
      }
      return;
    }
    if (tab === 'history') {
      onActiveTemplateIdChange(null);
      return;
    }
    if (tab === 'saved') {
      onActiveTemplateIdChange(null);
      return;
    }
    onActiveTemplateIdChange(null);
  };

  const templatesShortcutNonceRef = useRef(templatesShortcutNonce);
  useEffect(() => {
    if (templatesShortcutNonceRef.current === templatesShortcutNonce) {
      return;
    }
    templatesShortcutNonceRef.current = templatesShortcutNonce;
    onActiveTemplateIdChange(null);
  }, [templatesShortcutNonce, onActiveTemplateIdChange]);

  const handleSelectTemplate = (templateId: string) => {
    const template = sfmcQueryTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    onActiveTemplateIdChange(templateId);
    onSandboxPreferencesChange({ editorTab: 'templates', isSandboxExpanded: true });
  };

  const handleBackToTemplates = () => {
    onActiveTemplateIdChange(null);
  };

  const showTemplateLibrary = editorTab === 'templates' && activeTemplateId === null;
  const showSqlEditor = editorTab === 'live' || activeTemplateId !== null;
  const showHistory = editorTab === 'history';
  const showSaved = editorTab === 'saved';

  const savedQueryFilterState = useMemo(
    () => ({
      sandboxPreferences: {
        compactSelect,
        limitPast30Days,
        filterUniqueEvents,
        excludeTestSends,
        filterActiveSubscribersOnly,
        filterByCampaignJobId,
        campaignJobId,
        includeTargetDeScaffolding,
        keywordCase,
      },
      buContext,
    }),
    [
      buContext,
      campaignJobId,
      compactSelect,
      excludeTestSends,
      filterActiveSubscribersOnly,
      filterByCampaignJobId,
      filterUniqueEvents,
      includeTargetDeScaffolding,
      keywordCase,
      limitPast30Days,
    ],
  );

  const defaultSavedQueryTitle = useMemo(() => {
    if (selectedTableNames.length > 0) {
      return selectedTableNames.join(' + ');
    }
    return 'Untitled Query';
  }, [selectedTableNames]);

  useEffect(() => {
    if (editorTab !== 'live' || !sql.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      const saved = appendSandboxQuerySnapshot(sql, selectedTableNames);
      if (saved) {
        setHistoryRefreshNonce((nonce) => nonce + 1);
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [sql, selectedTableNames, editorTab]);

  const handleRestoreHistory = useCallback(
    (snapshot: SandboxQuerySnapshot) => {
      onSqlChange(snapshot.sql);
      onSandboxPreferencesChange({ editorTab: 'live' });
      setManualSqlLocked(true);
    },
    [onSqlChange, onSandboxPreferencesChange],
  );

  const disconnectedWarnings = useMemo(
    () =>
      disconnectedTables.map((tableName) => ({
        tableName,
        bridge: suggestBridgeTable(tableName, joinTables, schema),
      })),
    [disconnectedTables, joinTables, schema],
  );

  const pathfinderAutoSyncActive =
    editorTab === 'live' && selectedTableNames.length > 0 && !preserveSql;
  const isSqlEditorReadOnly = showTemplateParametersPanel;

  const handleSqlEditorChange = useCallback(
    (nextSql: string) => {
      onSqlChange(nextSql);
      if (pathfinderAutoSyncActive && nextSql !== displaySql) {
        setManualSqlLocked(true);
      }
    },
    [onSqlChange, pathfinderAutoSyncActive, displaySql],
  );

  const handleSyncWithPathfinder = useCallback(() => {
    setManualSqlLocked(false);
    onSqlChange(displaySql);
  }, [displaySql, onSqlChange]);

  const fieldsByTable = useMemo(() => {
    const groups = new Map<string, typeof architecture.selectFields>();
    for (const field of architecture.selectFields) {
      const existing = groups.get(field.table) ?? [];
      existing.push(field);
      groups.set(field.table, existing);
    }
    return groups;
  }, [architecture]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    onSandboxHeightChange?.(sandboxHeight);
  }, [sandboxHeight, onSandboxHeightChange]);

  const sqlPreviewLine = useMemo(() => buildSqlPreviewLine(sql), [sql]);

  useEffect(() => {
    const previousCount = prevSelectionCountRef.current;
    prevSelectionCountRef.current = selectedTableNames.length;
    if (selectedTableNames.length > 0 && previousCount === 0 && !isExpanded) {
      setShowExpandHint(true);
      const timer = window.setTimeout(() => setShowExpandHint(false), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [selectedTableNames.length, isExpanded]);

  useEffect(() => {
    const handleWindowResize = () => {
      setSandboxHeight((previous) => clampSandboxHeight(previous));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaY = resizeStartYRef.current - event.clientY;
      const nextHeight = clampSandboxHeight(resizeStartHeightRef.current + deltaY);
      setSandboxHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
  }, [isResizing]);

  const handleMaximizeSandboxHeight = useCallback(() => {
    setSandboxHeight(getMaxSandboxHeight());
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      resizeStartYRef.current = event.clientY;
      resizeStartHeightRef.current = sandboxHeight;
      setIsResizing(true);
    },
    [sandboxHeight],
  );

  const performCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stripLeadingSqlComments(sql));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [sql]);

  const handleCopy = useCallback(() => {
    if (lacksTrackingViewDateLookback(sql)) {
      setCopyWarningOpen(true);
      return;
    }
    void performCopy();
  }, [sql, performCopy]);

  const handleConfirmRiskyCopy = useCallback(() => {
    setCopyWarningOpen(false);
    void performCopy();
  }, [performCopy]);

  const handleCancelRiskyCopy = useCallback(() => {
    setCopyWarningOpen(false);
  }, []);

  const handleEnableDateFilterFromWarning = useCallback(() => {
    setCopyWarningOpen(false);
    setManualSqlLocked(false);
    onSandboxPreferencesChange({ limitPast30Days: true });
  }, [onSandboxPreferencesChange]);

  const expandedDrawerHeightPx = isExpanded ? sandboxHeight : SANDBOX_COLLAPSED_CHROME_HEIGHT_PX;

  return (
    <>
      <TrackingQueryWarningDialog
        isOpen={copyWarningOpen}
        onCancel={handleCancelRiskyCopy}
        onConfirm={handleConfirmRiskyCopy}
        confirmLabel="Copy without date filter"
        onEnableDateFilter={handleEnableDateFilterFromWarning}
      />
    <div
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!isVisible}
    >
      {isVisible && isExpanded ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize SQL sandbox height"
          aria-valuemin={SANDBOX_MIN_HEIGHT_PX}
          aria-valuemax={Math.floor(
            (typeof window !== 'undefined' ? window.innerHeight : 800) *
              SANDBOX_MAX_HEIGHT_VIEWPORT_RATIO,
          )}
          aria-valuenow={sandboxHeight}
          onMouseDown={handleResizeStart}
          title="Drag to resize SQL sandbox height"
          className={`group pointer-events-auto relative flex h-4 w-full shrink-0 cursor-row-resize items-center justify-center bg-slate-800/40 transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-slate-700 ${
            isResizing ? 'bg-sky-500/80' : ''
          }`}
        >
          <GripHorizontal
            className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-slate-300 opacity-60 transition-opacity duration-200 group-hover:opacity-100 dark:text-slate-400"
            aria-hidden
          />
        </div>
      ) : null}
      <div
        className={SANDBOX_SHELL_CLASS}
        style={{
          height: isExpanded ? `${expandedDrawerHeightPx}px` : 'auto',
          maxHeight: `${expandedDrawerHeightPx}px`,
        }}
      >
        <div className="h-0.5 w-full shrink-0 bg-blue-500" aria-hidden />

        <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col px-4 sm:px-6 lg:px-8">
          {/* Dashboard chrome — always visible */}
          <div
            className={`flex shrink-0 gap-3 border-b border-slate-100 dark:border-slate-800/80 ${
              isExpanded
                ? 'items-center justify-between py-3'
                : 'min-h-[72px] flex-col justify-center py-2 sm:flex-row sm:items-center sm:justify-between sm:py-3'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/60 bg-white text-blue-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-blue-400">
                <Terminal className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base dark:text-white">
                  SQL Sandbox
                </h2>
                {isExpanded ? (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {userSelectedTables.length} target
                    {userSelectedTables.length === 1 ? '' : 's'}
                    {architecture.joinSteps.length > 0 &&
                      ` · ${architecture.joinSteps.length} Pathfinder join step${architecture.joinSteps.length === 1 ? '' : 's'}`}
                    {bridgingTables.length > 0 &&
                      ` · ${bridgingTables.length} bridge${bridgingTables.length === 1 ? '' : 's'}`}
                  </p>
                ) : (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex shrink-0 items-center rounded-md bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-cyan-700 ring-1 ring-inset ring-cyan-500/20 dark:text-cyan-300 dark:ring-cyan-500/30">
                      {userSelectedTables.length}{' '}
                      {userSelectedTables.length === 1 ? 'table' : 'tables'}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-mono text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                      {sqlPreviewLine ||
                        (userSelectedTables.length > 0
                          ? 'Generating query preview…'
                          : 'Select canvas cards to build SQL')}
                    </p>
                    {showExpandHint && (
                      <span className="shrink-0 animate-pulse text-[10px] font-medium text-cyan-600 dark:text-cyan-400">
                        Open workspace →
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
              {isExpanded && userSelectedTables.length > 0 ? (
                <SelectColumnModeControl
                  compactSelect={compactSelect}
                  onChange={(value) => {
                    setManualSqlLocked(false);
                    onSandboxPreferencesChange({ compactSelect: value });
                  }}
                />
              ) : null}
              {isExpanded ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
                    copied
                      ? 'border-emerald-300/60 bg-gradient-to-b from-emerald-50 to-emerald-100/80 text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.12)] focus:ring-emerald-500/40 dark:border-emerald-600/50 dark:from-emerald-950/50 dark:to-emerald-950/30 dark:text-emerald-200'
                      : 'border-cyan-300/50 bg-gradient-to-b from-cyan-50 to-white text-cyan-950 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(6,182,212,0.12)] focus:ring-cyan-500/40 dark:border-cyan-600/50 dark:from-cyan-950/40 dark:to-slate-900 dark:text-cyan-100'
                  }`}
                  aria-live="polite"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Copy SQL</span>
                      <span className="sm:hidden">Copy</span>
                    </>
                  )}
                </button>
              ) : null}
              {isExpanded ? (
                <button
                  type="button"
                  onClick={handleMaximizeSandboxHeight}
                  className="rounded-xl border border-slate-200/60 bg-white/90 p-2 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/60 hover:bg-slate-50 hover:text-slate-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Maximize SQL sandbox height"
                  title="Maximize height (or drag the top edge)"
                >
                  <Maximize2 className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onExpandedChange(!isExpanded)}
                className="rounded-xl border border-slate-200/60 bg-white/90 p-2 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/60 hover:bg-slate-50 hover:text-slate-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse SQL sandbox' : 'Expand SQL sandbox'}
                title={isExpanded ? 'Collapse sandbox' : 'Expand sandbox'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" aria-hidden />
                ) : (
                  <ChevronUp className="h-5 w-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-2">
              {disconnectedWarnings.length > 0 ? (
                <div className="mx-0 mb-3 space-y-2">
                  {disconnectedWarnings.map(({ tableName, bridge }) => (
                    <div
                      key={tableName}
                      className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                      role="alert"
                    >
                      <Route className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <p>
                        <span className="font-mono font-semibold">{tableName}</span> can&apos;t be
                        connected to the current join path. Try adding{' '}
                        <span className="font-mono font-semibold">{bridge ?? '_Subscribers'}</span>{' '}
                        to your selection.
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-3 lg:gap-5 lg:overflow-hidden">
                {/* Left — query architecture & filters */}
                <aside
                  className={`scrollbar-card flex min-h-0 flex-col gap-4 lg:col-span-1 lg:overflow-y-auto ${SIDEBAR_COLUMN_CLASS}`}
                >
                  <p className="micro-label">Query architecture &amp; filters</p>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <Braces className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" aria-hidden />
                      SELECT fields
                      <span className={`ml-auto font-normal ${COUNT_BADGE_CLASS}`}>
                        {architecture.selectFields.length}
                      </span>
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                      {[...fieldsByTable.entries()].map(([tableName, fields]) => (
                        <div key={tableName}>
                          <p className={`font-mono text-[10px] font-semibold tracking-tight ${SYNTAX_TEXT_CLASS}`}>
                            {tableName}
                          </p>
                          <ul className="mt-0.5 space-y-0.5">
                            {fields.map((item) => (
                              <li
                                key={item.expression}
                                className="truncate rounded px-1.5 py-0.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                              >
                                <FieldExpressionLabel expression={item.expression} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <Database className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" aria-hidden />
                      Base target (FROM)
                    </div>
                    {architecture.rootTable ? (
                      <p className="font-mono text-sm">
                        <span className={getIdentifierSyntaxClass(architecture.rootTable)}>
                          {architecture.rootTable}
                        </span>{' '}
                        <span className="font-semibold text-violet-500 dark:text-violet-400">AS</span>{' '}
                        <span className={getIdentifierSyntaxClass(architecture.rootAlias)}>
                          {architecture.rootAlias}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">—</p>
                    )}
                    {bridgingTables.length > 0 && (
                      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-amber-700 dark:text-amber-300/90">
                        <Route className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        <span>
                          Pathfinder bridges:{' '}
                          <span className="font-mono font-medium">{bridgingTables.join(', ')}</span>
                        </span>
                      </p>
                    )}
                    {disconnectedTables.length > 0 && (
                      <p className="mt-2 text-[10px] leading-snug text-red-600 dark:text-red-400">
                        Unreachable:{' '}
                        <span className="font-mono">{disconnectedTables.join(', ')}</span>
                      </p>
                    )}
                  </section>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <GitBranch className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" aria-hidden />
                      Pathfinder join path
                    </div>
                    {architecture.joinSteps.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {architecture.rootTable
                          ? 'Single-table query — no joins required.'
                          : 'No joins.'}
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {architecture.joinSteps.map((step) => (
                          <li
                            key={`${step.order}-${step.table}`}
                            className="rounded-xl border border-slate-200/60 bg-white/60 px-2.5 py-2 dark:border-slate-700/50 dark:bg-slate-900/40"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {step.order}
                              </span>
                              <span className={`font-mono text-xs font-semibold tracking-tight ${getIdentifierSyntaxClass(step.table)}`}>
                                {step.table}
                              </span>
                              {step.isBridgingTable && (
                                <span className="rounded-full bg-gradient-to-r from-amber-500/10 to-amber-400/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                  bridge
                                </span>
                              )}
                              <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                                left join
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed">
                              <SqlSyntaxSnippet
                                text={`${step.joinType} JOIN ${step.table} ON ${step.conditions.join(' AND ')}`}
                              />
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="space-y-3">
                    <p className="micro-label">Performance &amp; Formatting</p>
                    <div className="space-y-2">
                      <UtilityToggle
                        id="limit-30-days"
                        label="Limit past 30 days"
                        description={formatUtilityPreview(
                          filterAlias
                            ? `${filterAlias}.EventDate >= DATEADD(day, -30, GETDATE())`
                            : 'EventDate >= DATEADD(day, -30, GETDATE())',
                        )}
                        checked={limitPast30Days}
                        onChange={(value) => onSandboxPreferencesChange({ limitPast30Days: value })}
                        icon={Calendar}
                      />
                      <UtilityToggle
                        id="filter-unique-events"
                        label="Filter unique behavioral events (IsUnique)"
                        description={
                          isUniqueEventFilterApplicable
                            ? formatUtilityPreview(uniqueEventFilterPreview)
                            : uniqueEventFilterPreview
                        }
                        plainDescription={!isUniqueEventFilterApplicable}
                        checked={isUniqueEventFilterActive}
                        disabled={!isUniqueEventFilterApplicable}
                        onChange={(value) =>
                          onSandboxPreferencesChange({ filterUniqueEvents: value })
                        }
                        icon={Hash}
                      />
                      <UtilityToggle
                        id="exclude-test-sends"
                        label="Exclude test send records"
                        description={formatUtilityPreview(
                          filterAlias
                            ? `${filterAlias}.TestStormObjID IS NULL`
                            : 'TestStormObjID IS NULL',
                        )}
                        checked={excludeTestSends}
                        onChange={(value) => onSandboxPreferencesChange({ excludeTestSends: value })}
                        icon={Shield}
                      />
                      <KeywordCaseToggle
                        value={keywordCase}
                        onChange={(value) => onSandboxPreferencesChange({ keywordCase: value })}
                      />
                      <UtilityToggle
                        id="include-target-de-scaffolding"
                        label="Include Automation Target Header"
                        description="Prepends target schema configurations and data binding rules."
                        checked={includeTargetDeScaffolding}
                        onChange={(value) =>
                          onSandboxPreferencesChange({ includeTargetDeScaffolding: value })
                        }
                        icon={FileText}
                      />
                    </div>

                    <p className="micro-label pt-1">Marketing Business Filters</p>
                    <div className="space-y-2">
                      <UtilityToggle
                        id="filter-active-subscribers"
                        label="Filter Active Subscribers Only"
                        description={formatUtilityPreview(
                          `AND ${buildActiveSubscriberPredicate(keywordCase)}`,
                        )}
                        checked={filterActiveSubscribersOnly}
                        onChange={(value) =>
                          onSandboxPreferencesChange({ filterActiveSubscribersOnly: value })
                        }
                        icon={Users}
                      />
                      {filterActiveSubscribersOnly && !subscribersInJoinPath && (
                        <p className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-[10px] leading-snug text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                          Could not auto-link <span className="font-mono">_Subscribers</span>{' '}
                          from the current selection. Choose a table with a subscriber join path.
                        </p>
                      )}
                      <CampaignJobIdFilter
                        checked={filterByCampaignJobId}
                        jobId={campaignJobId}
                        onCheckedChange={(value) =>
                          onSandboxPreferencesChange({ filterByCampaignJobId: value })
                        }
                        onJobIdChange={(value) =>
                          onSandboxPreferencesChange({ campaignJobId: value })
                        }
                        previewPredicate={formatUtilityPreview(
                          jobIdFilterAlias
                            ? `AND ${jobIdFilterAlias}.JobID = '${
                                campaignJobId.trim() || 'YOUR_ID'
                              }'`
                            : `AND JobID = '${campaignJobId.trim() || 'YOUR_ID'}'`,
                        )}
                      />
                    </div>
                  </section>
                </aside>

                {/* Right — SQL editor */}
                <section
                  className="flex min-h-0 flex-1 flex-col lg:col-span-2"
                  aria-label="SQL query editor"
                >
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800/60 dark:bg-slate-950 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                    <div className="h-0.5 w-full shrink-0 bg-blue-500" aria-hidden />
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#0d1117] px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-1 border-r border-slate-800/80 pr-2"
                            role="tablist"
                            aria-label="SQL editor mode"
                          >
                            <EditorTabButton
                              id="sql-tab-live"
                              label="Live Query"
                              isActive={editorTab === 'live'}
                              onClick={() => handleEditorTabChange('live')}
                            />
                            <EditorTabButton
                              id="sql-tab-templates"
                              label="Starter Templates"
                              icon={
                                <Zap className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
                              }
                              isActive={editorTab === 'templates'}
                              onClick={() => handleEditorTabChange('templates')}
                            />
                            <EditorTabButton
                              id="sql-tab-history"
                              label="History"
                              isActive={editorTab === 'history'}
                              onClick={() => handleEditorTabChange('history')}
                            />
                            <EditorTabButton
                              id="sql-tab-saved"
                              label="Saved"
                              icon={<Save className="h-3 w-3 shrink-0 text-sky-400/90" aria-hidden />}
                              isActive={editorTab === 'saved'}
                              onClick={() => handleEditorTabChange('saved')}
                            />
                          </div>
                          <QueryStudioTipIcon tip={QUERY_STUDIO_TIP} />
                          {activeTemplateId && (
                            <button
                              type="button"
                              onClick={handleBackToTemplates}
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                            >
                              <ArrowLeft className="h-3 w-3" aria-hidden />
                              Back to Templates
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {editorTab === 'live' && selectedTableNames.length > 0 && (
                            <SelectColumnModeControl
                              compactSelect={compactSelect}
                              onChange={(value) => {
                                setManualSqlLocked(false);
                                onSandboxPreferencesChange({ compactSelect: value });
                              }}
                            />
                          )}
                          {manualSqlLocked && editorTab === 'live' && (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                manual edit
                              </span>
                              <button
                                type="button"
                                onClick={handleSyncWithPathfinder}
                                className="rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                              >
                                Sync with Pathfinder
                              </button>
                            </div>
                          )}
                          {editorTab === 'live' &&
                            (limitPast30Days ||
                              isUniqueEventFilterActive ||
                              excludeTestSends ||
                              (filterActiveSubscribersOnly && subscribersInJoinPath) ||
                              campaignJobIdActive ||
                              includeTargetDeScaffolding) && (
                              <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                utilities active
                              </span>
                            )}
                          {(editorTab === 'live' || editorTab === 'saved') && (
                            <SaveQueryControl
                              title={defaultSavedQueryTitle}
                              sqlText={sql}
                              tableSelection={selectedTableNames}
                              segment={segment}
                              filterState={savedQueryFilterState}
                              onSaved={() => setSavedQueriesRefreshNonce((nonce) => nonce + 1)}
                              onSignInRequired={onSignInRequired}
                            />
                          )}
                          <button
                            type="button"
                            onClick={handleCopy}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${
                              copied
                                ? 'border-emerald-500/40 bg-emerald-600/90 text-white'
                                : 'border-slate-700/60 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                            }`}
                            aria-live="polite"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden />
                                Copy SQL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div
                        id="sql-editor-panel"
                        role="tabpanel"
                        aria-labelledby={
                          editorTab === 'live'
                            ? 'sql-tab-live'
                            : editorTab === 'history'
                              ? 'sql-tab-history'
                              : editorTab === 'saved'
                                ? 'sql-tab-saved'
                                : 'sql-tab-templates'
                        }
                        className={`m-2 flex min-h-0 flex-1 overflow-hidden rounded-md border border-slate-800/80 bg-[#0d1117] ${
                          showTemplateParametersPanel ? 'flex-row gap-2 p-2' : 'relative'
                        }`}
                      >
                        {showHistory ? (
                          <SandboxQueryHistory
                            onRestore={handleRestoreHistory}
                            refreshNonce={historyRefreshNonce}
                          />
                        ) : showSaved ? (
                          <SavedQueriesPanel
                            onRestore={onRestoreSavedQuery}
                            onSignInRequired={onSignInRequired}
                            refreshNonce={savedQueriesRefreshNonce}
                          />
                        ) : showTemplateLibrary ? (
                          <TemplateLibraryGrid onSelectTemplate={handleSelectTemplate} />
                        ) : showSqlEditor ? (
                          <>
                            {showTemplateParametersPanel ? (
                              <TemplateParametersPanel
                                templateTitle={activeTemplate?.title}
                                parameters={templateParameterDefinitions}
                                values={templateParamValues}
                                onValueChange={handleTemplateParameterChange}
                                className="w-full shrink-0 sm:w-52 lg:w-56"
                              />
                            ) : null}
                            <div
                              className={`flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                                showTemplateParametersPanel ? 'bg-[#010409]' : 'bg-[#0d1117]'
                              }`}
                            >
                              <SandboxSqlCodeMirror
                                value={sql}
                                onChange={handleSqlEditorChange}
                                readOnly={isSqlEditorReadOnly}
                                placeholder="Select data views to generate SQL, or paste a query from AI Copilot…"
                                schemaTables={schema}
                                completionTableNames={joinTables}
                                defaultCompletionTable={
                                  joinTables.length === 1 ? joinTables[0] : undefined
                                }
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
