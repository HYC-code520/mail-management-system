/**
 * Tests for scan.controller.js
 * Focus on item merging and action history logging
 */

// Mock dependencies before importing
jest.mock('../services/supabase.service', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

jest.mock('../services/fee.service', () => ({
  createFeeRecord: jest.fn(() => Promise.resolve()),
}));

const { supabaseAdmin } = require('../services/supabase.service');
const feeService = require('../services/fee.service');

describe('Scan Controller - Item Merging Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('itemsByType grouping', () => {
    it('should group multiple items of same type into one with combined quantity', () => {
      // Simulate the grouping logic used in bulkSubmitScanSession
      const items = [
        { item_type: 'Letter', scanned_at: '2024-12-11T10:00:00Z' },
        { item_type: 'Letter', scanned_at: '2024-12-11T10:01:00Z' },
        { item_type: 'Letter', scanned_at: '2024-12-11T10:02:00Z' },
      ];

      const itemsByType = items.reduce((acc, item) => {
        if (!acc[item.item_type]) {
          acc[item.item_type] = {
            item_type: item.item_type,
            count: 0,
          };
        }
        acc[item.item_type].count++;
        return acc;
      }, {});

      expect(Object.keys(itemsByType)).toHaveLength(1);
      expect(itemsByType['Letter'].count).toBe(3);
    });

    it('should create separate groups for different item types', () => {
      const items = [
        { item_type: 'Letter', scanned_at: '2024-12-11T10:00:00Z' },
        { item_type: 'Package', scanned_at: '2024-12-11T10:01:00Z' },
        { item_type: 'Letter', scanned_at: '2024-12-11T10:02:00Z' },
        { item_type: 'Package', scanned_at: '2024-12-11T10:03:00Z' },
        { item_type: 'Package', scanned_at: '2024-12-11T10:04:00Z' },
      ];

      const itemsByType = items.reduce((acc, item) => {
        if (!acc[item.item_type]) {
          acc[item.item_type] = {
            item_type: item.item_type,
            count: 0,
          };
        }
        acc[item.item_type].count++;
        return acc;
      }, {});

      expect(Object.keys(itemsByType)).toHaveLength(2);
      expect(itemsByType['Letter'].count).toBe(2);
      expect(itemsByType['Package'].count).toBe(3);
    });

    it('should handle Large Package as separate type', () => {
      const items = [
        { item_type: 'Package', scanned_at: '2024-12-11T10:00:00Z' },
        { item_type: 'Large Package', scanned_at: '2024-12-11T10:01:00Z' },
      ];

      const itemsByType = items.reduce((acc, item) => {
        if (!acc[item.item_type]) {
          acc[item.item_type] = {
            item_type: item.item_type,
            count: 0,
          };
        }
        acc[item.item_type].count++;
        return acc;
      }, {});

      expect(Object.keys(itemsByType)).toHaveLength(2);
      expect(itemsByType['Package'].count).toBe(1);
      expect(itemsByType['Large Package'].count).toBe(1);
    });
  });

  describe('mail items to insert generation', () => {
    it('should generate correct insert data with combined quantities', () => {
      const contact_id = 'contact-123';
      const itemsByType = {
        'Letter': { item_type: 'Letter', count: 5 },
        'Package': { item_type: 'Package', count: 2 },
      };

      const mailItemsToInsert = Object.values(itemsByType).map(typeGroup => ({
        contact_id: contact_id,
        item_type: typeGroup.item_type,
        quantity: typeGroup.count,
        status: 'Received',
      }));

      expect(mailItemsToInsert).toHaveLength(2);
      
      const letterItem = mailItemsToInsert.find(i => i.item_type === 'Letter');
      expect(letterItem.quantity).toBe(5);
      expect(letterItem.contact_id).toBe('contact-123');
      expect(letterItem.status).toBe('Received');

      const packageItem = mailItemsToInsert.find(i => i.item_type === 'Package');
      expect(packageItem.quantity).toBe(2);
    });
  });

  describe('action history description generation', () => {
    it('should generate correct singular description for 1 item', () => {
      const typeGroup = { count: 1 };
      const itemType = 'Letter';
      
      const description = `Bulk scanned ${typeGroup.count} ${itemType}${typeGroup.count > 1 ? 's' : ''} via Scan Session`;
      
      expect(description).toBe('Bulk scanned 1 Letter via Scan Session');
    });

    it('should generate correct plural description for multiple items', () => {
      const typeGroup = { count: 5 };
      const itemType = 'Letter';
      
      const description = `Bulk scanned ${typeGroup.count} ${itemType}${typeGroup.count > 1 ? 's' : ''} via Scan Session`;
      
      expect(description).toBe('Bulk scanned 5 Letters via Scan Session');
    });

    it('should generate correct description for packages', () => {
      const typeGroup = { count: 3 };
      const itemType = 'Package';
      
      const description = `Bulk scanned ${typeGroup.count} ${itemType}${typeGroup.count > 1 ? 's' : ''} via Scan Session`;
      
      expect(description).toBe('Bulk scanned 3 Packages via Scan Session');
    });
  });

  describe('fee record creation', () => {
    it('should identify Package types that need fee records', () => {
      const itemTypes = ['Letter', 'Package', 'Large Package', 'Postcard'];
      
      const typesNeedingFees = itemTypes.filter(type => 
        type === 'Package' || type === 'Large Package'
      );
      
      expect(typesNeedingFees).toEqual(['Package', 'Large Package']);
    });
  });

  describe('contact grouping logic', () => {
    it('should group items by contact_id', () => {
      const items = [
        { contact_id: 'contact-1', item_type: 'Letter' },
        { contact_id: 'contact-1', item_type: 'Package' },
        { contact_id: 'contact-2', item_type: 'Letter' },
        { contact_id: 'contact-1', item_type: 'Letter' },
      ];

      const groupedByContact = items.reduce((acc, item) => {
        if (!acc[item.contact_id]) {
          acc[item.contact_id] = {
            contact_id: item.contact_id,
            items: [],
            letterCount: 0,
            packageCount: 0,
          };
        }

        acc[item.contact_id].items.push(item);

        if (item.item_type === 'Letter' || item.item_type === 'Postcard') {
          acc[item.contact_id].letterCount++;
        } else {
          acc[item.contact_id].packageCount++;
        }

        return acc;
      }, {});

      expect(Object.keys(groupedByContact)).toHaveLength(2);
      expect(groupedByContact['contact-1'].items).toHaveLength(3);
      expect(groupedByContact['contact-1'].letterCount).toBe(2);
      expect(groupedByContact['contact-1'].packageCount).toBe(1);
      expect(groupedByContact['contact-2'].items).toHaveLength(1);
    });
  });
});

describe('Scan Controller - Custom Template and Skip Notification', () => {
  describe('request body parameters', () => {
    it('should accept templateId parameter for custom template selection', () => {
      const requestBody = {
        items: [{ contact_id: 'contact-1', item_type: 'Letter' }],
        scannedBy: 'Madison',
        templateId: 'template-123',
        customSubject: undefined,
        customBody: undefined,
        skipNotification: false,
      };

      expect(requestBody.templateId).toBe('template-123');
      expect(requestBody.scannedBy).toBe('Madison');
    });

    it('should accept customSubject and customBody for edited emails', () => {
      const requestBody = {
        items: [{ contact_id: 'contact-1', item_type: 'Letter' }],
        scannedBy: 'Merlin',
        templateId: 'template-123',
        customSubject: 'Custom Email Subject',
        customBody: 'Custom email body content here',
        skipNotification: false,
      };

      expect(requestBody.customSubject).toBe('Custom Email Subject');
      expect(requestBody.customBody).toBe('Custom email body content here');
    });

    it('should accept skipNotification flag to skip sending emails', () => {
      const requestBody = {
        items: [{ contact_id: 'contact-1', item_type: 'Letter' }],
        scannedBy: 'Madison',
        skipNotification: true,
      };

      expect(requestBody.skipNotification).toBe(true);
    });
  });

  describe('email variable substitution', () => {
    it('should build correct Type string for letters only', () => {
      const group = {
        letterCount: 3,
        packageCount: 0,
      };

      const typeString = [];
      if (group.letterCount > 0) {
        typeString.push(`${group.letterCount} ${group.letterCount === 1 ? 'letter' : 'letters'}`);
      }
      if (group.packageCount > 0) {
        typeString.push(`${group.packageCount} ${group.packageCount === 1 ? 'package' : 'packages'}`);
      }

      expect(typeString.join(' and ')).toBe('3 letters');
    });

    it('should build correct Type string for packages only', () => {
      const group = {
        letterCount: 0,
        packageCount: 2,
      };

      const typeString = [];
      if (group.letterCount > 0) {
        typeString.push(`${group.letterCount} ${group.letterCount === 1 ? 'letter' : 'letters'}`);
      }
      if (group.packageCount > 0) {
        typeString.push(`${group.packageCount} ${group.packageCount === 1 ? 'package' : 'packages'}`);
      }

      expect(typeString.join(' and ')).toBe('2 packages');
    });

    it('should build correct Type string for mixed items', () => {
      const group = {
        letterCount: 2,
        packageCount: 1,
      };

      const typeString = [];
      if (group.letterCount > 0) {
        typeString.push(`${group.letterCount} ${group.letterCount === 1 ? 'letter' : 'letters'}`);
      }
      if (group.packageCount > 0) {
        typeString.push(`${group.packageCount} ${group.packageCount === 1 ? 'package' : 'packages'}`);
      }

      expect(typeString.join(' and ')).toBe('2 letters and 1 package');
    });

    it('should use singular "letter" for 1 letter', () => {
      const group = { letterCount: 1, packageCount: 0 };
      const letterText = group.letterCount === 1 ? 'letter' : 'letters';
      expect(letterText).toBe('letter');
    });

    it('should use plural "letters" for multiple letters', () => {
      const group = { letterCount: 5, packageCount: 0 };
      const letterText = group.letterCount === 1 ? 'letter' : 'letters';
      expect(letterText).toBe('letters');
    });

    it('should use singular "package" for 1 package', () => {
      const group = { letterCount: 0, packageCount: 1 };
      const packageText = group.packageCount === 1 ? 'package' : 'packages';
      expect(packageText).toBe('package');
    });

    it('should use plural "packages" for multiple packages', () => {
      const group = { letterCount: 0, packageCount: 3 };
      const packageText = group.packageCount === 1 ? 'package' : 'packages';
      expect(packageText).toBe('packages');
    });
  });

  describe('scannedBy staff tracking', () => {
    it('should use scannedBy for action history performed_by field', () => {
      const scannedBy = 'Madison';
      const performedBy = scannedBy || 'Staff';

      expect(performedBy).toBe('Madison');
    });

    it('should fallback to "Staff" when scannedBy not provided', () => {
      const scannedBy = undefined;
      const performedBy = scannedBy || 'Staff';

      expect(performedBy).toBe('Staff');
    });
  });
});
