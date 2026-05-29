export type { DataViewCategory, DataViewField, DataViewTable } from './schemas/types';

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
} from './schemas';

export type { ViewSegmentId } from './viewSegments';
export {
  dedupeTablesByName,
  getTablesForSegment,
  VIEW_SEGMENTS,
  VIEW_SEGMENT_STORAGE_KEY,
  readViewSegmentPreference,
} from './viewSegments';
