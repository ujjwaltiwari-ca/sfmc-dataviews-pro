export type RelationalKeyKind = 'job' | 'subscriber' | 'list' | 'triggeredSend';

export interface RelationalKeyStyle {
  row: string;
  typeBadge: string;
}

const RELATIONAL_KEY_STYLES: Record<RelationalKeyKind, RelationalKeyStyle> = {
  job: {
    row: 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    typeBadge:
      'bg-amber-200/60 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  subscriber: {
    row: 'bg-blue-100/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    typeBadge:
      'bg-blue-200/60 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  list: {
    row: 'bg-indigo-100/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
    typeBadge:
      'bg-indigo-200/60 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  },
  triggeredSend: {
    row: 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    typeBadge:
      'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
};

/** Ordered most-specific first so compound names resolve predictably. */
const RELATIONAL_KEY_MATCHERS: { kind: RelationalKeyKind; matches: (name: string) => boolean }[] = [
  {
    kind: 'triggeredSend',
    matches: (name) =>
      name === 'TriggeredSendDefinitionObjectID' || name.includes('TriggeredSend'),
  },
  {
    kind: 'job',
    matches: (name) => name === 'JobID' || name === 'Job ID',
  },
  {
    kind: 'subscriber',
    matches: (name) =>
      name === 'SubscriberID' || name === 'SubscriberKey' || name === 'Subscriber',
  },
  {
    kind: 'list',
    matches: (name) => name === 'ListID' || name === 'List ID',
  },
];

export function getRelationalKeyKind(fieldName: string): RelationalKeyKind | null {
  const matcher = RELATIONAL_KEY_MATCHERS.find(({ matches }) => matches(fieldName));
  return matcher?.kind ?? null;
}

export function getRelationalKeyStyle(fieldName: string): RelationalKeyStyle | null {
  const kind = getRelationalKeyKind(fieldName);
  return kind ? RELATIONAL_KEY_STYLES[kind] : null;
}
