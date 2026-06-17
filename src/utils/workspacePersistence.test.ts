import { describe, expect, it } from 'vitest';
import { buildWorkspaceSearchParams, buildWorkspaceShareUrl } from './workspacePersistence';

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
});
