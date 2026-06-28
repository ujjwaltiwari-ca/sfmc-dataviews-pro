import { AlertTriangle, Check, Circle, Minus } from 'lucide-react';
import {
  assessSqlCopyReadiness,
  copyValidationSummary,
  type CopyValidationItem,
  type CopyValidationStatus,
} from '../utils/sqlCopyValidation';
import type { SandboxPreferences } from '../utils/workspacePersistence';

type CopyValidationPanelProps = {
  sql: string;
  selectedTableNames: readonly string[];
  preferences: Pick<SandboxPreferences, 'limitPast30Days' | 'excludeTestSends'>;
  disconnectedTables: readonly string[];
};

function StatusIcon({ status }: { status: CopyValidationStatus }) {
  if (status === 'pass') {
    return <Check className="h-3 w-3 text-emerald-400" aria-hidden />;
  }
  if (status === 'warn') {
    return <AlertTriangle className="h-3 w-3 text-amber-400" aria-hidden />;
  }
  if (status === 'fail') {
    return <AlertTriangle className="h-3 w-3 text-red-400" aria-hidden />;
  }
  return <Minus className="h-3 w-3 text-slate-500" aria-hidden />;
}

function ValidationRow({ item }: { item: CopyValidationItem }) {
  if (item.status === 'na') {
    return null;
  }
  return (
    <li className="flex items-start gap-2 text-[10px] leading-snug text-slate-300">
      <StatusIcon status={item.status} />
      <span>
        <span className="font-medium">{item.label}</span>
        {item.detail ? <span className="block text-slate-500">{item.detail}</span> : null}
      </span>
    </li>
  );
}

export function CopyValidationPanel({
  sql,
  selectedTableNames,
  preferences,
  disconnectedTables,
}: CopyValidationPanelProps) {
  const items = assessSqlCopyReadiness({
    sql,
    selectedTableNames,
    preferences,
    disconnectedTables,
  });
  const summary = copyValidationSummary(items);
  const visible = items.filter((item) => item.status !== 'na');

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 ${
        summary.hasFail
          ? 'border-red-500/30 bg-red-950/20'
          : summary.hasWarn
            ? 'border-amber-500/30 bg-amber-950/20'
            : 'border-emerald-500/30 bg-emerald-950/20'
      }`}
    >
      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Circle className="h-2 w-2 fill-current" aria-hidden />
        Copy readiness
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <ValidationRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

export { assessSqlCopyReadiness, copyValidationSummary };
