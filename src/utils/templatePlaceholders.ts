import { escapeSqlStringLiteral } from './sqlSanitize';

export type TemplateParameterInputType = 'text' | 'number';

export type TemplateParameterDefinition = {
  token: string;
  label: string;
  inputType: TemplateParameterInputType;
  defaultValue: string;
  placeholder: string;
};

/** `YOUR_*_HERE` tokens and explicit uppercase parameter names (e.g. LOOKBACK_DAYS). */
const YOUR_HERE_PATTERN = /\bYOUR_[A-Z0-9_]+_HERE\b/g;
const NAMED_PARAMETER_PATTERN = /\b(?:LOOKBACK_DAYS|LOOKBACK_HOURS|MIN_SEND_COUNT|MAX_ROWS)\b/g;

function collectMatches(sql: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  return [...sql.matchAll(globalPattern)].map((match) => match[0]);
}

/** Extracts unique placeholder tokens in source order. */
export function parseTemplatePlaceholders(sql: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const token of [
    ...collectMatches(sql, YOUR_HERE_PATTERN),
    ...collectMatches(sql, NAMED_PARAMETER_PATTERN),
  ]) {
    if (!seen.has(token)) {
      seen.add(token);
      ordered.push(token);
    }
  }

  return ordered;
}

export function inferTemplateParameterInputType(token: string): TemplateParameterInputType {
  if (token === 'YOUR_JOB_ID_HERE' || /KEY|EMAIL|NAME/i.test(token)) {
    return 'text';
  }
  if (/_DAYS$|_HOURS$|_COUNT$|_ROWS$|^LOOKBACK_|^MIN_|^MAX_/.test(token)) {
    return 'number';
  }
  return 'text';
}

/** Converts `YOUR_JOB_ID_HERE` → "Job ID", `LOOKBACK_DAYS` → "Lookback Days". */
export function placeholderTokenToLabel(token: string): string {
  let core = token;
  if (token.startsWith('YOUR_') && token.endsWith('_HERE')) {
    core = token.slice(5, -5);
  }

  return core
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function getDefaultParameterValue(token: string): string {
  if (token === 'YOUR_JOB_ID_HERE') {
    return '';
  }
  if (token === 'LOOKBACK_DAYS') {
    return '30';
  }
  if (token === 'LOOKBACK_HOURS') {
    return '24';
  }
  if (token === 'MIN_SEND_COUNT') {
    return '10';
  }
  if (token === 'MAX_ROWS') {
    return '1000';
  }
  return inferTemplateParameterInputType(token) === 'number' ? '0' : '';
}

export function getParameterPlaceholder(token: string, inputType: TemplateParameterInputType): string {
  if (token === 'YOUR_JOB_ID_HERE') {
    return 'e.g. 123456';
  }
  if (inputType === 'number') {
    return getDefaultParameterValue(token);
  }
  return 'Enter value…';
}

export function buildTemplateParameterDefinitions(tokens: string[]): TemplateParameterDefinition[] {
  return tokens.map((token) => {
    const inputType = inferTemplateParameterInputType(token);
    return {
      token,
      label: placeholderTokenToLabel(token),
      inputType,
      defaultValue: getDefaultParameterValue(token),
      placeholder: getParameterPlaceholder(token, inputType),
    };
  });
}

export function buildDefaultParameterValues(tokens: string[]): Record<string, string> {
  return Object.fromEntries(tokens.map((token) => [token, getDefaultParameterValue(token)]));
}

/** Substitutes placeholder tokens with user-supplied values (SQL-safe escaping for text). */
export function interpolateTemplateSql(
  baseSql: string,
  values: Record<string, string>,
): string {
  let result = baseSql;

  for (const [token, rawValue] of Object.entries(values)) {
    const trimmed = rawValue.trim();
    const replacement =
      inferTemplateParameterInputType(token) === 'number'
        ? trimmed.length > 0
          ? trimmed.replace(/[^\d-]/g, '') || getDefaultParameterValue(token)
          : getDefaultParameterValue(token)
        : escapeSqlStringLiteral(trimmed);

    result = result.split(token).join(replacement);
  }

  return result;
}
