import { useMemo } from 'react';
import type { DataViewTable } from '../data/sfmcSchema';

type SchemaGraphProps = {
  tables: DataViewTable[];
  selectedTableNames: Set<string>;
  onToggleSelect: (tableName: string) => void;
  hoveredRelation: { source: { table: string }; targets: { table: string }[] } | null;
};

type GraphNode = {
  name: string;
  category: DataViewTable['category'];
  x: number;
  y: number;
};

type GraphEdge = {
  from: string;
  to: string;
  label: string;
};

const CATEGORY_ORDER: DataViewTable['category'][] = [
  'Subscribers',
  'Sending',
  'Tracking',
  'Journey',
  'Automation',
  'Mobile',
  'Subscription',
  'SendLog',
  'GroupConnect',
  'Social',
  'Synchronized',
  'Other',
];

const CATEGORY_COLORS: Record<DataViewTable['category'], string> = {
  Subscribers: '#d97706',
  Sending: '#2563eb',
  Tracking: '#059669',
  Journey: '#7c3aed',
  Automation: '#0891b2',
  Mobile: '#db2777',
  Subscription: '#e11d48',
  SendLog: '#475569',
  GroupConnect: '#0d9488',
  Social: '#6366f1',
  Synchronized: '#a855f7',
  Other: '#64748b',
};

function buildLayout(tables: DataViewTable[]): GraphNode[] {
  const grouped = new Map<DataViewTable['category'], DataViewTable[]>();
  for (const table of tables) {
    const list = grouped.get(table.category) ?? [];
    list.push(table);
    grouped.set(table.category, list);
  }

  const nodes: GraphNode[] = [];
  let column = 0;

  for (const category of CATEGORY_ORDER) {
    const group = grouped.get(category);
    if (!group?.length) {
      continue;
    }
    group.forEach((table, row) => {
      nodes.push({
        name: table.name,
        category: table.category,
        x: 80 + column * 160,
        y: 60 + row * 52,
      });
    });
    column += 1;
  }

  return nodes;
}

function buildEdges(tables: DataViewTable[]): GraphEdge[] {
  const known = new Set(tables.map((table) => table.name));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const table of tables) {
    for (const field of table.fields) {
      for (const relation of field.relatesTo ?? []) {
        if (!known.has(relation.table)) {
          continue;
        }
        const key = [table.name, relation.table].sort().join('|');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        edges.push({
          from: table.name,
          to: relation.table,
          label: field.name,
        });
      }
    }
  }

  return edges;
}

export function SchemaGraph({
  tables,
  selectedTableNames,
  onToggleSelect,
  hoveredRelation,
}: SchemaGraphProps) {
  const nodes = useMemo(() => buildLayout(tables), [tables]);
  const edges = useMemo(() => buildEdges(tables), [tables]);
  const nodeByName = useMemo(
    () => new Map(nodes.map((node) => [node.name, node])),
    [nodes],
  );

  const width = Math.max(640, ...nodes.map((node) => node.x + 120));
  const height = Math.max(360, ...nodes.map((node) => node.y + 40));

  const highlightTables = useMemo(() => {
    if (!hoveredRelation) {
      return null;
    }
    return new Set([
      hoveredRelation.source.table,
      ...hoveredRelation.targets.map((target) => target.table),
    ]);
  }, [hoveredRelation]);

  return (
    <div className="w-full overflow-auto rounded-xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto min-h-[320px] w-full max-w-6xl"
        role="img"
        aria-label="Schema relationship graph"
      >
        {edges.map((edge) => {
          const from = nodeByName.get(edge.from);
          const to = nodeByName.get(edge.to);
          if (!from || !to) {
            return null;
          }
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const isHighlighted =
            highlightTables?.has(edge.from) && highlightTables.has(edge.to);
          return (
            <g key={`${edge.from}-${edge.to}-${edge.label}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? '#06b6d4' : '#94a3b8'}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.9 : 0.35}
              />
              <text
                x={midX}
                y={midY - 4}
                textAnchor="middle"
                className="fill-slate-500 text-[8px] font-mono"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const selected = selectedTableNames.has(node.name);
          const highlighted = highlightTables?.has(node.name) ?? false;
          const color = CATEGORY_COLORS[node.category];
          return (
            <g
              key={node.name}
              transform={`translate(${node.x - 56}, ${node.y - 18})`}
              className="cursor-pointer"
              onClick={() => onToggleSelect(node.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onToggleSelect(node.name);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${node.name}${selected ? ', selected' : ''}`}
            >
              <rect
                width={112}
                height={36}
                rx={8}
                fill={selected ? color : '#ffffff'}
                stroke={highlighted ? '#06b6d4' : selected ? color : '#cbd5e1'}
                strokeWidth={highlighted ? 2.5 : 1.5}
                className="dark:fill-slate-900"
              />
              <text
                x={56}
                y={16}
                textAnchor="middle"
                className={`text-[9px] font-mono font-semibold ${selected ? 'fill-white' : 'fill-slate-800 dark:fill-slate-100'}`}
              >
                {node.name}
              </text>
              <text
                x={56}
                y={28}
                textAnchor="middle"
                className={`text-[7px] uppercase tracking-wide ${selected ? 'fill-white/80' : 'fill-slate-500'}`}
              >
                {node.category}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center text-xs text-slate-500">
        Click a node to select or deselect — same as the card grid. Lines show field-level join keys.
      </p>
    </div>
  );
}
