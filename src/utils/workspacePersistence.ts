import { sfmcQueryTemplates } from '../data/queryTemplates';
import {
  getTablesForSegment,
  isViewSegmentId,
  VIEW_SEGMENT_STORAGE_KEY,
  type ViewSegmentId,
} from '../data/viewSegments';
import type { SqlKeywordCase } from './sqlGenerator';

export type SandboxEditorTab = 'live' | 'templates';

/** URL query parameter keys (shareable workspace). */
export const WORKSPACE_URL_KEYS = {
  segment: 'seg',
  tables: 't',
  sandboxOpen: 'sb',
  templateId: 'tpl',
  keywordCase: 'kc',
  limitPast30Days: 'd30',
  filterUniqueEvents: 'uq',
  excludeTestSends: 'xts',
  filterActiveSubscribers: 'act',
  filterByJobId: 'job',
  campaignJobId: 'jid',
  targetDeScaffolding: 'de',
  editorTab: 'tab',
  sandboxExpanded: 'sbe',
} as const;

export const WORKSPACE_STORAGE_KEYS = {
  segment: 'sfmc-ws-seg',
  tables: 'sfmc-ws-t',
  sandboxOpen: 'sfmc-ws-sb',
  templateId: 'sfmc-ws-tpl',
  preferences: 'sfmc-ws-prefs',
} as const;

const TEMPLATE_IDS = new Set(sfmcQueryTemplates.map((template) => template.id));

export type SandboxPreferences = {
  keywordCase: SqlKeywordCase;
  limitPast30Days: boolean;
  filterUniqueEvents: boolean;
  excludeTestSends: boolean;
  filterActiveSubscribersOnly: boolean;
  filterByCampaignJobId: boolean;
  campaignJobId: string;
  includeTargetDeScaffolding: boolean;
  isSandboxExpanded: boolean;
  editorTab: SandboxEditorTab;
};

export type WorkspaceHydrationSource = 'fresh-url' | 'url-or-storage';

export type WorkspaceHydration = {
  segment: ViewSegmentId;
  selectedTableNames: string[];
  showSandbox: boolean;
  activeTemplateId: string | null;
  sandboxPreferences: SandboxPreferences;
  /** SQL to seed the sandbox when hydrating from a shared template link. */
  initialTemplateSql: string | null;
  /** How this snapshot was resolved on load. */
  source: WorkspaceHydrationSource;
};

/** True when the address bar has no query string keys (e.g. `/` not `/ ?seg=core`). */
export function isWorkspaceUrlEmpty(
  searchParams: URLSearchParams = new URLSearchParams(window.location.search),
): boolean {
  return searchParams.toString() === '';
}

export const DEFAULT_SANDBOX_PREFERENCES: SandboxPreferences = {
  keywordCase: 'upper',
  limitPast30Days: false,
  filterUniqueEvents: true,
  excludeTestSends: false,
  filterActiveSubscribersOnly: false,
  filterByCampaignJobId: false,
  campaignJobId: '',
  includeTargetDeScaffolding: false,
  isSandboxExpanded: false,
  editorTab: 'live',
};

export type WorkspaceSnapshot = {
  segment: ViewSegmentId;
  selectedTableNames: string[];
  showSandbox: boolean;
  activeTemplateId: string | null;
  sandboxPreferences: SandboxPreferences;
};

function readLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    /* ignore quota / privacy mode */
  }
}

function readParam(
  params: URLSearchParams,
  key: string,
  storageKey: string,
): string | null {
  if (params.has(key)) {
    const value = params.get(key);
    return value === '' ? null : value;
  }
  return readLocalStorageItem(storageKey);
}

function parseFlag(value: string | null | undefined): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value === '1' || value === 'true') {
    return true;
  }
  if (value === '0' || value === 'false') {
    return false;
  }
  return null;
}

function parseKeywordCase(value: string | null | undefined): SqlKeywordCase | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'u' || normalized === 'upper') {
    return 'upper';
  }
  if (normalized === 'l' || normalized === 'lower') {
    return 'lower';
  }
  return null;
}

function parseEditorTab(value: string | null | undefined): SandboxEditorTab | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'live' || normalized === 'templates') {
    return normalized;
  }
  return null;
}

function parseTemplateId(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  const id = value.trim();
  return TEMPLATE_IDS.has(id) ? id : null;
}

function readLegacySegment(): ViewSegmentId | null {
  const legacy = readLocalStorageItem(VIEW_SEGMENT_STORAGE_KEY);
  if (legacy && isViewSegmentId(legacy)) {
    return legacy;
  }
  return null;
}

function readStoredPreferences(): Partial<SandboxPreferences> | null {
  const raw = readLocalStorageItem(WORKSPACE_STORAGE_KEYS.preferences);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SandboxPreferences>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function getValidTableNamesForSegment(segment: ViewSegmentId): Set<string> {
  return new Set(getTablesForSegment(segment).map((table) => table.name));
}

/** Parses comma-separated table names; drops unknown/duplicate/empty tokens. */
export function parseCommaSeparatedTables(
  raw: string | null | undefined,
  validNames: ReadonlySet<string>,
): string[] {
  if (!raw?.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(',')) {
    const name = part.trim();
    if (!name || seen.has(name) || !validNames.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }

  return result;
}

function resolveSegment(params: URLSearchParams): ViewSegmentId {
  const fromUrl = params.get(WORKSPACE_URL_KEYS.segment);
  if (fromUrl && isViewSegmentId(fromUrl)) {
    return fromUrl;
  }

  const fromStorage = readLocalStorageItem(WORKSPACE_STORAGE_KEYS.segment);
  if (fromStorage && isViewSegmentId(fromStorage)) {
    return fromStorage;
  }

  const legacy = readLegacySegment();
  return legacy ?? 'core';
}

function isDefaultSandboxPreferences(preferences: SandboxPreferences): boolean {
  return (Object.keys(DEFAULT_SANDBOX_PREFERENCES) as (keyof SandboxPreferences)[]).every(
    (key) => preferences[key] === DEFAULT_SANDBOX_PREFERENCES[key],
  );
}

export function isDefaultWorkspaceSnapshot(snapshot: WorkspaceSnapshot): boolean {
  return (
    snapshot.segment === 'core' &&
    snapshot.selectedTableNames.length === 0 &&
    snapshot.activeTemplateId === null &&
    !snapshot.showSandbox &&
    isDefaultSandboxPreferences(snapshot.sandboxPreferences)
  );
}

/** Removes persisted canvas / sandbox keys so a bare URL can start clean. */
export function clearWorkspaceStorage(): void {
  writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.segment, null);
  writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.tables, null);
  writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.sandboxOpen, null);
  writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.templateId, null);
  writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.preferences, null);
  writeLocalStorageItem(VIEW_SEGMENT_STORAGE_KEY, null);
}

export function hydrateDefaultWorkspaceState(): WorkspaceHydration {
  return {
    segment: 'core',
    selectedTableNames: [],
    showSandbox: false,
    activeTemplateId: null,
    sandboxPreferences: { ...DEFAULT_SANDBOX_PREFERENCES },
    initialTemplateSql: null,
    source: 'fresh-url',
  };
}

function mergeSandboxPreferences(
  params: URLSearchParams,
  storedPartial: Partial<SandboxPreferences> | null,
): SandboxPreferences {
  const storedPrefs = storedPartial ?? {};

  const keywordFromUrl = params.has(WORKSPACE_URL_KEYS.keywordCase)
    ? parseKeywordCase(params.get(WORKSPACE_URL_KEYS.keywordCase))
    : null;
  const keywordFromStorage = parseKeywordCase(
    typeof storedPrefs.keywordCase === 'string' ? storedPrefs.keywordCase : null,
  );

  const limitFromUrl = params.has(WORKSPACE_URL_KEYS.limitPast30Days)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.limitPast30Days))
    : null;
  const uniqueEventsFromUrl = params.has(WORKSPACE_URL_KEYS.filterUniqueEvents)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.filterUniqueEvents))
    : null;
  const excludeTestFromUrl = params.has(WORKSPACE_URL_KEYS.excludeTestSends)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.excludeTestSends))
    : null;
  const activeSubsFromUrl = params.has(WORKSPACE_URL_KEYS.filterActiveSubscribers)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.filterActiveSubscribers))
    : null;
  const jobFilterFromUrl = params.has(WORKSPACE_URL_KEYS.filterByJobId)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.filterByJobId))
    : null;
  const deFromUrl = params.has(WORKSPACE_URL_KEYS.targetDeScaffolding)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.targetDeScaffolding))
    : null;
  const expandedFromUrl = params.has(WORKSPACE_URL_KEYS.sandboxExpanded)
    ? parseFlag(params.get(WORKSPACE_URL_KEYS.sandboxExpanded))
    : null;
  const tabFromUrl = params.has(WORKSPACE_URL_KEYS.editorTab)
    ? parseEditorTab(params.get(WORKSPACE_URL_KEYS.editorTab))
    : null;

  const jobIdFromUrl = params.has(WORKSPACE_URL_KEYS.campaignJobId)
    ? (params.get(WORKSPACE_URL_KEYS.campaignJobId) ?? '').trim()
    : null;

  return {
    keywordCase:
      keywordFromUrl ??
      keywordFromStorage ??
      storedPrefs.keywordCase ??
      DEFAULT_SANDBOX_PREFERENCES.keywordCase,
    limitPast30Days:
      limitFromUrl ??
      storedPrefs.limitPast30Days ??
      DEFAULT_SANDBOX_PREFERENCES.limitPast30Days,
    filterUniqueEvents:
      uniqueEventsFromUrl ??
      storedPrefs.filterUniqueEvents ??
      DEFAULT_SANDBOX_PREFERENCES.filterUniqueEvents,
    excludeTestSends:
      excludeTestFromUrl ??
      storedPrefs.excludeTestSends ??
      DEFAULT_SANDBOX_PREFERENCES.excludeTestSends,
    filterActiveSubscribersOnly:
      activeSubsFromUrl ??
      storedPrefs.filterActiveSubscribersOnly ??
      DEFAULT_SANDBOX_PREFERENCES.filterActiveSubscribersOnly,
    filterByCampaignJobId:
      jobFilterFromUrl ??
      storedPrefs.filterByCampaignJobId ??
      DEFAULT_SANDBOX_PREFERENCES.filterByCampaignJobId,
    campaignJobId:
      jobIdFromUrl ??
      (typeof storedPrefs.campaignJobId === 'string'
        ? storedPrefs.campaignJobId
        : DEFAULT_SANDBOX_PREFERENCES.campaignJobId),
    includeTargetDeScaffolding:
      deFromUrl ??
      storedPrefs.includeTargetDeScaffolding ??
      DEFAULT_SANDBOX_PREFERENCES.includeTargetDeScaffolding,
    isSandboxExpanded:
      expandedFromUrl ??
      storedPrefs.isSandboxExpanded ??
      DEFAULT_SANDBOX_PREFERENCES.isSandboxExpanded,
    editorTab:
      tabFromUrl ??
      parseEditorTab(
        typeof storedPrefs.editorTab === 'string' ? storedPrefs.editorTab : undefined,
      ) ??
      DEFAULT_SANDBOX_PREFERENCES.editorTab,
  };
}

/** Hydrates workspace state. Empty URL → defaults only; otherwise URL → localStorage → defaults. */
export function hydrateWorkspaceState(
  searchParams: URLSearchParams = new URLSearchParams(window.location.search),
): WorkspaceHydration {
  if (isWorkspaceUrlEmpty(searchParams)) {
    clearWorkspaceStorage();
    return hydrateDefaultWorkspaceState();
  }

  const segment = resolveSegment(searchParams);
  const validNames = getValidTableNamesForSegment(segment);

  const tablesRaw = readParam(
    searchParams,
    WORKSPACE_URL_KEYS.tables,
    WORKSPACE_STORAGE_KEYS.tables,
  );
  const selectedTableNames = parseCommaSeparatedTables(tablesRaw, validNames);

  const sbRaw = readParam(
    searchParams,
    WORKSPACE_URL_KEYS.sandboxOpen,
    WORKSPACE_STORAGE_KEYS.sandboxOpen,
  );
  const sbFlag = parseFlag(sbRaw);
  const showSandbox = sbFlag ?? false;

  const templateRaw = readParam(
    searchParams,
    WORKSPACE_URL_KEYS.templateId,
    WORKSPACE_STORAGE_KEYS.templateId,
  );
  const activeTemplateId = parseTemplateId(templateRaw);

  const storedPrefs = readStoredPreferences();
  const sandboxPreferences = mergeSandboxPreferences(searchParams, storedPrefs);

  let resolvedEditorTab = sandboxPreferences.editorTab;
  if (activeTemplateId) {
    resolvedEditorTab = 'templates';
  }

  const resolvedPreferences: SandboxPreferences = {
    ...sandboxPreferences,
    editorTab: resolvedEditorTab,
    isSandboxExpanded:
      activeTemplateId !== null
        ? true
        : showSandbox && (sbFlag === true || sandboxPreferences.isSandboxExpanded),
  };

  const template = activeTemplateId
    ? sfmcQueryTemplates.find((item) => item.id === activeTemplateId)
    : undefined;

  const resolvedShowSandbox =
    showSandbox || selectedTableNames.length > 0 || activeTemplateId !== null;

  return {
    segment,
    selectedTableNames,
    showSandbox: resolvedShowSandbox,
    activeTemplateId,
    sandboxPreferences: resolvedPreferences,
    initialTemplateSql: template?.sql ?? null,
    source: 'url-or-storage',
  };
}

function isDefaultPreferenceValue<K extends keyof SandboxPreferences>(
  key: K,
  value: SandboxPreferences[K],
): boolean {
  return value === DEFAULT_SANDBOX_PREFERENCES[key];
}

export function buildWorkspaceSearchParams(snapshot: WorkspaceSnapshot): URLSearchParams {
  const params = new URLSearchParams();

  params.set(WORKSPACE_URL_KEYS.segment, snapshot.segment);

  if (snapshot.selectedTableNames.length > 0) {
    params.set(WORKSPACE_URL_KEYS.tables, snapshot.selectedTableNames.join(','));
  }

  const sandboxOpen =
    snapshot.showSandbox || snapshot.selectedTableNames.length > 0 || snapshot.activeTemplateId !== null;
  params.set(WORKSPACE_URL_KEYS.sandboxOpen, sandboxOpen ? '1' : '0');

  if (snapshot.activeTemplateId) {
    params.set(WORKSPACE_URL_KEYS.templateId, snapshot.activeTemplateId);
  }

  const prefs = snapshot.sandboxPreferences;

  if (!isDefaultPreferenceValue('keywordCase', prefs.keywordCase)) {
    params.set(WORKSPACE_URL_KEYS.keywordCase, prefs.keywordCase === 'upper' ? 'u' : 'l');
  }

  if (prefs.limitPast30Days) {
    params.set(WORKSPACE_URL_KEYS.limitPast30Days, '1');
  }

  if (!prefs.filterUniqueEvents) {
    params.set(WORKSPACE_URL_KEYS.filterUniqueEvents, '0');
  }

  if (prefs.excludeTestSends) {
    params.set(WORKSPACE_URL_KEYS.excludeTestSends, '1');
  }

  if (prefs.filterActiveSubscribersOnly) {
    params.set(WORKSPACE_URL_KEYS.filterActiveSubscribers, '1');
  }

  if (prefs.filterByCampaignJobId) {
    params.set(WORKSPACE_URL_KEYS.filterByJobId, '1');
  }

  if (prefs.campaignJobId.trim()) {
    params.set(WORKSPACE_URL_KEYS.campaignJobId, prefs.campaignJobId.trim());
  }

  if (prefs.includeTargetDeScaffolding) {
    params.set(WORKSPACE_URL_KEYS.targetDeScaffolding, '1');
  }

  if (prefs.editorTab === 'templates') {
    params.set(WORKSPACE_URL_KEYS.editorTab, 'templates');
  }

  if (prefs.isSandboxExpanded) {
    params.set(WORKSPACE_URL_KEYS.sandboxExpanded, '1');
  }

  return params;
}

export function persistWorkspaceState(snapshot: WorkspaceSnapshot): void {
  const isDefault = isDefaultWorkspaceSnapshot(snapshot);
  const params = isDefault ? new URLSearchParams() : buildWorkspaceSearchParams(snapshot);

  if (isDefault) {
    clearWorkspaceStorage();
  } else {
    writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.segment, snapshot.segment);
    writeLocalStorageItem(
      WORKSPACE_STORAGE_KEYS.tables,
      snapshot.selectedTableNames.length > 0 ? snapshot.selectedTableNames.join(',') : null,
    );
    writeLocalStorageItem(
      WORKSPACE_STORAGE_KEYS.sandboxOpen,
      snapshot.showSandbox ||
        snapshot.selectedTableNames.length > 0 ||
        snapshot.activeTemplateId !== null
        ? '1'
        : '0',
    );
    writeLocalStorageItem(WORKSPACE_STORAGE_KEYS.templateId, snapshot.activeTemplateId);
    writeLocalStorageItem(VIEW_SEGMENT_STORAGE_KEY, snapshot.segment);

    try {
      writeLocalStorageItem(
        WORKSPACE_STORAGE_KEYS.preferences,
        JSON.stringify(snapshot.sandboxPreferences),
      );
    } catch {
      /* ignore */
    }
  }

  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(window.history.state, '', nextUrl);
  }
}

export function filterTableNamesForSegment(
  tableNames: Iterable<string>,
  segment: ViewSegmentId,
): string[] {
  const valid = getValidTableNamesForSegment(segment);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of tableNames) {
    if (valid.has(name) && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}
