import { describe, it, expect } from 'vitest';
import { generateCSVTemplate, parseCSVToContacts } from '../utils/csvParser';

describe('csvParser', () => {
  it('parses valid contacts and ignores invalid rows', () => {
    const csv = `first name,last name,email,phone
John,Doe,john@example.com,123
Jane,,jane@example.com,456`;

    const contacts = parseCSVToContacts(csv);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '123',
    });
  });

  it('handles alternate header names', () => {
    const csv = `first_name,last_name,email_address,company
Sam,Lee,sam@ex.com,Acme`;
    const contacts = parseCSVToContacts(csv);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({
      firstName: 'Sam',
      lastName: 'Lee',
      email: 'sam@ex.com',
      companyName: 'Acme',
    });
  });

  it('generates a CSV template with header row', () => {
    const template = generateCSVTemplate();
    expect(template.split('\n')[0]).toContain('firstName,lastName,email');
  });
});
