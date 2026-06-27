export type QueryTemplateCategory =
  | 'All'
  | 'Deliverability'
  | 'Engagement'
  | 'List Hygiene'
  | 'Automation'
  | 'Journey'
  | 'SMS'
  | 'Campaign';

export interface QueryTemplate {
  id: string;
  title: string;
  description: string;
  sql: string;
  category: Exclude<QueryTemplateCategory, 'All'>;
}

export const QUERY_TEMPLATE_CATEGORIES: QueryTemplateCategory[] = [
  'All',
  'Deliverability',
  'Engagement',
  'List Hygiene',
  'Automation',
  'Journey',
  'SMS',
  'Campaign',
];
