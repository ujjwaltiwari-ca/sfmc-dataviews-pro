import { lazy, Suspense, useMemo } from 'react';
import { completeFromList, ifNotIn } from '@codemirror/autocomplete';
import { MSSQL, sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import type { DataViewTable } from '../data/sfmcSchema';
import {
  buildSqlCompletionSchema,
  SFMC_SQL_FUNCTION_COMPLETIONS,
} from '../utils/sqlEditorSchema';

const sfmcFunctionCompletionSource = ifNotIn(
  ['QuotedIdentifier', 'String', 'LineComment', 'BlockComment', '.'],
  completeFromList([...SFMC_SQL_FUNCTION_COMPLETIONS]),
);

const LazyCodeMirror = lazy(() =>
  import('@uiw/react-codemirror').then((module) => ({ default: module.default })),
);

const sandboxSqlScrollerTheme = EditorView.theme({
  '&': {
    height: '100%',
    maxHeight: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
    minHeight: 0,
  },
});

type SandboxSqlCodeMirrorProps = {
  value: string;
  onChange: (sql: string) => void;
  readOnly: boolean;
  placeholder?: string;
  /** SFMC tables in the current query graph (for column autocomplete). */
  completionTableNames?: readonly string[];
  schemaTables?: readonly DataViewTable[];
  /** When the query uses one table, allow completing columns without a prefix. */
  defaultCompletionTable?: string;
};

export function SandboxSqlCodeMirror({
  value,
  onChange,
  readOnly,
  placeholder,
  completionTableNames = [],
  schemaTables = [],
  defaultCompletionTable,
}: SandboxSqlCodeMirrorProps) {
  const sqlEditorExtensions = useMemo(() => {
    const completionSchema = buildSqlCompletionSchema(schemaTables, completionTableNames);
    const hasSchema = Object.keys(completionSchema).length > 0;

    return [
      sql({
        dialect: MSSQL,
        upperCaseKeywords: true,
        ...(hasSchema ? { schema: completionSchema } : {}),
        ...(defaultCompletionTable ? { defaultTable: defaultCompletionTable } : {}),
      }),
      MSSQL.language.data.of({
        autocomplete: sfmcFunctionCompletionSource,
      }),
      sandboxSqlScrollerTheme,
    ];
  }, [schemaTables, completionTableNames, defaultCompletionTable]);
  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div
            className="flex flex-1 items-center justify-center rounded-md border border-slate-800/60 bg-[#0d1117] text-sm text-slate-500"
            aria-busy="true"
          >
            Loading editor…
          </div>
        }
      >
        <LazyCodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={sqlEditorExtensions}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            bracketMatching: true,
          }}
          className="sandbox-sql-codemirror flex-1 min-h-0 overflow-auto rounded-md border border-slate-800/60 text-base"
          aria-label="SQL query editor"
        />
      </Suspense>
    </div>
  );
}
