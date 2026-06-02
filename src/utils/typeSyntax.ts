import type { DataViewField } from '../data/sfmcSchema';

export const MONO_SYNTAX_BASE = 'font-mono text-xs font-semibold tracking-tight';

export const SYNTAX_NUMBER_CLASS = `${MONO_SYNTAX_BASE} text-blue-500 dark:text-blue-400`;
export const SYNTAX_DATE_CLASS = `${MONO_SYNTAX_BASE} text-emerald-600 dark:text-emerald-400`;
export const SYNTAX_TEXT_CLASS = `${MONO_SYNTAX_BASE} text-purple-500 dark:text-purple-400`;
export const SYNTAX_NEUTRAL_CLASS = `${MONO_SYNTAX_BASE} text-slate-500 dark:text-slate-400`;

export const MONO_EDITOR_TYPO =
  'font-mono text-xs leading-[1.65] tracking-normal sm:text-sm sm:leading-[1.65]';

export const IDE_DARK_EDITOR_ROOT = `${MONO_EDITOR_TYPO} text-[#e1e4e8]`;

/** VS Code / GitHub Dark — color-only token classes (inherit MONO_EDITOR_TYPO) */
export const SYNTAX_KEYWORD_EDITOR = 'font-medium text-sky-400';
export const SYNTAX_IDENTIFIER_EDITOR = 'text-[#e1e4e8]';
export const SYNTAX_COMMENT_EDITOR = 'font-normal italic text-slate-500';
export const SYNTAX_PUNCTUATION_EDITOR = 'text-slate-400';

/** Compact sidebar SQL previews (light panel, same 3-tone palette) */
export const SYNTAX_KEYWORD_LIGHT = 'font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400';
export const SYNTAX_IDENTIFIER_LIGHT = 'font-mono text-[10px] text-slate-700 dark:text-slate-300';
export const SYNTAX_COMMENT_LIGHT = 'font-mono text-[10px] font-normal italic text-slate-500';
export const SYNTAX_PUNCTUATION_LIGHT = 'font-mono text-[10px] text-slate-500';

export function getFieldTypeSyntaxClass(field: DataViewField): string {
  switch (field.type) {
    case 'Number':
    case 'Decimal':
      return SYNTAX_NUMBER_CLASS;
    case 'Date':
      return SYNTAX_DATE_CLASS;
    case 'Text':
      return SYNTAX_TEXT_CLASS;
    default:
      return SYNTAX_NEUTRAL_CLASS;
  }
}

const DATE_IDENTIFIER = /DATE|TIME|SCHED|PICKUP|DELIVERED|EVENT|JOINED|CREATED|MODIFIED/i;
const NUMBER_IDENTIFIER = /(?:^|\.)(?:.*(?:ID|Key|Count|Number|Num|Batch|Job|List|Account|Version|Activity))$/i;

export type SqlSyntaxTheme = 'card' | 'editor-dark' | 'editor-light';

/** Heuristic syntax class for SQL identifiers and field names in sidebar lists. */
export function getIdentifierSyntaxClass(
  identifier: string,
  theme: SqlSyntaxTheme = 'card',
): string {
  const name = identifier.includes('.') ? identifier.split('.').pop() ?? identifier : identifier;

  if (theme === 'editor-dark') {
    return SYNTAX_IDENTIFIER_EDITOR;
  }
  if (theme === 'editor-light') {
    return SYNTAX_IDENTIFIER_LIGHT;
  }
  if (DATE_IDENTIFIER.test(name)) {
    return SYNTAX_DATE_CLASS;
  }
  if (NUMBER_IDENTIFIER.test(name) || /^\d+$/.test(name)) {
    return SYNTAX_NUMBER_CLASS;
  }
  return SYNTAX_TEXT_CLASS;
}
