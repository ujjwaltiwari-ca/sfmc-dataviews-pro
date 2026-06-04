import { isCompactSelectFieldAllowed } from '../data/compactSelectFields.js';
import type { DataViewTable } from '../data/schemas/types.js';
import { sfmcDataViews } from '../data/sfmcSchema.js';

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

export type SqlJoinType = 'INNER' | 'LEFT';

/** SFMC-safe default — preserves driving rows when optional tracking or list data is missing. */
export const DEFAULT_SQL_JOIN_TYPE: SqlJoinType = 'LEFT';

export interface SqlJoinStepDetail {
  order: number;
  table: string;
  alias: string;
  conditions: string[];
  isBridgingTable: boolean;
  joinType: SqlJoinType;
  pairedTable: string;
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
  filterByCampaignJobId: boolean;
  campaignJobId: string;
  jobIdFilterAlias: string | null;
}

export interface SqlGenerationOptions {
  /** When true, ensures _Subscribers is linked into the BFS join path for status filtering. */
  requireSubscribersJoin?: boolean;
  /** When true, applies IsUnique = 1 on behavioral views that expose IsUnique (excludes _Sent). */
  filterUniqueEvents?: boolean;
  /** When true, emits essential columns per view instead of all schema fields. */
  compactSelect?: boolean;
}

const SUBSCRIBERS_TABLE = '_Subscribers';
const LIST_SUBSCRIBERS_TABLE = '_ListSubscribers';
const SMS_MESSAGE_TRACKING_TABLE = '_SMSMessageTracking';
const SMS_SUBSCRIPTION_LOG_TABLE = '_SMSSubscriptionLog';
const UNDELIVERABLE_SMS_TABLE = '_UndeliverableSMS';
const JOB_TABLE = '_Job';
const AUTOMATION_INSTANCE_TABLE = '_AutomationInstance';
const AUTOMATION_ACTIVITY_INSTANCE_TABLE = '_AutomationActivityInstance';
const JOB_JOIN_KEY_FIELD = 'JobID';

/** Triggered-send tokens must never appear in generated join ON clauses (NULL on standard sends). */
const JOIN_BLACKLISTED_FIELDS = new Set([
  'TriggererSendDefinitionObjectID',
  'TriggeredSendCustomerKey',
]);

/**
 * SFMC data view join rules (aligned with Salesforce docs, sfmarketing.cloud, and
 * Mateusz Dąbrowski’s system data view / SQL join guidance):
 *
 * - Tracking ↔ tracking (_Sent, _Open, _Click, _Bounce, _Complaint, _Unsubscribe):
 *   JobID + ListID + BatchID + SubscriberID (send grain). Optional IsUnique = 1 in WHERE/ON.
 * - Tracking ↔ _Job: JobID only (_Job has no subscriber grain).
 * - Tracking ↔ _Subscribers: SubscriberID (send grain).
 * - Tracking ↔ _ListSubscribers: SubscriberID + ListID (list membership grain).
 * - _ListSubscribers ↔ _Subscribers: SubscriberID (list membership grain).
 * - Default JOIN type: LEFT JOIN (preserve driving send rows).
 * - Never join on TriggererSendDefinitionObjectID / TriggeredSendCustomerKey for standard sends.
 */

/**
 * Behavioral tracking family — shares JobID + ListID + BatchID + SubscriberID quadrinity.
 * Tracking-to-tracking joins use only these keys; tracking-to-_Job uses JobID only.
 */
const BEHAVIORAL_TRACKING_FAMILY = new Set([
  '_Sent',
  '_Open',
  '_Click',
  '_Bounce',
  '_Complaint',
  '_Unsubscribe',
]);

const BEHAVIORAL_TRACKING_COMPOSITE_KEYS = [
  'JobID',
  'ListID',
  'BatchID',
  'SubscriberID',
] as const;

/** Required keys when mapping a behavioral tracking event to list membership. */
const TRACKING_TO_LIST_SUBSCRIBERS_KEYS = ['SubscriberID', 'ListID'] as const;

/** Tracking ↔ _Subscribers join key (send event subscriber ID). */
const TRACKING_TO_SUBSCRIBERS_JOIN_KEY = 'SubscriberID' as const;

/** Fields documented as placeholders only; excluded from generated SELECT lists. */
const SUBSCRIBERS_NON_QUERYABLE_FIELDS = new Set<string>();

/**
 * Behavioral family views with an IsUnique column (_Sent excluded — no IsUnique in schema).
 * Keeps unique-event filtering in lockstep with BEHAVIORAL_TRACKING_FAMILY.
 */
export const UNIQUE_EVENT_TRACKING_TABLE_NAMES = [...BEHAVIORAL_TRACKING_FAMILY].filter(
  (name) => name !== '_Sent',
);

const UNIQUE_EVENT_TRACKING_TABLES = new Set<string>(UNIQUE_EVENT_TRACKING_TABLE_NAMES);

export type SqlKeywordCase = 'upper' | 'lower';

/** Core SQL keywords emitted by the generator and utility filters. */
export const SQL_CORE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'INNER',
  'LEFT',
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

/**
 * Canonical short aliases for SFMC system data views.
 * Keys are lowercase table names for case-insensitive lookup.
 */
const SFMC_SYSTEM_TABLE_ALIASES: Readonly<Record<string, string>> = {
  // Core Email Tracking (strict 1-letter anchors; avoids OPEN reserved keyword)
  _sent: 's',
  _job: 'j',
  _open: 'o',
  _click: 'c',
  _bounce: 'b',
  _unsubscribe: 'u',
  _complaint: 'comp',

  // Core Directories & Lists
  _subscribers: 'sub',
  _listsubscribers: 'lsb',

  // MobileConnect & MobilePush Channels
  _smsmessagetracking: 'smt',
  _smssubscriptionlog: 'ssl',
  _undeliverablesms: 'usms',
  _pushaddresstext: 'padd',
  _pushaddress: 'padd',
  _pushmessagetracking: 'pmt',

  // Journey Builder Context
  _journey: 'jny',
  _journeyactivity: 'ja',

  // Advanced Automation & Health Execution
  _automationinstance: 'aut',
  _automationactivityinstance: 'aai',
  _fileuploadstatus: 'fus',

  // Premium Infrastructure & Multi-Org
  _enterpriseattribute: 'entattr',
  _businessunitunsubscribes: 'buunsub',
  _ftaf: 'ftaf',
};

const CUSTOM_TABLE_ALIAS_LENGTH = 4;

function normalizeTableNameLookupKey(tableName: string): string {
  return tableName.trim().toLowerCase();
}

/** 4-letter alias for canvas Data Extensions and other tables outside the system dictionary. */
function buildCustomTableAlias(tableName: string): string {
  let cleaned = tableName.trim();
  while (cleaned.startsWith('_')) {
    cleaned = cleaned.slice(1);
  }

  const alphanumeric = cleaned.replace(/[^A-Za-z0-9]/g, '');
  if (!alphanumeric) {
    return 'tbl';
  }

  return alphanumeric.slice(0, CUSTOM_TABLE_ALIAS_LENGTH).toLowerCase();
}

export function tableToAlias(tableName: string): string {
  const lookupKey = normalizeTableNameLookupKey(tableName);
  const systemAlias = SFMC_SYSTEM_TABLE_ALIASES[lookupKey];
  if (systemAlias) {
    return systemAlias;
  }

  return buildCustomTableAlias(tableName);
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

function isBehavioralTrackingFamilyTable(tableName: string): boolean {
  return BEHAVIORAL_TRACKING_FAMILY.has(tableName);
}

function isBehavioralTrackingFamilyJoin(tableA: string, tableB: string): boolean {
  return isBehavioralTrackingFamilyTable(tableA) && isBehavioralTrackingFamilyTable(tableB);
}

function buildBehavioralTrackingCompositeConditions(tableA: string, tableB: string): string[] {
  const aliasA = tableToAlias(tableA);
  const aliasB = tableToAlias(tableB);
  return BEHAVIORAL_TRACKING_COMPOSITE_KEYS.map(
    (key) => `${aliasA}.${key} = ${aliasB}.${key}`,
  );
}

function getBehavioralTrackingTableForListSubscribersJoin(
  tableA: string,
  tableB: string,
): string | null {
  if (tableA === LIST_SUBSCRIBERS_TABLE && isBehavioralTrackingFamilyTable(tableB)) {
    return tableB;
  }
  if (tableB === LIST_SUBSCRIBERS_TABLE && isBehavioralTrackingFamilyTable(tableA)) {
    return tableA;
  }
  return null;
}

function isTrackingToListSubscribersJoin(tableA: string, tableB: string): boolean {
  return getBehavioralTrackingTableForListSubscribersJoin(tableA, tableB) !== null;
}

function getBehavioralTrackingTableForSubscribersJoin(
  tableA: string,
  tableB: string,
): string | null {
  if (tableA === SUBSCRIBERS_TABLE && isBehavioralTrackingFamilyTable(tableB)) {
    return tableB;
  }
  if (tableB === SUBSCRIBERS_TABLE && isBehavioralTrackingFamilyTable(tableA)) {
    return tableA;
  }
  return null;
}

function isBehavioralTrackingToSubscribersJoin(tableA: string, tableB: string): boolean {
  return getBehavioralTrackingTableForSubscribersJoin(tableA, tableB) !== null;
}

function buildTrackingToSubscribersConditions(tableA: string, tableB: string): string[] {
  const trackingTable = getBehavioralTrackingTableForSubscribersJoin(tableA, tableB);
  if (!trackingTable) {
    return [];
  }
  const trackingAlias = tableToAlias(trackingTable);
  const subscribersAlias = tableToAlias(SUBSCRIBERS_TABLE);
  return [
    `${trackingAlias}.${TRACKING_TO_SUBSCRIBERS_JOIN_KEY} = ${subscribersAlias}.${TRACKING_TO_SUBSCRIBERS_JOIN_KEY}`,
  ];
}

function isListSubscribersToSubscribersJoin(tableA: string, tableB: string): boolean {
  return (
    (tableA === SUBSCRIBERS_TABLE && tableB === LIST_SUBSCRIBERS_TABLE) ||
    (tableB === SUBSCRIBERS_TABLE && tableA === LIST_SUBSCRIBERS_TABLE)
  );
}

function buildListSubscribersToSubscribersConditions(): string[] {
  const listAlias = tableToAlias(LIST_SUBSCRIBERS_TABLE);
  const subscribersAlias = tableToAlias(SUBSCRIBERS_TABLE);
  return [`${listAlias}.SubscriberID = ${subscribersAlias}.SubscriberID`];
}

function isSmsTrackingToSubscriptionLogJoin(tableA: string, tableB: string): boolean {
  return (
    (tableA === SMS_MESSAGE_TRACKING_TABLE && tableB === SMS_SUBSCRIPTION_LOG_TABLE) ||
    (tableB === SMS_MESSAGE_TRACKING_TABLE && tableA === SMS_SUBSCRIPTION_LOG_TABLE)
  );
}

function isSmsTrackingToUndeliverableJoin(tableA: string, tableB: string): boolean {
  return (
    (tableA === SMS_MESSAGE_TRACKING_TABLE && tableB === UNDELIVERABLE_SMS_TABLE) ||
    (tableB === SMS_MESSAGE_TRACKING_TABLE && tableA === UNDELIVERABLE_SMS_TABLE)
  );
}

function isSmsSubscriptionLogToUndeliverableJoin(tableA: string, tableB: string): boolean {
  return (
    (tableA === SMS_SUBSCRIPTION_LOG_TABLE && tableB === UNDELIVERABLE_SMS_TABLE) ||
    (tableB === SMS_SUBSCRIPTION_LOG_TABLE && tableA === UNDELIVERABLE_SMS_TABLE)
  );
}

function buildSmsTrackingToSubscriptionLogConditions(): string[] {
  const trackingAlias = tableToAlias(SMS_MESSAGE_TRACKING_TABLE);
  const logAlias = tableToAlias(SMS_SUBSCRIPTION_LOG_TABLE);
  return [`${trackingAlias}.Mobile = ${logAlias}.MobileNumber`];
}

function buildSmsMobileFieldPairConditions(
  tableA: string,
  fieldA: string,
  tableB: string,
  fieldB: string,
): string[] {
  const aliasA = tableToAlias(tableA);
  const aliasB = tableToAlias(tableB);
  return [`${aliasA}.${fieldA} = ${aliasB}.${fieldB}`];
}

function involvesSubscribersTable(tableA: string, tableB: string): boolean {
  return tableA === SUBSCRIBERS_TABLE || tableB === SUBSCRIBERS_TABLE;
}

/** _Subscribers is not joinable on SubscriberID in generated SQL. */
function isInvalidSubscribersJoinEdge(edge: SqlJoinEdge): boolean {
  if (edge.fromTable === SUBSCRIBERS_TABLE && edge.fromField === 'SubscriberID') {
    return true;
  }
  if (edge.toTable === SUBSCRIBERS_TABLE && edge.toField === 'SubscriberID') {
    return true;
  }
  return false;
}

function buildTrackingToListSubscribersConditions(tableA: string, tableB: string): string[] {
  const trackingTable = getBehavioralTrackingTableForListSubscribersJoin(tableA, tableB);
  if (!trackingTable) {
    return [];
  }
  const trackingAlias = tableToAlias(trackingTable);
  const listAlias = tableToAlias(LIST_SUBSCRIBERS_TABLE);
  return TRACKING_TO_LIST_SUBSCRIBERS_KEYS.map(
    (key) => `${trackingAlias}.${key} = ${listAlias}.${key}`,
  );
}

function involvesJobTable(tableA: string, tableB: string): boolean {
  return tableA === JOB_TABLE || tableB === JOB_TABLE;
}

function isBlacklistedJoinField(fieldName: string): boolean {
  return JOIN_BLACKLISTED_FIELDS.has(fieldName);
}

function isValidJobJoinEdge(edge: SqlJoinEdge): boolean {
  if (isBlacklistedJoinField(edge.fromField) || isBlacklistedJoinField(edge.toField)) {
    return false;
  }
  return edge.fromField === JOB_JOIN_KEY_FIELD && edge.toField === JOB_JOIN_KEY_FIELD;
}

/**
 * Resolves join type for a BFS step. All generated joins use LEFT JOIN by default to avoid
 * row loss from SFMC logging latency and nullable optional attributes (composite ON keys unchanged).
 */
export function resolveJoinTypeForTables(): SqlJoinType {
  return DEFAULT_SQL_JOIN_TYPE;
}

function getJoinConditionsBetween(
  tableA: string,
  tableB: string,
  edges: SqlJoinEdge[],
): string[] {
  if (isSmsTrackingToSubscriptionLogJoin(tableA, tableB)) {
    return buildSmsTrackingToSubscriptionLogConditions();
  }

  if (isSmsTrackingToUndeliverableJoin(tableA, tableB)) {
    return buildSmsMobileFieldPairConditions(
      SMS_MESSAGE_TRACKING_TABLE,
      'Mobile',
      UNDELIVERABLE_SMS_TABLE,
      'MobileNumber',
    );
  }

  if (isSmsSubscriptionLogToUndeliverableJoin(tableA, tableB)) {
    return buildSmsMobileFieldPairConditions(
      SMS_SUBSCRIPTION_LOG_TABLE,
      'MobileNumber',
      UNDELIVERABLE_SMS_TABLE,
      'MobileNumber',
    );
  }

  if (isBehavioralTrackingFamilyJoin(tableA, tableB)) {
    return buildBehavioralTrackingCompositeConditions(tableA, tableB);
  }

  if (isTrackingToListSubscribersJoin(tableA, tableB)) {
    return buildTrackingToListSubscribersConditions(tableA, tableB);
  }

  if (isBehavioralTrackingToSubscribersJoin(tableA, tableB)) {
    return buildTrackingToSubscribersConditions(tableA, tableB);
  }

  if (isListSubscribersToSubscribersJoin(tableA, tableB)) {
    return buildListSubscribersToSubscribersConditions();
  }

  const conditions: string[] = [];
  const restrictToJobIdOnly = involvesJobTable(tableA, tableB);
  const restrictSubscribersIdentity =
    involvesSubscribersTable(tableA, tableB) &&
    !isBehavioralTrackingToSubscribersJoin(tableA, tableB) &&
    !isListSubscribersToSubscribersJoin(tableA, tableB);

  for (const edge of edges) {
    if (restrictToJobIdOnly && !isValidJobJoinEdge(edge)) {
      continue;
    }

    if (restrictSubscribersIdentity && isInvalidSubscribersJoinEdge(edge)) {
      continue;
    }

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

/** Prefer _AutomationInstance as FROM root when paired with activity instances (LEFT JOIN semantics). */
function rootTablePreferenceForAutomationFamily(tableName: string, tableNames: string[]): number {
  const hasInstance = tableNames.includes(AUTOMATION_INSTANCE_TABLE);
  const hasActivity = tableNames.includes(AUTOMATION_ACTIVITY_INSTANCE_TABLE);
  if (!hasInstance || !hasActivity) {
    return 0;
  }
  if (tableName === AUTOMATION_INSTANCE_TABLE) {
    return -2;
  }
  if (tableName === AUTOMATION_ACTIVITY_INSTANCE_TABLE) {
    return 2;
  }
  return 0;
}

/** Prefer _Subscribers as FROM when paired with _ListSubscribers. */
function rootTablePreferenceForSubscriberListFamily(tableName: string, tableNames: string[]): number {
  const hasSubscribers = tableNames.includes(SUBSCRIBERS_TABLE);
  const hasListSubscribers = tableNames.includes(LIST_SUBSCRIBERS_TABLE);
  if (!hasSubscribers || !hasListSubscribers) {
    return 0;
  }
  if (tableName === SUBSCRIBERS_TABLE) {
    return -2;
  }
  if (tableName === LIST_SUBSCRIBERS_TABLE) {
    return 2;
  }
  return 0;
}

/** Prefer _SMSMessageTracking as FROM when other MobileConnect views are in the graph. */
function rootTablePreferenceForSmsFamily(tableName: string, tableNames: string[]): number {
  const hasTracking = tableNames.includes(SMS_MESSAGE_TRACKING_TABLE);
  if (!hasTracking) {
    return 0;
  }
  const hasOtherSms =
    tableNames.includes(SMS_SUBSCRIPTION_LOG_TABLE) ||
    tableNames.includes(UNDELIVERABLE_SMS_TABLE);
  if (!hasOtherSms) {
    return 0;
  }
  if (tableName === SMS_MESSAGE_TRACKING_TABLE) {
    return -2;
  }
  if (tableName === SMS_SUBSCRIPTION_LOG_TABLE || tableName === UNDELIVERABLE_SMS_TABLE) {
    return 2;
  }
  return 0;
}

/** Prefer behavioral tracking views as FROM root (LEFT JOIN semantics with _Job / _ListSubscribers). */
function rootTablePreferenceForTrackingFamily(tableName: string, tableNames: string[]): number {
  const hasBehavioralTracking = tableNames.some((name) => isBehavioralTrackingFamilyTable(name));
  if (!hasBehavioralTracking) {
    return 0;
  }

  if (isBehavioralTrackingFamilyTable(tableName)) {
    return -2;
  }
  if (tableName === JOB_TABLE || tableName === LIST_SUBSCRIBERS_TABLE) {
    return 2;
  }
  return 0;
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
    const smsFamilyPref =
      rootTablePreferenceForSmsFamily(a, tableNames) -
      rootTablePreferenceForSmsFamily(b, tableNames);
    if (smsFamilyPref !== 0) {
      return smsFamilyPref;
    }
    const subscriberListPref =
      rootTablePreferenceForSubscriberListFamily(a, tableNames) -
      rootTablePreferenceForSubscriberListFamily(b, tableNames);
    if (subscriberListPref !== 0) {
      return subscriberListPref;
    }
    const trackingFamilyPref =
      rootTablePreferenceForTrackingFamily(a, tableNames) -
      rootTablePreferenceForTrackingFamily(b, tableNames);
    if (trackingFamilyPref !== 0) {
      return trackingFamilyPref;
    }
    const automationFamilyPref =
      rootTablePreferenceForAutomationFamily(a, tableNames) -
      rootTablePreferenceForAutomationFamily(b, tableNames);
    if (automationFamilyPref !== 0) {
      return automationFamilyPref;
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
  pairedTable: string;
  conditions: string[];
  isBridgingTable: boolean;
  joinType: SqlJoinType;
}

/** Attach behavioral satellites before _Job metadata. */
function joinAttachmentPriority(tableName: string): number {
  if (tableName === JOB_TABLE) {
    return 10;
  }
  if (isBehavioralTrackingFamilyTable(tableName)) {
    return 0;
  }
  if (tableName === SUBSCRIBERS_TABLE || tableName === LIST_SUBSCRIBERS_TABLE) {
    return 5;
  }
  return 3;
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

    const remainingOrdered = [...remaining].sort(
      (a, b) => joinAttachmentPriority(a) - joinAttachmentPriority(b),
    );

    for (const nextTable of remainingOrdered) {
      for (const joinedTable of joined) {
        const conditions = getJoinConditionsBetween(joinedTable, nextTable, edges);
        if (conditions.length > 0) {
          steps.push({
            table: nextTable,
            pairedTable: joinedTable,
            conditions,
            isBridgingTable: bridgingTableNames.has(nextTable),
            joinType: resolveJoinTypeForTables(),
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

/** Documentation placeholders (e.g. profile attributes) are not valid SELECT identifiers. */
function isDocumentationPlaceholderField(fieldName: string): boolean {
  return fieldName.includes('(');
}

function tableNameToSelectAliasPrefix(tableName: string): string {
  return tableName.startsWith('_') ? tableName.slice(1) : tableName;
}

function buildSelectOutputAlias(tableName: string, fieldName: string): string {
  return `${tableNameToSelectAliasPrefix(tableName)}${fieldName}`;
}

/** Columns to prefix-alias when a tracking view drives the query. */
const PROACTIVE_TRACKING_SATELLITE_ALIAS_FIELDS = new Set([
  'Status',
  'SubscriberType',
  'DateUnsubscribed',
  'CreatedDate',
]);

function selectionIncludesTrackingRoot(userSelectedTableNames: string[]): boolean {
  return userSelectedTableNames.some(
    (name) => name === '_Sent' || isBehavioralTrackingFamilyTable(name),
  );
}

function shouldAliasSelectField(
  tableName: string,
  fieldName: string,
  userSelectedTableNames: string[],
  duplicateFieldNames: Set<string>,
): boolean {
  if (duplicateFieldNames.has(fieldName)) {
    return true;
  }
  if (userSelectedTableNames.length <= 1 || !selectionIncludesTrackingRoot(userSelectedTableNames)) {
    return false;
  }
  if (
    fieldName === 'EventDate' &&
    (tableName === '_Sent' || isBehavioralTrackingFamilyTable(tableName))
  ) {
    return true;
  }
  if (
    (tableName === SUBSCRIBERS_TABLE || tableName === LIST_SUBSCRIBERS_TABLE) &&
    PROACTIVE_TRACKING_SATELLITE_ALIAS_FIELDS.has(fieldName)
  ) {
    return true;
  }
  if (tableName === JOB_TABLE && fieldName === 'CreatedDate') {
    return true;
  }
  return false;
}

function collectDuplicateSelectFieldNames(
  userSelectedTableNames: string[],
  tables: DataViewTable[],
): Set<string> {
  const counts = new Map<string, number>();

  for (const tableName of userSelectedTableNames) {
    const table = getTableByName(tableName, tables);
    if (!table) {
      continue;
    }
    for (const field of table.fields) {
      if (isDocumentationPlaceholderField(field.name)) {
        continue;
      }
      if (
        tableName === SUBSCRIBERS_TABLE &&
        SUBSCRIBERS_NON_QUERYABLE_FIELDS.has(field.name)
      ) {
        continue;
      }
      counts.set(field.name, (counts.get(field.name) ?? 0) + 1);
    }
  }

  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([fieldName]) => fieldName),
  );
}

function buildSelectFields(
  userSelectedTableNames: string[],
  tables: DataViewTable[],
  options: SqlGenerationOptions = {},
): SqlSelectField[] {
  const fields: SqlSelectField[] = [];
  const duplicateFieldNames = collectDuplicateSelectFieldNames(userSelectedTableNames, tables);

  for (const tableName of userSelectedTableNames) {
    const table = getTableByName(tableName, tables);
    if (!table) {
      continue;
    }
    const alias = tableToAlias(tableName);
    for (const field of table.fields) {
      if (options.compactSelect && !isCompactSelectFieldAllowed(tableName, field.name)) {
        continue;
      }
      if (isDocumentationPlaceholderField(field.name)) {
        continue;
      }
      if (
        tableName === SUBSCRIBERS_TABLE &&
        SUBSCRIBERS_NON_QUERYABLE_FIELDS.has(field.name)
      ) {
        continue;
      }
      const expression = shouldAliasSelectField(
        tableName,
        field.name,
        userSelectedTableNames,
        duplicateFieldNames,
      )
        ? `${alias}.${field.name} AS ${buildSelectOutputAlias(tableName, field.name)}`
        : `${alias}.${field.name}`;
      fields.push({
        table: tableName,
        alias,
        field: field.name,
        expression,
      });
    }
  }

  return fields;
}

/** Removes leading `--` header comment lines for clipboard copy (executable SQL only). */
export function stripLeadingSqlComments(sql: string): string {
  const lines = sql.split('\n');
  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed === '' || trimmed.startsWith('--')) {
      index += 1;
      continue;
    }
    break;
  }
  return lines.slice(index).join('\n').trimStart();
}

/** Heavy tracking views that require EventDate lookback in high-volume BUs. */
export const HEAVY_TRACKING_VIEW_NAMES = ['_Open', '_Click', '_Sent', '_Bounce'] as const;

/** Matches _Open / [_Open] / FROM _Open (case-insensitive; optional T-SQL brackets). */
const HEAVY_TRACKING_VIEW_PATTERN =
  /(?:\[\s*)?_(?:Open|Click|Sent|Bounce)(?:\s*\])?(?![A-Za-z0-9_])/i;

/**
 * Filter-context date lookback — ignores EventDate in SELECT lists.
 * Matches EventDate comparisons, BETWEEN, and DATEADD(...).
 */
const DATE_LOOKBACK_PATTERN =
  /\bEventDate\s*(?:>=|<=|<>|!=|<|>|=)\b|\bEventDate\s+BETWEEN\b|\bdateadd\s*\(/i;

/**
 * Returns true when SQL references heavy tracking views without a date lookback filter.
 * Used by the sandbox editor to surface SFMC timeout risk before run.
 */
export function lacksTrackingViewDateLookback(sql: string): boolean {
  const normalized = stripLeadingSqlComments(sql).trim();
  if (!normalized) {
    return false;
  }
  return (
    HEAVY_TRACKING_VIEW_PATTERN.test(normalized) &&
    !DATE_LOOKBACK_PATTERN.test(normalized)
  );
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

/** IsUnique filter for deduplicated behavioral events (prevents multi-row fan-out). */
export function buildUniqueEventPredicate(tableName: string): string {
  return `${tableToAlias(tableName)}.IsUnique = 1`;
}

export function isUniqueEventTrackingTable(tableName: string): boolean {
  return UNIQUE_EVENT_TRACKING_TABLES.has(tableName);
}

function shouldApplyUniqueEventFilter(
  tableName: string,
  filterUniqueEvents: boolean | undefined,
): boolean {
  return Boolean(filterUniqueEvents) && isUniqueEventTrackingTable(tableName);
}

/** Tables in the resolved join graph that receive an IsUnique = 1 predicate when enabled. */
export function getUniqueEventTablesInJoinGraph(joinTableNames: string[]): string[] {
  return joinTableNames.filter((name) => isUniqueEventTrackingTable(name));
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
  const trimmedJobId = options.campaignJobId.trim();
  const applyJobIdFilter = options.filterByCampaignJobId && trimmedJobId.length > 0;

  if (
    !options.limitPast30Days &&
    !options.excludeTestSends &&
    !options.filterActiveSubscribersOnly &&
    !applyJobIdFilter
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

  if (applyJobIdFilter) {
    const escapedJobId = trimmedJobId.replace(/'/g, "''");
    predicates.push(
      options.jobIdFilterAlias
        ? `${options.jobIdFilterAlias}.JobID = '${escapedJobId}'`
        : `JobID = '${escapedJobId}'`,
    );
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
  const selectFields = buildSelectFields(userSelected, tables, options);
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
    const onConditions = [...step.conditions];
    if (shouldApplyUniqueEventFilter(step.table, options.filterUniqueEvents)) {
      onConditions.push(buildUniqueEventPredicate(step.table));
    }
    lines.push('LEFT JOIN');
    lines.push(`${SQL_INDENT}${step.table} AS ${alias}${bridgeNote}`);
    if (onConditions.length === 1) {
      lines.push(`    ON ${onConditions[0]}`);
    } else {
      lines.push(`    ON ${onConditions[0]}`);
      for (let i = 1; i < onConditions.length; i += 1) {
        lines.push(`    AND ${onConditions[i]}`);
      }
    }
  }

  for (const tableName of disconnectedTables) {
    const alias = tableToAlias(tableName);
    lines.push(`-- WARNING: No relatesTo path found for ${tableName}; add manually if needed.`);
    lines.push(`-- LEFT JOIN`);
    lines.push(`-- ${SQL_INDENT}${tableName} AS ${alias}`);
    lines.push(`-- ${SQL_INDENT}ON ...`);
  }

  const baseSql = formatGeneratedSql(lines);

  const joinSteps: SqlJoinStepDetail[] = steps.map((step, index) => {
    const conditions = [...step.conditions];
    if (shouldApplyUniqueEventFilter(step.table, options.filterUniqueEvents)) {
      conditions.push(buildUniqueEventPredicate(step.table));
    }
    return {
      order: index + 1,
      table: step.table,
      alias: tableToAlias(step.table),
      conditions,
      isBridgingTable: step.isBridgingTable,
      joinType: step.joinType,
      pairedTable: step.pairedTable,
    };
  });

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
