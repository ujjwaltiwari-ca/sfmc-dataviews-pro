import { lazy, Suspense } from 'react';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

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

const sqlEditorExtensions = [sql(), sandboxSqlScrollerTheme];

type SandboxSqlCodeMirrorProps = {
  value: string;
  onChange: (sql: string) => void;
  readOnly: boolean;
  placeholder?: string;
};

export function SandboxSqlCodeMirror({
  value,
  onChange,
  readOnly,
  placeholder,
}: SandboxSqlCodeMirrorProps) {
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
