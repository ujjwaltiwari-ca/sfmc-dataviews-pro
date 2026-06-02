import { automationDataViews } from './automation.js';
import { groupConnectDataViews } from './groupConnect.js';
import { journeyDataViews } from './journey.js';
import { mobileDataViews } from './mobile.js';
import { mobilePushDataViews } from './mobilePush.js';
import { otherDataViews } from './other.js';
import { sendingDataViews } from './sending.js';
import { socialDataViews } from './social.js';
import { subscriberDataViews } from './subscribers.js';
import { subscriptionDataViews } from './subscription.js';
import { trackingDataViews } from './tracking.js';
import type { DataViewTable } from './types.js';

export type { DataViewCategory, DataViewField, DataViewTable } from './types.js';

export { subscriberDataViews } from './subscribers.js';
export { subscriptionDataViews } from './subscription.js';
export { sendingDataViews } from './sending.js';
export { trackingDataViews } from './tracking.js';
export { journeyDataViews } from './journey.js';
export { automationDataViews } from './automation.js';
export { mobileDataViews } from './mobile.js';
export { mobilePushDataViews } from './mobilePush.js';
export { groupConnectDataViews } from './groupConnect.js';
export { socialDataViews } from './social.js';
export { otherDataViews } from './other.js';
export { sendLogDataViews } from './sendLog.js';
export { synchronizedDeDataViews } from './synchronizedDe.js';

function uniqueTablesByName(tables: DataViewTable[]): DataViewTable[] {
  const seen = new Set<string>();
  return tables.filter((table) => {
    if (seen.has(table.name)) {
      return false;
    }
    seen.add(table.name);
    return true;
  });
}

/**
 * Canvas display priority — popular / high-traffic data views first.
 * Field definitions and categories are unchanged; only array position shifts.
 */
const DATA_VIEW_DISPLAY_ORDER: readonly string[] = [
  // Tier 1 — Core tracking & engagement
  '_Subscribers',
  '_Sent',
  '_Job',
  '_Open',
  '_Click',
  '_Unsubscribe',
  '_Bounce',
  '_ListSubscribers',
  // Tier 2 — Operational extensions
  '_EnterpriseAttribute',
  '_BusinessUnitUnsubscribes',
  '_Journey',
  '_JourneyActivity',
  '_AutomationInstance',
  '_AutomationActivityInstance',
  '_SMSMessageTracking',
  '_SMSSubscriptionLog',
  '_UndeliverableSMS',
  '_MobileAddress',
  '_PushAddress',
  '_PushTag',
  '_MobileLineAddressContactSubscriptionView',
  '_MobileLineOrphanContactView',
  '_Complaint',
  // Tier 3 — Specialized / legacy metadata
  '_Coupon',
  '_SocialNetworkTracking',
  '_SocialNetworkImpressions',
  '_SurveyResponse',
  '_FTAF',
  '_ReconcilableDispositionView',
];

function orderDataViewsByDisplayPriority(tables: DataViewTable[]): DataViewTable[] {
  const rank = new Map(DATA_VIEW_DISPLAY_ORDER.map((name, index) => [name, index]));
  const fallbackRank = DATA_VIEW_DISPLAY_ORDER.length;

  return [...tables].sort((left, right) => {
    const leftRank = rank.get(left.name) ?? fallbackRank;
    const rightRank = rank.get(right.name) ?? fallbackRank;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.name.localeCompare(right.name);
  });
}

/** All SFMC system data views in display order (unique by name). */
export const sfmcDataViews: DataViewTable[] = orderDataViewsByDisplayPriority(
  uniqueTablesByName([
    ...subscriberDataViews,
    ...subscriptionDataViews,
    ...sendingDataViews,
    ...trackingDataViews,
    ...journeyDataViews,
    ...automationDataViews,
    ...mobileDataViews,
    ...mobilePushDataViews,
    ...groupConnectDataViews,
    ...socialDataViews,
    ...otherDataViews,
  ]),
);
