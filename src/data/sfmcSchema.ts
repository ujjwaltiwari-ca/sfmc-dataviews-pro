export type { DataViewCategory, DataViewField, DataViewTable } from './schemas/types.js';

export {
  automationDataViews,
  groupConnectDataViews,
  journeyDataViews,
  mobileDataViews,
  mobilePushDataViews,
  otherDataViews,
  sendLogDataViews,
  sendingDataViews,
  sfmcDataViews,
  socialDataViews,
  subscriberDataViews,
  subscriptionDataViews,
  synchronizedDeDataViews,
  trackingDataViews,
} from './schemas/index.js';

export type { ViewSegmentId } from './viewSegments.js';
export {
  dedupeTablesByName,
  getTablesForSegment,
  VIEW_SEGMENTS,
  VIEW_SEGMENT_STORAGE_KEY,
  readViewSegmentPreference,
} from './viewSegments.js';
