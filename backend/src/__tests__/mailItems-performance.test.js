const { getSupabaseClient } = require('../services/supabase.service');
const { getMailItems } = require('../controllers/mailItems.controller');

// Mock Supabase
jest.mock('../services/supabase.service', () => ({
  getSupabaseClient: jest.fn()
}));

describe('Mail Items Controller - Performance Optimizations', () => {
  let mockSupabase;
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Supabase client with chaining support
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    };

    getSupabaseClient.mockReturnValue(mockSupabase);

    // Mock request/response
    req = {
      user: { token: 'test-token' },
      query: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('Batched Notification Count Queries', () => {
    it('should fetch notification counts in a single batch query', async () => {
      // Mock mail items response
      const mockMailItems = [
        { mail_item_id: '1', item_type: 'Letter', status: 'Received' },
        { mail_item_id: '2', item_type: 'Package', status: 'Notified' },
        { mail_item_id: '3', item_type: 'Letter', status: 'Picked Up' }
      ];

      // Mock notifications response
      const mockNotifications = [
        { mail_item_id: '1' }, // 1 notification for item 1
        { mail_item_id: '2' }, // 2 notifications for item 2
        { mail_item_id: '2' },
        { mail_item_id: '3' }, // 1 notification for item 3
      ];

      // Setup mock chain for mail items query
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      // Setup mock chain for notifications query
      const notificationsChain = {
        ...mockSupabase,
        in: jest.fn().mockResolvedValue({ data: mockNotifications, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(notificationsChain);
      mockSupabase.select.mockReturnValueOnce(notificationsChain);

      await getMailItems(req, res, next);

      // Verify it used .in() for batch query
      expect(notificationsChain.in).toHaveBeenCalledWith(
        'mail_item_id',
        ['1', '2', '3']
      );

      // Verify response has correct notification counts
      expect(res.json).toHaveBeenCalledWith([
        { mail_item_id: '1', item_type: 'Letter', status: 'Received', notification_count: 1 },
        { mail_item_id: '2', item_type: 'Package', status: 'Notified', notification_count: 2 },
        { mail_item_id: '3', item_type: 'Letter', status: 'Picked Up', notification_count: 1 }
      ]);
    });

    it('should handle mail items with zero notifications', async () => {
      const mockMailItems = [
        { mail_item_id: '1', item_type: 'Letter', status: 'Received' },
        { mail_item_id: '2', item_type: 'Package', status: 'Notified' }
      ];

      // Setup mock chain for mail items query
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      // Setup mock chain for notifications query (empty)
      const notificationsChain = {
        ...mockSupabase,
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValueOnce(notificationsChain);
      mockSupabase.select.mockReturnValueOnce(notificationsChain);

      await getMailItems(req, res, next);

      expect(res.json).toHaveBeenCalledWith([
        { mail_item_id: '1', item_type: 'Letter', status: 'Received', notification_count: 0 },
        { mail_item_id: '2', item_type: 'Package', status: 'Notified', notification_count: 0 }
      ]);
    });

    it('should handle empty mail items list', async () => {
      // Setup mock chain for empty mail items
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      await getMailItems(req, res, next);

      // Should not attempt to fetch notifications for empty list
      expect(res.json).toHaveBeenCalledWith([]);
      
      // Only one from() call for mail_items, none for notification_history
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('mail_items');
    });

    it('should gracefully handle notification fetch errors', async () => {
      const mockMailItems = [
        { mail_item_id: '1', item_type: 'Letter', status: 'Received' }
      ];

      // Setup mock chain for mail items query
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      // Setup mock chain for notifications query (error)
      const notificationsChain = {
        ...mockSupabase,
        in: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      };
      mockSupabase.from.mockReturnValueOnce(notificationsChain);
      mockSupabase.select.mockReturnValueOnce(notificationsChain);

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await getMailItems(req, res, next);

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching notification counts:',
        expect.objectContaining({ message: 'Database error' })
      );

      // Should return mail items with notification_count: 0 instead of failing
      expect(res.json).toHaveBeenCalledWith([
        { mail_item_id: '1', item_type: 'Letter', status: 'Received', notification_count: 0 }
      ]);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should execute only 2 database queries for large dataset', async () => {
      // Simulate a large dataset (100 mail items)
      const mockMailItems = Array.from({ length: 100 }, (_, i) => ({
        mail_item_id: `item-${i}`,
        item_type: 'Letter',
        status: 'Received'
      }));

      const mockNotifications = Array.from({ length: 50 }, (_, i) => ({
        mail_item_id: `item-${i}`
      }));

      // Setup mock chain for mail items query
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      // Setup mock chain for notifications query
      const notificationsChain = {
        ...mockSupabase,
        in: jest.fn().mockResolvedValue({ data: mockNotifications, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(notificationsChain);
      mockSupabase.select.mockReturnValueOnce(notificationsChain);

      await getMailItems(req, res, next);

      // CRITICAL: Should only call from() twice, regardless of dataset size
      // 1st call: fetch mail items
      // 2nd call: fetch ALL notifications in one batch
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'mail_items');
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'notification_history');

      // Should use .in() with array of 100 IDs (batch query)
      const mailItemIds = mockMailItems.map(item => item.mail_item_id);
      expect(notificationsChain.in).toHaveBeenCalledWith(
        'mail_item_id',
        mailItemIds
      );

      // Verify response has all 100 items with counts
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveLength(100);
      
      // First 50 items should have count of 1, rest should have 0
      expect(response[0].notification_count).toBe(1);
      expect(response[49].notification_count).toBe(1);
      expect(response[50].notification_count).toBe(0);
      expect(response[99].notification_count).toBe(0);
    });

    it('should use batch query pattern, not N+1 queries', async () => {
      // This test ensures we never revert to the old N+1 query pattern
      const mockMailItems = [
        { mail_item_id: '1', item_type: 'Letter' },
        { mail_item_id: '2', item_type: 'Package' },
        { mail_item_id: '3', item_type: 'Letter' }
      ];

      // Setup mock chain for mail items query
      const mailItemsChain = {
        ...mockSupabase,
        order: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
      };
      mockSupabase.from.mockReturnValueOnce(mailItemsChain);
      mockSupabase.select.mockReturnValueOnce(mailItemsChain);

      // Setup mock chain for notifications query
      const notificationsChain = {
        ...mockSupabase,
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValueOnce(notificationsChain);
      mockSupabase.select.mockReturnValueOnce(notificationsChain);

      await getMailItems(req, res, next);

      // CRITICAL: Should call from() exactly twice (mail_items + notification_history)
      // NOT 3+ times which would indicate N+1 pattern
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      
      // Should use .in() for batch query, NOT multiple .eq() calls
      expect(notificationsChain.in).toHaveBeenCalledTimes(1);
      expect(notificationsChain.in).toHaveBeenCalledWith(
        'mail_item_id',
        ['1', '2', '3']
      );
    });
  });

  describe('Query with contact_id filter', () => {
    it('should still use batched queries when filtering by contact_id', async () => {
      req.query.contact_id = 'contact-123';

      const mockMailItems = [
        { mail_item_id: '1', contact_id: 'contact-123', item_type: 'Letter' },
        { mail_item_id: '2', contact_id: 'contact-123', item_type: 'Package' }
      ];

      // First call: mail items query
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ data: mockMailItems, error: null });

      // Second call: notification history batch query
      const notificationHistoryChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValueOnce(notificationHistoryChain);

      await getMailItems(req, res, next);

      // Verify .eq() was called for contact_id filter
      expect(mockSupabase.eq).toHaveBeenCalledWith('contact_id', 'contact-123');

      // Verify notification batch query was used with .in()
      expect(notificationHistoryChain.in).toHaveBeenCalledWith('mail_item_id', ['1', '2']);
      
      // Response should have both items with notification_count
      expect(res.json).toHaveBeenCalledWith([
        { mail_item_id: '1', contact_id: 'contact-123', item_type: 'Letter', notification_count: 0 },
        { mail_item_id: '2', contact_id: 'contact-123', item_type: 'Package', notification_count: 0 }
      ]);
    });
  });
});

