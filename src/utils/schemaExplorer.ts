import type { DataViewField, DataViewTable } from '../data/sfmcSchema';

export interface FieldRef {
  table: string;
  field: string;
}

export interface HoveredRelation {
  source: FieldRef;
  targets: FieldRef[];
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function fieldMatchesSearch(fieldName: string, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  return fieldName.toLowerCase().includes(normalizedQuery);
}

export function tableNameMatchesSearch(tableName: string, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  return tableName.toLowerCase().includes(normalizedQuery);
}

/** True when the query matches the data view name and/or any field on that table. */
export function tableMatchesSearch(table: DataViewTable, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  return (
    tableNameMatchesSearch(table.name, normalizedQuery) ||
    table.fields.some((field) => fieldMatchesSearch(field.name, normalizedQuery))
  );
}

export function buildHoveredRelation(tableName: string, field: DataViewField): HoveredRelation | null {
  if (!field.relatesTo?.length) {
    return null;
  }
  return {
    source: { table: tableName, field: field.name },
    targets: field.relatesTo.map((relation) => ({
      table: relation.table,
      field: relation.field,
    })),
  };
}

export function isSameFieldRef(a: FieldRef, table: string, fieldName: string): boolean {
  return a.table === table && a.field === fieldName;
}

export function isFieldRelationHighlighted(
  hoveredRelation: HoveredRelation | null,
  tableName: string,
  fieldName: string,
): boolean {
  if (!hoveredRelation) {
    return false;
  }
  if (isSameFieldRef(hoveredRelation.source, tableName, fieldName)) {
    return true;
  }
  return hoveredRelation.targets.some((target) => isSameFieldRef(target, tableName, fieldName));
}

export function findFieldsPointingTo(targetTable: string, targetField: string, tables: DataViewTable[]): FieldRef[] {
  const sources: FieldRef[] = [];
  for (const table of tables) {
    for (const field of table.fields) {
      const pointsToTarget = field.relatesTo?.some(
        (relation) => relation.table === targetTable && relation.field === targetField,
      );
      if (pointsToTarget) {
        sources.push({ table: table.name, field: field.name });
      }
    }
  }
  return sources;
}

export function buildRelationHighlight(
  tableName: string,
  field: DataViewField,
  tables: DataViewTable[],
): HoveredRelation | null {
  const direct = buildHoveredRelation(tableName, field);
  if (direct) {
    return direct;
  }

  const inbound = findFieldsPointingTo(tableName, field.name, tables);
  if (inbound.length === 0) {
    return null;
  }

  return {
    source: { table: tableName, field: field.name },
    targets: inbound,
  };
}
