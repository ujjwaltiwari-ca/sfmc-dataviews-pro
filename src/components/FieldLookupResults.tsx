import type { FieldLookupResult } from '../utils/fieldLookup';
import { getFieldTypeSyntaxClass } from '../utils/typeSyntax';

type FieldLookupResultsProps = {
  results: FieldLookupResult[];
  fieldTerm: string;
  onSelectResult: (tableName: string) => void;
};

function formatFieldType(field: FieldLookupResult['field']): string {
  if (field.type === 'Text' && field.length !== undefined) {
    return `${field.type}(${field.length})`;
  }
  return field.type;
}

function keyLabel(field: FieldLookupResult['field']): string | null {
  if (field.isPrimaryKey) {
    return 'PK';
  }
  if (field.relatesTo?.length) {
    return 'FK';
  }
  if (field.isIndexed) {
    return 'IDX';
  }
  return null;
}

export function FieldLookupResults({
  results,
  fieldTerm,
  onSelectResult,
}: FieldLookupResultsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white/80 px-6 py-10 text-center dark:border-slate-800/60 dark:bg-slate-950/80">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          No fields matching &ldquo;{fieldTerm}&rdquo;
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Try a partial name like SubscriberID or JobID.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Field lookup · {results.length} result{results.length === 1 ? '' : 's'}
        </p>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {results.map(({ tableName, field, category }) => {
          const key = keyLabel(field);
          return (
            <li key={`${tableName}-${field.name}`}>
              <button
                type="button"
                onClick={() => onSelectResult(tableName)}
                className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {field.name}
                    </span>
                    <span className={getFieldTypeSyntaxClass(field)}>{formatFieldType(field)}</span>
                    {key ? (
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {key}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-cyan-700 dark:text-cyan-300">{tableName}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {field.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {category}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
