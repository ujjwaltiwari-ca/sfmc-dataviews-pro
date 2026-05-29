import type { DataViewTable } from '../data/sfmcSchema';
import { sfmcDataViews } from '../data/sfmcSchema';

export interface SqlJoinEdge {
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
}

export interface SqlSelectField {
  table: string;
  alias: string;
  field: string;
  expression: string;
}

export interface SqlJoinStepDetail {
  order: number;
  table: string;
  alias: string;
  conditions: string[];
  isBridgingTable: boolean;
}

export interface SqlArchitecture {
  selectFields: SqlSelectField[];
  rootTable: string;
  rootAlias: string;
  joinSteps: SqlJoinStepDetail[];
}

export interface SqlGenerationResult {
  sql: string;
  baseSql: string;
  isEmpty: boolean;
  userSelectedTables: string[];
  bridgingTables: string[];
  joinTables: string[];
  disconnectedTables: string[];
  architecture: SqlArchitecture;
  /** Best alias for EventDate / test-send filters when present in the graph. */
  filterAlias: string | null;
}

export interface SqlUtilityFilterOptions {
  limitPast30Days: boolean;
  excludeTestSends: boolean;
  filterActiveSubscribersOnly: boolean;
}

export interface SqlGenerationOptions {
  /** When true, ensures _Subscribers is linked into the BFS join path for status filtering. */
  requireSubscribersJoin?: boolean;
}

const SUBSCRIBERS_TABLE = '_Subscribers';

export type SqlKeywordCase = 'upper' | 'lower';

/** Core SQL keywords emitted by the generator and utility filters. */
export const SQL_CORE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'INNER',
  'JOIN',
  'ON',
  'AS',
  'IS',
  'NULL',
  'DATEADD',
  'GETDATE',
] as const;

const SQL_CORE_KEYWORD_SET = new Set<string>(SQL_CORE_KEYWORDS);

function applyKeywordCaseToSegment(segment: string, keywordCase: SqlKeywordCase): string {
  let result = '';
  let index = 0;

  while (index < segment.length) {
    const rest = segment.slice(index);
    const wordMatch = /^[A-Za-z_][\w]*/.exec(rest);
    if (wordMatch) {
      const word = wordMatch[0];
      const upper = word.toUpperCase();
      if (SQL_CORE_KEYWORD_SET.has(upper)) {
        result += keywordCase === 'upper' ? upper : upper.toLowerCase();
      } else {
        result += word;
      }
      index += word.length;
      continue;
    }

    result += segment[index];
    index += 1;
  }

  return result;
}

function applyKeywordCaseToLine(line: string, keywordCase: SqlKeywordCase): string {
  let result = '';
  let index = 0;

  while (index < line.length) {
    if (line.startsWith('--', index)) {
      result += applyKeywordCaseToSegment(line.slice(index), keywordCase);
      break;
    }

    if (line[index] === "'") {
      let end = index + 1;
      while (end < line.length && line[end] !== "'") {
        end += 1;
      }
      result += line.slice(index, end + 1);
      index = end + 1;
      continue;
    }

    const rest = line.slice(index);
    const wordMatch = /^[A-Za-z_][\w]*/.exec(rest);
    if (wordMatch) {
      const word = wordMatch[0];
      const upper = word.toUpperCase();
      if (SQL_CORE_KEYWORD_SET.has(upper)) {
        result += keywordCase === 'upper' ? upper : upper.toLowerCase();
      } else {
        result += word;
      }
      index += word.length;
      continue;
    }

    result += line[index];
    index += 1;
  }

  return result;
}

/** Rewrites core SQL keywords to the requested case without touching identifiers or string literals. */
export function applySqlKeywordCase(sql: string, keywordCase: SqlKeywordCase): string {
  if (keywordCase === 'upper') {
    return sql;
  }

  return sql
    .split('\n')
    .map((line) => applyKeywordCaseToLine(line, keywordCase))
    .join('\n');
}

const SCAFFOLD_DIVIDER = '-- ========================================================';

function formatScaffoldingProse(text: string, keywordCase: SqlKeywordCase): string {
  return keywordCase === 'upper' ? text.toUpperCase() : text.toLowerCase();
}

/** Builds the Automation Studio target DE header block for prepending to generated SQL. */
export function buildTargetDeScaffolding(
  rootTable: string,
  keywordCase: SqlKeywordCase = 'upper',
): string {
  const targetObject = `${rootTable}_Target_Log`;
  const title = formatScaffoldingProse('Automation Target Data Extension Configuration', keywordCase);
  const targetLabel = formatScaffoldingProse('Target Object', keywordCase);
  const actionLabel = formatScaffoldingProse('Action Type', keywordCase);
  const actionValue = formatScaffoldingProse('Update / Overwrite', keywordCase);
  const schemaLabel = formatScaffoldingProse('Required Field Binding Schema', keywordCase);
  const primaryKeyNote = formatScaffoldingProse('Mark As Primary Key', keywordCase);

  return [
    SCAFFOLD_DIVIDER,
    `-- ${title}`,
    `-- ${targetLabel}: ${targetObject}`,
    `-- ${actionLabel}: ${actionValue}`,
    '--',
    `-- ${schemaLabel}:`,
    `--   * SubscriberKey (Text) -> [${primaryKeyNote}]`,
    '--   * EventDate (Date)',
    SCAFFOLD_DIVIDER,
  ].join('\n');
}

/** Prepends the target DE scaffolding comment block above the generated query. */
export function applyTargetDeScaffolding(
  sql: string,
  rootTable: string,
  keywordCase: SqlKeywordCase = 'upper',
  enabled = true,
): string {
  if (!enabled || !rootTable.trim()) {
    return sql;
  }

  return `${buildTargetDeScaffolding(rootTable, keywordCase)}\n${sql}`;
}


/** Prefer these bridges when multiple equal-length paths exist. */
const BRIDGE_TABLE_PRIORITY: string[] = [
  '_Sent',
  '_Job',
  '_Subscribers',
  '_ListSubscribers',
  '_Open',
  '_Click',
  '_Bounce',
  '_Unsubscribe',
  '_Journey',
  '_JourneyActivity',
  '_SMSMessageTracking',
  '_SMSSubscriptionLog',
  '_PushAddress',
  '_PushTag',
  '_AutomationInstance',
  '_AutomationActivityInstance',
];

export function tableToAlias(tableName: string): string {
  const stripped = tableName.startsWith('_') ? tableName.slice(1) : tableName;
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

function getTableByName(tableName: string, tables: DataViewTable[]): DataViewTable | undefined {
  return tables.find((table) => table.name === tableName);
}

function bridgePriority(tableName: string): number {
  const index = BRIDGE_TABLE_PRIORITY.indexOf(tableName);
  return index === -1 ? BRIDGE_TABLE_PRIORITY.length : index;
}

export function buildSchemaAdjacency(
  tables: DataViewTable[] = sfmcDataViews,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const table of tables) {
    if (!graph.has(table.name)) {
      graph.set(table.name, new Set());
    }
    for (const field of table.fields) {
      if (!field.relatesTo) {
        continue;
      }
      for (const relation of field.relatesTo) {
        if (!graph.has(relation.table)) {
          graph.set(relation.table, new Set());
        }
        graph.get(table.name)?.add(relation.table);
        graph.get(relation.table)?.add(table.name);
      }
    }
  }

  return graph;
}

export function bfsShortestPath(
  startTable: string,
  endTable: string,
  graph: Map<string, Set<string>>,
): string[] | null {
  if (startTable === endTable) {
    return [startTable];
  }
  if (!graph.has(startTable) || !graph.has(endTable)) {
    return null;
  }

  const queue: string[] = [startTable];
  const visited = new Set<string>([startTable]);
  const parent = new Map<string, string | null>([[startTable, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endTable) {
      const path: string[] = [];
      let node: string | null = endTable;
      while (node !== null) {
        path.unshift(node);
        node = parent.get(node) ?? null;
      }
      return path;
    }

    const neighbors = [...(graph.get(current) ?? [])].sort(
      (a, b) => bridgePriority(a) - bridgePriority(b),
    );

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      parent.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  return null;
}

export interface ResolvedJoinTables {
  joinTables: string[];
  bridgingTables: string[];
  disconnectedTables: string[];
}

/**
 * Expands user-selected tables with intermediate bridges (BFS) so all
 * selections lie on one connected join graph when possible.
 */
export function resolveJoinTablesWithBridges(
  userSelectedTableNames: string[],
  tables: DataViewTable[] = sfmcDataViews,
): ResolvedJoinTables {
  const userSelected = [...new Set(userSelectedTableNames)];

  if (userSelected.length <= 1) {
    return {
      joinTables: userSelected,
      bridgingTables: [],
      disconnectedTables: [],
    };
  }

  const graph = buildSchemaAdjacency(tables);
  const allNeeded = new Set<string>(userSelected);
  const connected = new Set<string>([userSelected[0]]);
  const unconnected = new Set(userSelected.slice(1));
  const disconnectedTables = new Set<string>();

  while (unconnected.size > 0) {
    let bestPath: string[] | null = null;
    let bestTarget: string | null = null;

    for (const target of unconnected) {
      for (const source of connected) {
        const path = bfsShortestPath(source, target, graph);
        if (!path) {
          continue;
        }
        if (!bestPath || path.length < bestPath.length) {
          bestPath = path;
          bestTarget = target;
        } else if (bestPath && path.length === bestPath.length) {
          const pathBridgeCount = path.filter((name) => !userSelected.includes(name)).length;
          const bestBridgeCount = bestPath.filter((name) => !userSelected.includes(name)).length;
          if (
            pathBridgeCount < bestBridgeCount ||
            (pathBridgeCount === bestBridgeCount &&
              bridgePriority(path[1] ?? path[0]) < bridgePriority(bestPath[1] ?? bestPath[0]))
          ) {
            bestPath = path;
            bestTarget = target;
          }
        }
      }
    }

    if (!bestPath || bestTarget === null) {
      for (const remaining of unconnected) {
        disconnectedTables.add(remaining);
      }
      break;
    }

    for (const tableName of bestPath) {
      allNeeded.add(tableName);
      connected.add(tableName);
    }
    unconnected.delete(bestTarget);
  }

  const joinTables = tables.map((table) => table.name).filter((name) => allNeeded.has(name));
  const bridgingTables = joinTables.filter((name) => !userSelected.includes(name));

  return {
    joinTables,
    bridgingTables,
    disconnectedTables: [...disconnectedTables],
  };
}

/**
 * When a utility requires a table that is not yet in the join graph, find the
 * shortest BFS path from any connected table and merge it into the join set.
 */
export function ensureRequiredTableInJoinPath(
  joinTableNames: string[],
  requiredTable: string,
  tables: DataViewTable[] = sfmcDataViews,
): { joinTables: string[]; additionalBridgingTables: string[]; requiredTableLinked: boolean } {
  if (joinTableNames.length === 0) {
    return { joinTables: joinTableNames, additionalBridgingTables: [], requiredTableLinked: false };
  }

  if (joinTableNames.includes(requiredTable)) {
    return { joinTables: joinTableNames, additionalBridgingTables: [], requiredTableLinked: true };
  }

  const graph = buildSchemaAdjacency(tables);
  let bestPath: string[] | null = null;

  for (const source of joinTableNames) {
    const path = bfsShortestPath(source, requiredTable, graph);
    if (!path) {
      continue;
    }
    if (!bestPath || path.length < bestPath.length) {
      bestPath = path;
      continue;
    }
    if (path.length === bestPath.length) {
      const pathBridgeCount = path.filter((name) => !joinTableNames.includes(name)).length;
      const bestBridgeCount = bestPath.filter((name) => !joinTableNames.includes(name)).length;
      if (
        pathBridgeCount < bestBridgeCount ||
        (pathBridgeCount === bestBridgeCount &&
          bridgePriority(path[1] ?? path[0]) < bridgePriority(bestPath[1] ?? bestPath[0]))
      ) {
        bestPath = path;
      }
    }
  }

  if (!bestPath) {
    return { joinTables: joinTableNames, additionalBridgingTables: [], requiredTableLinked: false };
  }

  const allNeeded = new Set([...joinTableNames, ...bestPath]);
  const joinTables = tables.map((table) => table.name).filter((name) => allNeeded.has(name));
  const additionalBridgingTables = joinTables.filter((name) => !joinTableNames.includes(name));

  return {
    joinTables,
    additionalBridgingTables,
    requiredTableLinked: joinTables.includes(requiredTable),
  };
}

export function collectJoinEdges(
  tableNamesForJoin: string[],
  tables: DataViewTable[] = sfmcDataViews,
): SqlJoinEdge[] {
  const included = new Set(tableNamesForJoin);
  const edges: SqlJoinEdge[] = [];
  const seen = new Set<string>();

  for (const table of tables) {
    if (!included.has(table.name)) {
      continue;
    }
    for (const field of table.fields) {
      if (!field.relatesTo) {
        continue;
      }
      for (const relation of field.relatesTo) {
        if (!included.has(relation.table)) {
          continue;
        }
        const edgeKey = [table.name, field.name, relation.table, relation.field].sort().join('|');
        if (seen.has(edgeKey)) {
          continue;
        }
        seen.add(edgeKey);
        edges.push({
          fromTable: table.name,
          fromField: field.name,
          toTable: relation.table,
          toField: relation.field,
        });
      }
    }
  }

  return edges;
}

function getJoinConditionsBetween(
  tableA: string,
  tableB: string,
  edges: SqlJoinEdge[],
): string[] {
  const conditions: string[] = [];

  for (const edge of edges) {
    if (edge.fromTable === tableA && edge.toTable === tableB) {
      conditions.push(
        `${tableToAlias(tableA)}.${edge.fromField} = ${tableToAlias(tableB)}.${edge.toField}`,
      );
    } else if (edge.fromTable === tableB && edge.toTable === tableA) {
      conditions.push(
        `${tableToAlias(tableB)}.${edge.fromField} = ${tableToAlias(tableA)}.${edge.toField}`,
      );
    }
  }

  return [...new Set(conditions)];
}

function pickRootTable(
  tableNames: string[],
  edges: SqlJoinEdge[],
  userSelected: Set<string>,
): string {
  const connectionCount = new Map<string, number>();
  for (const name of tableNames) {
    connectionCount.set(name, 0);
  }
  for (const edge of edges) {
    connectionCount.set(edge.fromTable, (connectionCount.get(edge.fromTable) ?? 0) + 1);
    connectionCount.set(edge.toTable, (connectionCount.get(edge.toTable) ?? 0) + 1);
  }

  const sorted = [...tableNames].sort((a, b) => {
    const aSelected = userSelected.has(a) ? 0 : 1;
    const bSelected = userSelected.has(b) ? 0 : 1;
    if (aSelected !== bSelected) {
      return aSelected - bSelected;
    }
    const diff = (connectionCount.get(b) ?? 0) - (connectionCount.get(a) ?? 0);
    if (diff !== 0) {
      return diff;
    }
    return bridgePriority(a) - bridgePriority(b);
  });

  return sorted[0] ?? tableNames[0];
}

interface JoinStep {
  table: string;
  conditions: string[];
  isBridgingTable: boolean;
}

function buildJoinSteps(
  joinTableNames: string[],
  bridgingTableNames: Set<string>,
  edges: SqlJoinEdge[],
  userSelected: Set<string>,
): { rootTable: string; steps: JoinStep[]; disconnected: string[] } {
  if (joinTableNames.length === 0) {
    return { rootTable: '', steps: [], disconnected: [] };
  }

  if (joinTableNames.length === 1) {
    return { rootTable: joinTableNames[0], steps: [], disconnected: [] };
  }

  const rootTable = pickRootTable(joinTableNames, edges, userSelected);
  const joined = new Set<string>([rootTable]);
  const remaining = new Set(joinTableNames.filter((name) => name !== rootTable));
  const steps: JoinStep[] = [];

  while (remaining.size > 0) {
    let attached = false;

    for (const nextTable of [...remaining]) {
      for (const joinedTable of joined) {
        const conditions = getJoinConditionsBetween(joinedTable, nextTable, edges);
        if (conditions.length > 0) {
          steps.push({
            table: nextTable,
            conditions,
            isBridgingTable: bridgingTableNames.has(nextTable),
          });
          joined.add(nextTable);
          remaining.delete(nextTable);
          attached = true;
          break;
        }
      }
      if (attached) {
        break;
      }
    }

    if (!attached) {
      break;
    }
  }

  return {
    rootTable,
    steps,
    disconnected: [...remaining],
  };
}

function buildSelectFields(
  userSelectedTableNames: string[],
  tables: DataViewTable[],
): SqlSelectField[] {
  const fields: SqlSelectField[] = [];

  for (const tableName of userSelectedTableNames) {
    const table = getTableByName(tableName, tables);
    if (!table) {
      continue;
    }
    const alias = tableToAlias(tableName);
    for (const field of table.fields) {
      fields.push({
        table: tableName,
        alias,
        field: field.name,
        expression: `${alias}.${field.name}`,
      });
    }
  }

  return fields;
}

const SQL_INDENT = '    ';

function buildSelectClause(selectFields: SqlSelectField[]): string {
  return selectFields.map((item) => `${SQL_INDENT}${item.expression}`).join(',\n');
}

function formatGeneratedSql(lines: string[]): string {
  return lines.join('\n');
}

function tableHasField(tableName: string, fieldName: string, tables: DataViewTable[]): boolean {
  const table = getTableByName(tableName, tables);
  return table?.fields.some((field) => field.name === fieldName) ?? false;
}

/** Prefer user-selected tables, then join order, for filter column qualification. */
export function resolveFilterAlias(
  userSelected: string[],
  joinTables: string[],
  tables: DataViewTable[],
  fieldNames: string[],
): string | null {
  const ordered = [...userSelected, ...joinTables.filter((name) => !userSelected.includes(name))];
  for (const fieldName of fieldNames) {
    for (const tableName of ordered) {
      if (tableHasField(tableName, fieldName, tables)) {
        return tableToAlias(tableName);
      }
    }
  }
  return null;
}

/** Builds the active-subscriber status predicate for utility filters. */
export function buildActiveSubscriberPredicate(keywordCase: SqlKeywordCase = 'upper'): string {
  const statusValue = keywordCase === 'upper' ? 'Active' : 'active';
  return `${tableToAlias(SUBSCRIBERS_TABLE)}.Status = '${statusValue}'`;
}

function appendWherePredicates(baseSql: string, predicates: string[]): string {
  if (predicates.length === 0) {
    return baseSql;
  }

  const predicateBlock = predicates.join('\n  AND ');
  const whereMatch = baseSql.match(/\nWHERE\s+([\s\S]*?)(?=\n--|\n*$)/i);

  if (whereMatch) {
    const existing = whereMatch[1].trim();
    return baseSql.replace(whereMatch[0], `\nWHERE ${existing}\n  AND ${predicateBlock}`);
  }

  return `${baseSql}\nWHERE ${predicateBlock}`;
}

export function applySqlUtilityFilters(
  baseSql: string,
  options: SqlUtilityFilterOptions,
  filterAlias: string | null,
  keywordCase: SqlKeywordCase = 'upper',
): string {
  if (
    !options.limitPast30Days &&
    !options.excludeTestSends &&
    !options.filterActiveSubscribersOnly
  ) {
    return baseSql;
  }

  const predicates: string[] = [];

  if (options.limitPast30Days) {
    predicates.push(
      filterAlias
        ? `${filterAlias}.EventDate >= DATEADD(day, -30, GETDATE())`
        : 'EventDate >= DATEADD(day, -30, GETDATE())',
    );
  }

  if (options.excludeTestSends) {
    predicates.push(
      filterAlias ? `${filterAlias}.TestStormObjID IS NULL` : 'TestStormObjID IS NULL',
    );
  }

  if (options.filterActiveSubscribersOnly) {
    predicates.push(buildActiveSubscriberPredicate(keywordCase));
  }

  return appendWherePredicates(baseSql, predicates);
}

export function generateSfmcSql(
  userSelectedTableNames: string[],
  tables: DataViewTable[] = sfmcDataViews,
  options: SqlGenerationOptions = {},
): SqlGenerationResult {
  const userSelected = tables
    .map((table) => table.name)
    .filter((name) => userSelectedTableNames.includes(name));

  if (userSelected.length === 0) {
    return {
      sql: '-- Select one or more data view cards to generate SQL.',
      baseSql: '-- Select one or more data view cards to generate SQL.',
      isEmpty: true,
      userSelectedTables: [],
      bridgingTables: [],
      joinTables: [],
      disconnectedTables: [],
      architecture: {
        selectFields: [],
        rootTable: '',
        rootAlias: '',
        joinSteps: [],
      },
      filterAlias: null,
    };
  }

  const { joinTables: resolvedJoinTables, bridgingTables: resolvedBridging, disconnectedTables: unresolvedFromBfs } =
    resolveJoinTablesWithBridges(userSelected, tables);

  let joinTables = resolvedJoinTables;
  let bridgingTables = [...resolvedBridging];

  if (options.requireSubscribersJoin) {
    const ensured = ensureRequiredTableInJoinPath(joinTables, SUBSCRIBERS_TABLE, tables);
    joinTables = ensured.joinTables;
    if (ensured.additionalBridgingTables.length > 0) {
      bridgingTables = [...new Set([...bridgingTables, ...ensured.additionalBridgingTables])];
    }
  }

  const bridgingSet = new Set(bridgingTables);
  const userSelectedSet = new Set(userSelected);
  const edges = collectJoinEdges(joinTables, tables);
  const selectFields = buildSelectFields(userSelected, tables);
  const selectClause = buildSelectClause(selectFields);
  const { rootTable, steps, disconnected: disconnectedFromJoin } = buildJoinSteps(
    joinTables,
    bridgingSet,
    edges,
    userSelectedSet,
  );

  const disconnectedTables = [
    ...new Set([...unresolvedFromBfs, ...disconnectedFromJoin]),
  ].filter((name) => userSelected.includes(name));

  const lines: string[] = [
    `-- Selected: ${userSelected.join(', ')}`,
  ];

  if (bridgingTables.length > 0) {
    lines.push(
      `-- Bridging table(s) auto-added to connect your selection: ${bridgingTables.join(', ')}`,
    );
  }

  const rootAlias = tableToAlias(rootTable);

  lines.push('SELECT');
  lines.push(selectClause);
  lines.push('FROM');
  lines.push(`${SQL_INDENT}${rootTable} AS ${rootAlias}`);

  for (const step of steps) {
    const alias = tableToAlias(step.table);
    const bridgeNote = step.isBridgingTable ? ' -- bridge' : '';
    lines.push('INNER JOIN');
    lines.push(`${SQL_INDENT}${step.table} AS ${alias}${bridgeNote}`);
    if (step.conditions.length === 1) {
      lines.push(`    ON ${step.conditions[0]}`);
    } else {
      lines.push(`    ON ${step.conditions[0]}`);
      for (let i = 1; i < step.conditions.length; i += 1) {
        lines.push(`    AND ${step.conditions[i]}`);
      }
    }
  }

  for (const tableName of disconnectedTables) {
    const alias = tableToAlias(tableName);
    lines.push(`-- WARNING: No relatesTo path found for ${tableName}; add manually if needed.`);
    lines.push(`-- INNER JOIN`);
    lines.push(`-- ${SQL_INDENT}${tableName} AS ${alias}`);
    lines.push(`-- ${SQL_INDENT}ON ...`);
  }

  const baseSql = formatGeneratedSql(lines);
  const joinSteps: SqlJoinStepDetail[] = steps.map((step, index) => ({
    order: index + 1,
    table: step.table,
    alias: tableToAlias(step.table),
    conditions: step.conditions,
    isBridgingTable: step.isBridgingTable,
  }));

  const filterAlias = resolveFilterAlias(
    userSelected,
    joinTables,
    tables,
    ['EventDate', 'TestStormObjID'],
  );

  return {
    sql: baseSql,
    baseSql,
    isEmpty: false,
    userSelectedTables: userSelected,
    bridgingTables,
    joinTables,
    disconnectedTables,
    architecture: {
      selectFields,
      rootTable,
      rootAlias,
      joinSteps,
    },
    filterAlias,
  };
}
