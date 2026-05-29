import { automationDataViews } from './automation';
import { groupConnectDataViews } from './groupConnect';
import { journeyDataViews } from './journey';
import { mobileDataViews } from './mobile';
import { otherDataViews } from './other';
import { sendingDataViews } from './sending';
import { socialDataViews } from './social';
import { subscriberDataViews } from './subscribers';
import { subscriptionDataViews } from './subscription';
import { trackingDataViews } from './tracking';
import type { DataViewTable } from './types';

export type { DataViewCategory, DataViewField, DataViewTable } from './types';

export { subscriberDataViews } from './subscribers';
export { subscriptionDataViews } from './subscription';
export { sendingDataViews } from './sending';
export { trackingDataViews } from './tracking';
export { journeyDataViews } from './journey';
export { automationDataViews } from './automation';
export { mobileDataViews } from './mobile';
export { groupConnectDataViews } from './groupConnect';
export { socialDataViews } from './social';
export { otherDataViews } from './other';
export { sendLogDataViews } from './sendLog';
export { synchronizedDeDataViews } from './synchronizedDe';

/** All SFMC system data views in display order. */
export const sfmcDataViews: DataViewTable[] = [
  ...subscriberDataViews,
  ...subscriptionDataViews,
  ...sendingDataViews,
  ...trackingDataViews,
  ...journeyDataViews,
  ...automationDataViews,
  ...mobileDataViews,
  ...groupConnectDataViews,
  ...socialDataViews,
  ...otherDataViews,
];
