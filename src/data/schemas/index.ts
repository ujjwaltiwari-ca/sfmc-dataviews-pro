import { automationDataViews } from './automation';
import { groupConnectDataViews } from './groupConnect';
import { journeyDataViews } from './journey';
import { mobileDataViews } from './mobile';
import { mobilePushDataViews } from './mobilePush';
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
export { mobilePushDataViews } from './mobilePush';
export { groupConnectDataViews } from './groupConnect';
export { socialDataViews } from './social';
export { otherDataViews } from './other';
export { sendLogDataViews } from './sendLog';
export { synchronizedDeDataViews } from './synchronizedDe';

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
