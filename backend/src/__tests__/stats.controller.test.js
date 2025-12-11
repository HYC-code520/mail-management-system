/**
 * Stats Controller Tests
 * Tests for timezone-aware dashboard metrics
 */

// Mock Supabase service FIRST with actual implementation
jest.mock('../services/supabase.service', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}));

// Mock fee service
jest.mock('../services/fee.service', () => ({
  updateFeesForAllPackages: jest.fn().mockResolvedValue({ updated: 0, errors: 0 }),
  getRevenueStats: jest.fn().mockResolvedValue({ totalRevenue: 0, waivedFees: 0 }),
}));

// Mock timezone utilities
jest.mock('../utils/timezone', () => ({
  getDaysSinceNY: jest.fn(),
  getDaysBetweenNY: jest.fn(),
  getDaysAgoNY: jest.fn(),
  toNYDateString: jest.fn(),
  getTodayNY: jest.fn(),
}));

const { getDashboardStats } = require('../controllers/stats.controller');
const { getSupabaseClient } = require('../services/supabase.service');
const feeService = require('../services/fee.service');

const { getDaysSinceNY, toNYDateString, getTodayNY, getDaysAgoNY } = require('../utils/timezone');

/**
 * Helper to setup all required Supabase mocks for getDashboardStats
 * The controller makes these queries:
 * 1. package_fees (monthly revenue) - .select().eq().eq().not()
 * 2. contacts - .select().order()
 * 3. mail_items - .select().order()
 * 4. notification_history - .select()
 * 5. package_fees (all fees) - .select().in()
 */
function setupSupabaseMocks(mockSupabase, { contacts = [], mailItems = [], notifications = [], packageFees = [] }) {
  let packageFeesCallCount = 0;
  
  mockSupabase.from.mockImplementation((table) => {
    if (table === 'package_fees') {
      packageFeesCallCount++;
      
      if (packageFeesCallCount === 1) {
        // First call: all package fees query (.select().in())
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: packageFees,
              error: null,
            }),
          }),
        };
      } else {
        // Second call: monthly revenue query (.select().eq().eq().not())
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: packageFees.filter(f => f.fee_status === 'paid'),
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    } else if (table === 'contacts') {
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: contacts,
            error: null,
          }),
        }),
      };
    } else if (table === 'mail_items') {
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mailItems,
            error: null,
          }),
        }),
      };
    } else if (table === 'notification_history') {
      return {
        select: jest.fn().mockResolvedValue({
          data: notifications,
          error: null,
        }),
      };
    }
    // Default fallback
    return {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    };
  });
}

describe('Stats Controller - Dashboard Metrics', () => {
  let mockReq, mockRes, mockNext, mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request and response
    mockReq = {
      user: {
        id: 'test-user-id',
        token: 'test-token',
      },
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(),
    };

    getSupabaseClient.mockReturnValue(mockSupabase);
    feeService.updateFeesForAllPackages = jest.fn().mockResolvedValue({ updated: 0, errors: 0 });
    feeService.getRevenueStats = jest.fn().mockResolvedValue({ totalRevenue: 0, waivedFees: 0 });
    
    // Default timezone mocks
    getTodayNY.mockReturnValue('2025-12-11');
    getDaysSinceNY.mockReturnValue(0);
    getDaysAgoNY.mockReturnValue('2025-12-08');
    toNYDateString.mockImplementation((date) => {
      if (typeof date === 'string') {
        return date.split('T')[0];
      }
      return '2025-12-11';
    });
  });

  describe('Today\'s Mail (NY Timezone)', () => {
    it('should count mail items received today in NY timezone', async () => {
      toNYDateString.mockImplementation((date) => {
        if (typeof date === 'string' && date.includes('2025-12-11')) {
          return '2025-12-11';
        }
        return '2025-12-10';
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [{ contact_id: 'c1', status: 'Active', created_at: '2025-12-10T00:00:00Z' }],
        mailItems: [
          { mail_item_id: 'm1', received_date: '2025-12-11T08:00:00Z', status: 'Received', contacts: {} },
          { mail_item_id: 'm2', received_date: '2025-12-11T14:00:00Z', status: 'Received', contacts: {} },
          { mail_item_id: 'm3', received_date: '2025-12-11T20:00:00Z', status: 'Received', contacts: {} },
          { mail_item_id: 'm4', received_date: '2025-12-10T08:00:00Z', status: 'Received', contacts: {} },
          { mail_item_id: 'm5', received_date: '2025-12-10T14:00:00Z', status: 'Received', contacts: {} },
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      // Debug: Check if error was called
      if (mockNext.mock.calls.length > 0) {
        console.error('Controller error:', mockNext.mock.calls[0][0]);
      }

      // Controller calls res.json() directly without res.status(200)
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          todaysMail: 3, // Only items with NY date 2025-12-11
        })
      );
    });

    it('should handle timezone edge case (8pm NY vs midnight UTC)', async () => {
      getTodayNY.mockReturnValue('2025-12-10');
      toNYDateString.mockImplementation((date) => {
        // 8pm EST Dec 10 = 1am UTC Dec 11
        if (typeof date === 'string' && date.includes('2025-12-11T01:00:00')) {
          return '2025-12-10';
        }
        return '2025-12-09';
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [{ contact_id: 'c1', status: 'Active', created_at: '2025-12-09T00:00:00Z' }],
        mailItems: [
          { mail_item_id: 'm1', received_date: '2025-12-11T01:00:00Z', status: 'Received', contacts: {} }, // 8pm EST Dec 10
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          todaysMail: 1, // Should count as Dec 10 in NY timezone
        })
      );
    });
  });

  describe('Completed Today (NY Timezone)', () => {
    it('should count pickups completed today in NY timezone', async () => {
      toNYDateString.mockImplementation((date) => {
        if (typeof date === 'string' && date.includes('2025-12-11')) {
          return '2025-12-11';
        }
        return '2025-12-10';
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [{ contact_id: 'c1', status: 'Active', created_at: '2025-12-10T00:00:00Z' }],
        mailItems: [
          { mail_item_id: 'm1', status: 'Picked Up', pickup_date: '2025-12-11T10:00:00Z', received_date: '2025-12-09T10:00:00Z', contacts: {} },
          { mail_item_id: 'm2', status: 'Picked Up', pickup_date: '2025-12-11T15:00:00Z', received_date: '2025-12-08T10:00:00Z', contacts: {} },
          { mail_item_id: 'm3', status: 'Picked Up', pickup_date: '2025-12-10T10:00:00Z', received_date: '2025-12-07T10:00:00Z', contacts: {} },
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completedToday: 2,
        })
      );
    });
  });

  describe('Overdue Mail (NY Timezone)', () => {
    it('should count items 7+ days old using NY timezone', async () => {
      getDaysSinceNY.mockImplementation((date) => {
        if (date && date.includes('2025-12-03')) return 8;
        if (date && date.includes('2025-12-02')) return 9;
        if (date && date.includes('2025-12-06')) return 5;
        return 0;
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [{ contact_id: 'c1', status: 'Active', created_at: '2025-12-01T00:00:00Z' }],
        mailItems: [
          { mail_item_id: 'm1', received_date: '2025-12-03T10:00:00Z', status: 'Received', contacts: {} }, // 8 days
          { mail_item_id: 'm2', received_date: '2025-12-02T10:00:00Z', status: 'Notified', contacts: {} }, // 9 days
          { mail_item_id: 'm3', received_date: '2025-12-06T10:00:00Z', status: 'Received', contacts: {} }, // 5 days
          { mail_item_id: 'm4', received_date: '2025-12-01T10:00:00Z', status: 'Picked Up', contacts: {} }, // Picked up
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          overdueMail: 2, // Only m1 and m2 (7+ days old)
        })
      );
    });
  });

  describe('Needs Follow-up (NY Timezone)', () => {
    it('should include items notified 3+ days ago using NY timezone', async () => {
      getDaysAgoNY.mockReturnValue('2025-12-08');
      toNYDateString.mockImplementation((date) => {
        if (typeof date === 'string') {
          return date.split('T')[0];
        }
        return '2025-12-11';
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [
          { contact_id: 'c1', status: 'Active', created_at: '2025-12-01T00:00:00Z' },
          { contact_id: 'c2', status: 'Active', created_at: '2025-12-02T00:00:00Z' },
        ],
        mailItems: [
          { mail_item_id: 'm1', status: 'Notified', last_notified: '2025-12-07T10:00:00Z', received_date: '2025-12-05T10:00:00Z', contact_id: 'c1', contacts: { contact_id: 'c1' } },
          { mail_item_id: 'm2', status: 'Notified', last_notified: '2025-12-09T10:00:00Z', received_date: '2025-12-08T10:00:00Z', contact_id: 'c2', contacts: { contact_id: 'c2' } },
          { mail_item_id: 'm3', status: 'Received', last_notified: null, received_date: '2025-12-10T10:00:00Z', contact_id: 'c1', contacts: { contact_id: 'c1' } },
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          needsFollowUp: expect.any(Array),
        })
      );
    });
  });

  describe('Chart Data (NY Timezone)', () => {
    it('should generate chart data using NY timezone dates', async () => {
      mockReq.query.days = 7;
      
      getDaysAgoNY.mockImplementation((daysAgo) => {
        const dates = {
          0: '2025-12-11',
          1: '2025-12-10',
          2: '2025-12-09',
          3: '2025-12-08',
          4: '2025-12-07',
          5: '2025-12-06',
          6: '2025-12-05',
        };
        return dates[daysAgo] || '2025-12-05';
      });

      setupSupabaseMocks(mockSupabase, {
        contacts: [
          { contact_id: 'c1', status: 'Active', created_at: '2025-12-10T10:00:00Z' },
          { contact_id: 'c2', status: 'Active', created_at: '2025-12-10T15:00:00Z' },
          { contact_id: 'c3', status: 'Active', created_at: '2025-12-08T10:00:00Z' },
        ],
        mailItems: [
          { mail_item_id: 'm1', received_date: '2025-12-10T08:00:00Z', item_type: 'Letter', status: 'Received', contacts: {} },
          { mail_item_id: 'm2', received_date: '2025-12-10T14:00:00Z', item_type: 'Package', status: 'Received', contacts: {} },
          { mail_item_id: 'm3', received_date: '2025-12-08T10:00:00Z', item_type: 'Letter', status: 'Received', contacts: {} },
        ],
      });

      await getDashboardStats(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mailVolumeData: expect.arrayContaining([
            expect.objectContaining({ date: expect.any(String) }),
          ]),
          customerGrowthData: expect.arrayContaining([
            expect.objectContaining({ date: expect.any(String) }),
          ]),
        })
      );
    });
  });
});
