import { SlidersHorizontal } from 'lucide-react';
import type { TemplateParameterDefinition } from '../utils/templatePlaceholders';

const PANEL_CLASS =
  'flex min-h-0 flex-col rounded-md border border-slate-800/80 bg-[#0d1117] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

const FIELD_INPUT_CLASS =
  'w-full rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 font-mono text-xs text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.2)] placeholder:text-slate-500 transition-all duration-200 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20';

type TemplateParametersPanelProps = {
  templateTitle?: string;
  parameters: TemplateParameterDefinition[];
  values: Record<string, string>;
  onValueChange: (token: string, value: string) => void;
  className?: string;
};

export function TemplateParametersPanel({
  templateTitle,
  parameters,
  values,
  onValueChange,
  className = '',
}: TemplateParametersPanelProps) {
  if (parameters.length === 0) {
    return null;
  }

  return (
    <aside
      className={`${PANEL_CLASS} ${className}`}
      aria-label="Template parameters"
    >
      <div className="shrink-0 border-b border-slate-800/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Template parameters
            </p>
            {templateTitle ? (
              <p className="truncate text-[11px] font-medium text-slate-200">{templateTitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="scrollbar-card min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {parameters.map((parameter) => {
          const value = values[parameter.token] ?? parameter.defaultValue;
          const inputId = `template-param-${parameter.token}`;

          return (
            <div key={parameter.token} className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="block text-[11px] font-medium leading-snug text-slate-300"
              >
                {parameter.label}
              </label>
              <input
                id={inputId}
                type={parameter.inputType}
                inputMode={parameter.inputType === 'number' ? 'numeric' : 'text'}
                value={value}
                placeholder={parameter.placeholder}
                onChange={(event) => onValueChange(parameter.token, event.target.value)}
                className={FIELD_INPUT_CLASS}
              />
              <p className="font-mono text-[9px] text-slate-500">{parameter.token}</p>
            </div>
          );
        })}
      </div>

      <p className="shrink-0 border-t border-slate-800/80 px-3 py-2 text-[10px] leading-snug text-slate-500">
        Values inject into the query in real time. Copy SQL when ready for Query Studio.
      </p>
    </aside>
  );
}
