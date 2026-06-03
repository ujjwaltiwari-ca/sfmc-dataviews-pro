export interface DataViewField {
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Boolean' | 'Decimal';
  length?: number;
  isPrimaryKey: boolean;
  isNullable: boolean;
  description: string;
  relatesTo?: { table: string; field: string }[];
  /** When true, field is commonly indexed for lookups and joins. */
  isIndexed?: boolean;
}

export type DataViewCategory =
  | 'Subscribers'
  | 'Sending'
  | 'Tracking'
  | 'Subscription'
  | 'Journey'
  | 'Automation'
  | 'Mobile'
  | 'GroupConnect'
  | 'Social'
  | 'Other'
  | 'SendLog'
  | 'Synchronized';

export interface DataViewTable {
  name: string;
  description: string;
  category: DataViewCategory;
  fields: DataViewField[];
}
