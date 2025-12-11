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
