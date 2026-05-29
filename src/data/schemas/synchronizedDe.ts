import type { DataViewTable } from './types';
import { field, rel } from './helpers';

/** Standard Salesforce CRM synchronized data extension shapes. */
export const synchronizedDeDataViews: DataViewTable[] = [
  {
    name: 'Account_Salesforce',
    description:
      'Synchronized Account object from Salesforce CRM. Primary key is the 18-character Salesforce Id.',
    category: 'Synchronized',
    fields: [
      field('Id', 'Text', 'Salesforce Account Id (18-char).', { length: 18, isPrimaryKey: true }),
      field('Name', 'Text', 'Account name.', { length: 255 }),
      field('Type', 'Text', 'Account type picklist value.', { length: 100, isNullable: true }),
      field('Industry', 'Text', 'Industry classification.', { length: 100, isNullable: true }),
      field('BillingCity', 'Text', 'Billing city.', { length: 100, isNullable: true }),
      field('BillingState', 'Text', 'Billing state or province.', { length: 100, isNullable: true }),
      field('BillingCountry', 'Text', 'Billing country.', { length: 100, isNullable: true }),
      field('Phone', 'Text', 'Main phone number.', { length: 40, isNullable: true }),
      field('Website', 'Text', 'Corporate website URL.', { length: 255, isNullable: true }),
      field('OwnerId', 'Text', 'Owning user Id in Salesforce.', { length: 18, isNullable: true }),
      field('CreatedDate', 'Date', 'Record created timestamp in Salesforce.'),
      field('LastModifiedDate', 'Date', 'Last modified timestamp in Salesforce.'),
      field('IsDeleted', 'Boolean', 'Soft-delete flag from Salesforce replication.'),
    ],
  },
  {
    name: 'Contact_Salesforce',
    description:
      'Synchronized Contact object. Join to Account_Salesforce on AccountId for account-level attributes.',
    category: 'Synchronized',
    fields: [
      field('Id', 'Text', 'Salesforce Contact Id (18-char).', { length: 18, isPrimaryKey: true }),
      field('AccountId', 'Text', 'Parent Account Id.', {
        length: 18,
        isNullable: true,
        relatesTo: [rel('Account_Salesforce', 'Id')],
      }),
      field('Email', 'Text', 'Primary email address — map to SubscriberKey in sends.', { length: 254 }),
      field('FirstName', 'Text', 'Contact first name.', { length: 80, isNullable: true }),
      field('LastName', 'Text', 'Contact last name.', { length: 80 }),
      field('Title', 'Text', 'Job title.', { length: 128, isNullable: true }),
      field('Phone', 'Text', 'Business phone.', { length: 40, isNullable: true }),
      field('MobilePhone', 'Text', 'Mobile phone.', { length: 40, isNullable: true }),
      field('MailingCity', 'Text', 'Mailing city.', { length: 100, isNullable: true }),
      field('MailingState', 'Text', 'Mailing state or province.', { length: 100, isNullable: true }),
      field('MailingCountry', 'Text', 'Mailing country.', { length: 100, isNullable: true }),
      field('HasOptedOutOfEmail', 'Boolean', 'Email opt-out flag from Salesforce.'),
      field('CreatedDate', 'Date', 'Record created timestamp in Salesforce.'),
      field('LastModifiedDate', 'Date', 'Last modified timestamp in Salesforce.'),
      field('IsDeleted', 'Boolean', 'Soft-delete flag from Salesforce replication.'),
    ],
  },
  {
    name: 'Lead_Salesforce',
    description:
      'Synchronized Lead object for prospect records before conversion to Contact/Account.',
    category: 'Synchronized',
    fields: [
      field('Id', 'Text', 'Salesforce Lead Id (18-char).', { length: 18, isPrimaryKey: true }),
      field('Email', 'Text', 'Lead email address.', { length: 254, isNullable: true }),
      field('FirstName', 'Text', 'Lead first name.', { length: 80, isNullable: true }),
      field('LastName', 'Text', 'Lead last name.', { length: 80 }),
      field('Company', 'Text', 'Company name on the lead.', { length: 255 }),
      field('Status', 'Text', 'Lead status picklist value.', { length: 100 }),
      field('Rating', 'Text', 'Lead rating (Hot/Warm/Cold).', { length: 50, isNullable: true }),
      field('LeadSource', 'Text', 'Original lead source.', { length: 100, isNullable: true }),
      field('Industry', 'Text', 'Industry classification.', { length: 100, isNullable: true }),
      field('Phone', 'Text', 'Primary phone.', { length: 40, isNullable: true }),
      field('HasOptedOutOfEmail', 'Boolean', 'Email opt-out flag from Salesforce.'),
      field('IsConverted', 'Boolean', 'Whether the lead converted to Contact/Account.'),
      field('ConvertedContactId', 'Text', 'Resulting Contact Id after conversion.', {
        length: 18,
        isNullable: true,
        relatesTo: [rel('Contact_Salesforce', 'Id')],
      }),
      field('ConvertedAccountId', 'Text', 'Resulting Account Id after conversion.', {
        length: 18,
        isNullable: true,
        relatesTo: [rel('Account_Salesforce', 'Id')],
      }),
      field('CreatedDate', 'Date', 'Record created timestamp in Salesforce.'),
      field('LastModifiedDate', 'Date', 'Last modified timestamp in Salesforce.'),
      field('IsDeleted', 'Boolean', 'Soft-delete flag from Salesforce replication.'),
    ],
  },
];
