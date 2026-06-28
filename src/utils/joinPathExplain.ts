import type { DataViewTable } from '../data/sfmcSchema';
import { sfmcDataViews } from '../data/sfmcSchema';
import type { SqlJoinStepDetail } from './sqlGenerator';
import { bfsShortestPath, buildSchemaAdjacency } from './sqlGenerator';

/** One-sentence explanation for why Pathfinder inserted a bridge table. */
export function explainBridgeTable(
  bridgeTable: string,
  userSelected: readonly string[],
  joinTables: readonly string[],
  tables: DataViewTable[] = sfmcDataViews,
): string {
  const graph = buildSchemaAdjacency(tables);
  const connected = userSelected.filter((name) => joinTables.includes(name) && name !== bridgeTable);

  for (const target of userSelected) {
    if (target === bridgeTable) {
      continue;
    }
    for (const source of connected) {
      if (source === target) {
        continue;
      }
      const path = bfsShortestPath(source, target, graph);
      if (path && path.includes(bridgeTable) && path.length > 2) {
        return `Pathfinder routed ${source} → ${target} through ${bridgeTable} — no direct join key links your selection.`;
      }
    }
  }

  return `Pathfinder added ${bridgeTable} to connect tables that do not share a direct foreign-key path.`;
}

export function explainJoinStep(step: SqlJoinStepDetail, userSelected: readonly string[]): string | null {
  if (!step.isBridgingTable) {
    return null;
  }
  const keys = step.conditions
    .map((condition) => condition.split('=')[0]?.trim().split('.').pop())
    .filter(Boolean);
  const keyHint = keys.length > 0 ? ` via ${keys.slice(0, 2).join(', ')}` : '';
  const targets = userSelected.filter((name) => name !== step.table);
  if (targets.length >= 2) {
    return `Bridge between ${targets.slice(0, 2).join(' and ')}${keyHint}.`;
  }
  return `Intermediate hop to reach your selected tables${keyHint}.`;
}
