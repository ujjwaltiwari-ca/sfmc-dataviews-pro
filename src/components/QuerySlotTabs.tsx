import { useState } from 'react';

type QuerySlotTabsProps = {
  activeIndex: number;
  labels: string[];
  onChange: (index: number) => void;
  onRename: (index: number, label: string) => void;
};

export function QuerySlotTabs({ activeIndex, labels, onChange, onRename }: QuerySlotTabsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (index: number) => {
    setEditingIndex(index);
    setEditValue(labels[index] ?? '');
  };

  const commitRename = (index: number) => {
    onRename(index, editValue);
    setEditingIndex(null);
  };

  return (
    <div
      className="flex items-center gap-1 border-r border-slate-800/80 pr-2"
      role="tablist"
      aria-label="Query workspace slots"
    >
      {labels.map((label, index) => (
        <div key={label} className="relative">
          {editingIndex === index ? (
            <input
              type="text"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onBlur={() => commitRename(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitRename(index);
                }
                if (event.key === 'Escape') {
                  setEditingIndex(null);
                }
              }}
              className="w-24 rounded-md border border-sky-500/50 bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-100"
              autoFocus
            />
          ) : (
            <button
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              onClick={() => onChange(index)}
              onDoubleClick={() => startRename(index)}
              className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                activeIndex === index
                  ? 'bg-sky-600/90 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              title="Double-click to rename"
            >
              {label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
