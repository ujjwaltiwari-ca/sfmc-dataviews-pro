import type { DataViewTable } from './types';
import { field } from './helpers';

export const otherDataViews: DataViewTable[] = [
  {
    name: '_Coupon',
    description:
      'Coupon definitions for Content Builder Block SDK live content. Requires Block SDK coupons.',
    category: 'Other',
    fields: [
      field('Name', 'Text', 'Coupon name.', { length: 128, isPrimaryKey: true }),
      field('ExternalKey', 'Text', 'API external key.', { length: 36, isPrimaryKey: true }),
      field('Description', 'Text', 'Coupon description.', { isNullable: true }),
      field('BeginDate', 'Date', 'Coupon valid-from date.'),
      field('ExpirationDate', 'Date', 'Coupon expiration date.'),
    ],
  },
];
