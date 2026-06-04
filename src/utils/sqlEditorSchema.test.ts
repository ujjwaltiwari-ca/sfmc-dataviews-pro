import { describe, expect, it } from 'vitest';
import type { DataViewTable } from '../data/sfmcSchema';
import { buildSqlCompletionSchema } from './sqlEditorSchema';

const sentTable: DataViewTable = {
  name: '_Sent',
  description: 'Sent events',
  category: 'Sending',
  fields: [
    {
      name: 'EventDate',
      type: 'Date',
      isPrimaryKey: false,
      isNullable: false,
      description: 'Send time',
    },
    {
      name: 'JobID',
      type: 'Number',
      isPrimaryKey: true,
      isNullable: false,
      description: 'Job',
    },
  ],
};

describe('buildSqlCompletionSchema', () => {
  it('maps selected tables to unquoted column completions', () => {
    expect(buildSqlCompletionSchema([sentTable], ['_Sent'])).toEqual({
      _Sent: [
        { label: 'EventDate', type: 'property' },
        { label: 'JobID', type: 'property' },
      ],
      Sent: [
        { label: 'EventDate', type: 'property' },
        { label: 'JobID', type: 'property' },
      ],
    });
  });

  it('returns empty when no tables are in scope', () => {
    expect(buildSqlCompletionSchema([sentTable], [])).toEqual({});
  });

  it('ignores table names not present in schema data', () => {
    expect(buildSqlCompletionSchema([sentTable], ['_Open'])).toEqual({});
  });
});
