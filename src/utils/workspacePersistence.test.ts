import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildWorkspaceSearchParams,
  buildWorkspaceShareUrl,
  hydrateWorkspaceState,
  persistWorkspaceState,
  WORKSPACE_STORAGE_KEYS,
} from './workspacePersistence';
import { encodeShareSql } from './workspaceShareSql.js';

describe('buildWorkspaceShareUrl', () => {
  it('builds an absolute URL with workspace query params', () => {
    const url = buildWorkspaceShareUrl({
      segment: 'core',
      selectedTableNames: ['_Sent', '_Open'],
      showSandbox: true,
      activeTemplateId: null,
      sandboxPreferences: {
        keywordCase: 'upper',
        compactSelect: true,
        limitPast30Days: false,
        filterUniqueEvents: true,
        excludeTestSends: false,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        includeTargetDeScaffolding: false,
        isSandboxExpanded: true,
        editorTab: 'live',
      },
    });

    expect(url).toMatch(/^https:\/\/dataviews\.pro\/\?/);
    const params = new URL(url).searchParams;
    expect(params.get('seg')).toBe('core');
    expect(params.get('t')).toBe('_Sent,_Open');
    expect(params.get('sb')).toBe('1');
    expect(params.get('sbe')).toBe('1');
  });

  it('matches buildWorkspaceSearchParams output', () => {
    const snapshot = {
      segment: 'sendlog' as const,
      selectedTableNames: ['SendLog'],
      showSandbox: true,
      activeTemplateId: null,
      sandboxPreferences: {
        keywordCase: 'upper' as const,
        compactSelect: true,
        limitPast30Days: false,
        filterUniqueEvents: true,
        excludeTestSends: false,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        includeTargetDeScaffolding: false,
        isSandboxExpanded: false,
        editorTab: 'live' as const,
      },
    };

    const expectedQuery = buildWorkspaceSearchParams(snapshot).toString();
    const url = buildWorkspaceShareUrl(snapshot);
    expect(url.endsWith(`?${expectedQuery}`)).toBe(true);
  });

  it('includes base64url sandbox SQL in share links', () => {
    const sql = 'SELECT SubscriberKey FROM _Sent';
    const encoded = encodeShareSql(sql);
    expect(encoded).toBeTruthy();

    const snapshot = {
      segment: 'core' as const,
      selectedTableNames: ['_Sent'],
      showSandbox: true,
      activeTemplateId: null,
      sandboxSql: sql,
      sandboxPreferences: {
        keywordCase: 'upper' as const,
        compactSelect: true,
        limitPast30Days: false,
        filterUniqueEvents: true,
        excludeTestSends: false,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        includeTargetDeScaffolding: false,
        isSandboxExpanded: true,
        editorTab: 'live' as const,
      },
    };

    const params = buildWorkspaceSearchParams(snapshot);
    expect(params.get('q')).toBe(encoded);

    const hydrated = hydrateWorkspaceState(new URLSearchParams(params.toString()));
    expect(hydrated.initialSharedSql).toBe(sql);
    expect(hydrated.showSandbox).toBe(true);
  });
});

describe('hydrateWorkspaceState session restore', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal('window', {
      location: { pathname: '/', search: '', origin: 'https://dataviews.pro' },
      history: { replaceState: vi.fn(), state: null },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores sandbox SQL from localStorage on a bare URL', () => {
    const sql = 'SELECT SubscriberKey FROM _Sent';
    persistWorkspaceState({
      segment: 'core',
      selectedTableNames: ['_Sent'],
      showSandbox: true,
      activeTemplateId: null,
      sandboxSql: sql,
      sandboxPreferences: {
        keywordCase: 'upper',
        compactSelect: true,
        limitPast30Days: true,
        filterUniqueEvents: true,
        excludeTestSends: true,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        includeTargetDeScaffolding: false,
        isSandboxExpanded: true,
        editorTab: 'live',
      },
    });

    const hydrated = hydrateWorkspaceState(new URLSearchParams());
    expect(hydrated.source).toBe('storage');
    expect(hydrated.initialSharedSql).toBe(sql);
    expect(hydrated.selectedTableNames).toEqual(['_Sent']);
    expect(hydrated.showSandbox).toBe(true);
    expect(storage.get(WORKSPACE_STORAGE_KEYS.sandboxSql)).toBeTruthy();
  });
});
