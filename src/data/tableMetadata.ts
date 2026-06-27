/** Retention windows and practitioner warnings per SFMC system data view. */

export const TABLE_RETENTION: Readonly<Record<string, string>> = {
  _Sent: '6 months',
  _Open: '6 months',
  _Click: '6 months',
  _Bounce: '6 months',
  _Complaint: '6 months',
  _FTAF: '6 months',
  _SurveyResponse: '6 months',
  _Job: '6 months',
  _Unsubscribe: 'Indefinite',
  _Subscribers: 'Indefinite',
  _ListSubscribers: 'Indefinite',
  _BusinessUnitUnsubscribes: 'Indefinite',
  _EnterpriseAttribute: 'Indefinite',
  _Journey: 'Indefinite',
  _JourneyActivity: 'Indefinite',
  _AutomationInstance: '60 days',
  _AutomationActivityInstance: '60 days',
  _SMSMessageTracking: '6 months',
  _SMSSubscriptionLog: '6 months',
  _UndeliverableSMS: '6 months',
  _MobileAddress: 'Indefinite',
};

export const TABLE_KNOWN_LIMITATIONS: Readonly<Record<string, readonly string[]>> = {
  _Sent: [
    'EmailName is always null — JOIN _Job on JobID to get the email name.',
    'Does not include test sends. Add IsTestSend = 0 to exclude them explicitly.',
    'Data is retained for approximately 6 months.',
  ],
  _Open: [
    'Includes automated image prefetches from email clients. Use IsUnique = 1 to count unique human opens.',
    'Apple MPP (Mail Privacy Protection) inflates open counts significantly since iOS 15.',
  ],
  _Click: [
    'Use IsUnique = 1 to count unique clicks per subscriber per send, not total raw clicks.',
  ],
  _Subscribers: [
    'The Status field reflects current status, not the status at the time of a send.',
    'Use Ent._Subscribers in a parent BU to query across all child BUs.',
  ],
  _Job: [
    'EmailName may differ from what subscribers received if the email was modified after the send.',
    'TriggeredSendExternalKey is null for standard sends — only populated for triggered sends.',
  ],
  _Journey: [
    'Does not reflect Interaction Studio (now Marketing Cloud Personalization) journeys.',
  ],
  _AutomationInstance: [
    'Data is retained for approximately 60 days only.',
    'Does not record automations that have never run — only instances of execution.',
  ],
  _EnterpriseAttribute: [
    'Columns are dynamic per tenant. Only the _SubscriberID field is universal — all profile attribute columns vary by account configuration.',
  ],
  _SMSMessageTracking: [
    'MobileNumber is stored in E.164 format (e.g. +15551234567). Ensure your comparison values match this format.',
  ],
};

export function getTableRetention(tableName: string): string | undefined {
  return TABLE_RETENTION[tableName];
}

export function getKnownLimitations(tableName: string): readonly string[] {
  return TABLE_KNOWN_LIMITATIONS[tableName] ?? [];
}
