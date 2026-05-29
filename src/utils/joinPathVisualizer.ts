import type { SqlArchitecture } from './sqlGenerator';
import type { HoveredRelation } from './schemaExplorer';

export interface StructuralPathLink {
  fromTable: string;
  toTable: string;
}

export function buildStructuralPathsFromHoveredRelation(
  relation: HoveredRelation,
): StructuralPathLink[] {
  return relation.targets.map((target) => ({
    fromTable: relation.source.table,
    toTable: target.table,
  }));
}

export function buildStructuralPathsFromArchitecture(
  architecture: Pick<SqlArchitecture, 'rootTable' | 'joinSteps'>,
): StructuralPathLink[] {
  if (!architecture.rootTable || architecture.joinSteps.length === 0) {
    return [];
  }

  const links: StructuralPathLink[] = [];
  let previousTable = architecture.rootTable;

  for (const step of architecture.joinSteps) {
    links.push({
      fromTable: previousTable,
      toTable: step.table,
    });
    previousTable = step.table;
  }

  return links;
}

export function buildStructuralPathsForSelection(
  selectedTableNames: string[],
  architecture: Pick<SqlArchitecture, 'rootTable' | 'joinSteps'>,
): StructuralPathLink[] {
  if (selectedTableNames.length < 2) {
    return [];
  }
  return buildStructuralPathsFromArchitecture(architecture);
}

export function buildCubicBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const deltaX = to.x - from.x;
  const controlOffset = Math.max(48, Math.abs(deltaX) * 0.42);
  const c1x = from.x + controlOffset;
  const c1y = from.y;
  const c2x = to.x - controlOffset;
  const c2y = to.y;
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}
