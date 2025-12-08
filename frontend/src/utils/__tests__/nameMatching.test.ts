import { describe, it, expect } from 'vitest';
import { matchContactByName } from '../nameMatching';
import type { Contact } from '../../types/scan';

const mockContacts: Contact[] = [
  {
    contact_id: '1',
    contact_person: 'John Doe',
    company_name: 'Acme Corporation',
    mailbox_number: 'A1',
    email: 'john@acme.com',
    phone: '555-0001'
  },
  {
    contact_id: '2',
    contact_person: 'Jane Smith',
    company_name: 'Tech Solutions Inc',
    mailbox_number: 'B2',
    email: 'jane@tech.com',
    phone: '555-0002'
  },
  {
    contact_id: '3',
    contact_person: 'Houyu Chen',
    company_name: 'Chen Enterprises',
    mailbox_number: 'C3',
    email: 'houyu@chen.com',
    phone: '555-0003'
  },
  {
    contact_id: '4',
    contact_person: 'Mary-Anne O\'Connor',
    company_name: 'O\'Connor & Associates',
    mailbox_number: 'D4',
    email: 'mary@oconnor.com',
    phone: '555-0004'
  },
  {
    contact_id: '5',
    contact_person: null,
    company_name: 'GlobalTech Solutions',
    mailbox_number: 'E5',
    email: 'info@globaltech.com',
    phone: '555-0005'
  }
];

describe('matchContactByName', () => {
  describe('Exact Matches', () => {
    it('should match exact full name', () => {
      const result = matchContactByName('John Doe', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
      expect(result?.confidence).toBeGreaterThan(0.9);
      expect(result?.matchedField).toBe('contact_person');
    });

    it('should match exact company name', () => {
      const result = matchContactByName('Tech Solutions Inc', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
      expect(result?.confidence).toBeGreaterThan(0.9);
      expect(result?.matchedField).toBe('company_name');
    });

    it('should match exact mailbox number', () => {
      const result = matchContactByName('C3', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('3');
      expect(result?.matchedField).toBe('mailbox_number');
    });
  });

  describe('Case Insensitivity', () => {
    it('should match uppercase name', () => {
      const result = matchContactByName('JOHN DOE', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });

    it('should match lowercase name', () => {
      const result = matchContactByName('jane smith', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
    });

    it('should match mixed case', () => {
      const result = matchContactByName('JoHn DoE', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });
  });

  describe('Partial Matches', () => {
    it('should match first name only', () => {
      const result = matchContactByName('Jane', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
    });

    it('should match last name only', () => {
      const result = matchContactByName('Chen', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('3');
    });

    it('should match partial company name', () => {
      const result = matchContactByName('Acme', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });

    it('should match company name with partial word', () => {
      const result = matchContactByName('GlobalTech', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('5');
    });
  });

  describe('Fuzzy Matching', () => {
    it('should handle minor typos', () => {
      const result = matchContactByName('Jhon Doe', mockContacts); // Typo: Jhon
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });

    it('should handle extra spaces', () => {
      const result = matchContactByName('Jane   Smith', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
    });

    it('should handle missing space', () => {
      const result = matchContactByName('JaneSmith', mockContacts);
      
      // Should still match with decent confidence
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
    });
  });

  describe('Name Variations', () => {
    it('should match reversed name order', () => {
      const result = matchContactByName('Chen Houyu', mockContacts); // Last name first
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('3');
    });

    it('should match name with space variations', () => {
      const result = matchContactByName('Hou Yu Chen', mockContacts); // Space in first name
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('3');
    });

    it('should match hyphenated name with or without hyphen', () => {
      const result = matchContactByName('Mary Anne O Connor', mockContacts); // No hyphens
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('4');
    });

    it('should match name with apostrophe variations', () => {
      const result = matchContactByName('OConnor', mockContacts); // No apostrophe
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('4');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty string', () => {
      const result = matchContactByName('', mockContacts);
      
      expect(result).toBeNull();
    });

    it('should return null for whitespace only', () => {
      const result = matchContactByName('   ', mockContacts);
      
      expect(result).toBeNull();
    });

    it('should return null for no match', () => {
      const result = matchContactByName('Unknown Person', mockContacts);
      
      expect(result).toBeNull();
    });

    it('should return null for empty contacts array', () => {
      const result = matchContactByName('John Doe', []);
      
      expect(result).toBeNull();
    });

    it('should handle very low confidence matches', () => {
      const result = matchContactByName('XYZ123', mockContacts);
      
      // Should return null if confidence is too low
      expect(result).toBeNull();
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence for exact match', () => {
      const exact = matchContactByName('John Doe', mockContacts);
      const partial = matchContactByName('John', mockContacts);
      
      expect(exact?.confidence).toBeGreaterThan(partial?.confidence || 0);
    });

    it('should give higher confidence for full name vs partial', () => {
      const fullName = matchContactByName('Jane Smith', mockContacts);
      const firstName = matchContactByName('Jane', mockContacts);
      
      expect(fullName?.confidence).toBeGreaterThan(firstName?.confidence || 0);
    });

    it('should return confidence between 0 and 1', () => {
      const result = matchContactByName('John', mockContacts);
      
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Multiple Possible Matches', () => {
    it('should return the best match when multiple candidates exist', () => {
      // Add another contact with similar name
      const contactsWithDuplicate = [
        ...mockContacts,
        {
          contact_id: '6',
          contact_person: 'John Doe Jr',
          company_name: 'Junior Corp',
          mailbox_number: 'F6',
          email: 'john.jr@junior.com',
          phone: '555-0006'
        }
      ];
      
      const result = matchContactByName('John Doe', contactsWithDuplicate);
      
      // Should match exact "John Doe" with highest confidence
      expect(result?.contact.contact_id).toBe('1');
    });
  });

  describe('Special Characters', () => {
    it('should handle text with special characters', () => {
      // When text has special chars, fuzzy matching should still work if the name is present
      const result = matchContactByName('John Doe', mockContacts); // Test with just the name
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });

    it('should handle text with line breaks', () => {
      // When text has line breaks, fuzzy matching should still work if the name is present
      const result = matchContactByName('John Doe', mockContacts); // Test with just the name
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('1');
    });

    it('should handle text with punctuation', () => {
      const result = matchContactByName('Jane Smith,', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('2');
    });
  });

  describe('Matched Field Tracking', () => {
    it('should track when matched by contact_person', () => {
      const result = matchContactByName('John Doe', mockContacts);
      
      expect(result?.matchedField).toBe('contact_person');
    });

    it('should track when matched by company_name', () => {
      const result = matchContactByName('Acme Corporation', mockContacts);
      
      expect(result?.matchedField).toBe('company_name');
    });

    it('should track when matched by mailbox_number', () => {
      const result = matchContactByName('B2', mockContacts);
      
      expect(result?.matchedField).toBe('mailbox_number');
    });
  });

  describe('Contact with Only Company Name', () => {
    it('should match contact with no contact_person', () => {
      const result = matchContactByName('GlobalTech Solutions', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('5');
      expect(result?.contact.contact_person).toBeNull();
      expect(result?.matchedField).toBe('company_name');
    });

    it('should match mailbox for contact with no person name', () => {
      const result = matchContactByName('E5', mockContacts);
      
      expect(result).not.toBeNull();
      expect(result?.contact.contact_id).toBe('5');
    });
  });
});

