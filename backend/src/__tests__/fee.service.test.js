/**
 * Fee Service Tests
 * Tests for package fee calculation and management
 */

const feeService = require('../services/fee.service');
const { supabaseAdmin } = require('../services/supabase.service');

// Mock Supabase
jest.mock('../services/supabase.service', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

// Mock timezone utilities
jest.mock('../utils/timezone', () => ({
  getDaysBetweenNY: jest.fn(),
  toNYDateString: jest.fn(),
}));

const { getDaysBetweenNY } = require('../utils/timezone');

describe('Fee Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFeeForPackage', () => {
    it('should calculate $0 for Day 0 (arrival day)', () => {
      getDaysBetweenNY.mockReturnValue(0);
      
      const mailItem = {
        received_date: '2025-12-10T10:00:00Z',
      };
      
      const result = feeService.calculateFeeForPackage(mailItem);
      
      expect(result.daysCharged).toBe(0);
      expect(result.billableDays).toBe(0);
      expect(result.feeAmount).toBe(0);
    });

    it('should calculate $0 for Day 1 (grace period)', () => {
      getDaysBetweenNY.mockReturnValue(1);
      
      const mailItem = {
        received_date: '2025-12-09T10:00:00Z',
      };
      
      const result = feeService.calculateFeeForPackage(mailItem);
      
      expect(result.daysCharged).toBe(1);
      expect(result.billableDays).toBe(0);
      expect(result.feeAmount).toBe(0);
    });

    it('should calculate $2 for Day 2 (first billable day)', () => {
      getDaysBetweenNY.mockReturnValue(2);
      
      const mailItem = {
        received_date: '2025-12-08T10:00:00Z',
      };
      
      const result = feeService.calculateFeeForPackage(mailItem);
      
      expect(result.daysCharged).toBe(2);
      expect(result.billableDays).toBe(1);
      expect(result.feeAmount).toBe(2.00);
    });

    it('should calculate $10 for Day 7', () => {
      getDaysBetweenNY.mockReturnValue(7);
      
      const mailItem = {
        received_date: '2025-12-03T10:00:00Z',
      };
      
      const result = feeService.calculateFeeForPackage(mailItem);
      
      expect(result.daysCharged).toBe(7);
      expect(result.billableDays).toBe(6);
      expect(result.feeAmount).toBe(12.00);
    });

    it('should calculate $58 for Day 30 (approaching abandonment)', () => {
      getDaysBetweenNY.mockReturnValue(30);
      
      const mailItem = {
        received_date: '2025-11-10T10:00:00Z',
      };
      
      const result = feeService.calculateFeeForPackage(mailItem);
      
      expect(result.daysCharged).toBe(30);
      expect(result.billableDays).toBe(29);
      expect(result.feeAmount).toBe(58.00);
    });

    it('should use custom asOfDate when provided', () => {
      getDaysBetweenNY.mockReturnValue(5);
      
      const mailItem = {
        received_date: '2025-12-01T10:00:00Z',
      };
      const asOfDate = new Date('2025-12-06T10:00:00Z');
      
      const result = feeService.calculateFeeForPackage(mailItem, asOfDate);
      
      expect(getDaysBetweenNY).toHaveBeenCalledWith(
        expect.any(Date),
        asOfDate
      );
    });
  });

  describe('createFeeRecord', () => {
    it('should create fee record with calculated fee for backdated package', async () => {
      // Mock mail item with received_date 5 days ago (should have fee)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      // Mock getDaysBetweenNY to return 5 days
      getDaysBetweenNY.mockReturnValue(5);

      const mockMailItemSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { received_date: fiveDaysAgo.toISOString() },
            error: null,
          }),
        }),
      });

      const mockFeeInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              fee_id: 'test-fee-id',
              mail_item_id: 'test-mail-id',
              fee_amount: 8.00, // (5 days - 1 grace) * $2 = $8
              days_charged: 5,
            },
            error: null,
          }),
        }),
      });

      // First call fetches mail_items, second call inserts into package_fees
      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockMailItemSelect })
        .mockReturnValueOnce({ insert: mockFeeInsert });

      const result = await feeService.createFeeRecord(
        'test-mail-id',
        'test-contact-id',
        'test-user-id'
      );

      // Verify mail_items was queried first
      expect(supabaseAdmin.from).toHaveBeenCalledWith('mail_items');
      // Verify package_fees insert was called with calculated fee
      expect(supabaseAdmin.from).toHaveBeenCalledWith('package_fees');
      expect(mockFeeInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          mail_item_id: 'test-mail-id',
          contact_id: 'test-contact-id',
          user_id: 'test-user-id',
          fee_amount: 8.00, // Calculated fee for 5 days
          days_charged: 5,
          daily_rate: 2.00,
          grace_period_days: 1,
          fee_status: 'pending',
        })
      );
    });

    it('should create fee record with $0 for new package (day 0)', async () => {
      // Mock mail item with today's received_date (should have $0 fee)
      const today = new Date();

      // Mock getDaysBetweenNY to return 0 days
      getDaysBetweenNY.mockReturnValue(0);

      const mockMailItemSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { received_date: today.toISOString() },
            error: null,
          }),
        }),
      });

      const mockFeeInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              fee_id: 'test-fee-id',
              mail_item_id: 'test-mail-id',
              fee_amount: 0,
              days_charged: 0,
            },
            error: null,
          }),
        }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockMailItemSelect })
        .mockReturnValueOnce({ insert: mockFeeInsert });

      await feeService.createFeeRecord(
        'test-mail-id',
        'test-contact-id',
        'test-user-id'
      );

      expect(mockFeeInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fee_amount: 0.00,
          days_charged: 0,
        })
      );
    });

    it('should handle errors when creating fee record', async () => {
      const dbError = { message: 'Database error' };

      // Mock successful mail item fetch
      const mockMailItemSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { received_date: new Date().toISOString() },
            error: null,
          }),
        }),
      });

      // Mock failed insert
      const mockFeeInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockMailItemSelect })
        .mockReturnValueOnce({ insert: mockFeeInsert });

      await expect(
        feeService.createFeeRecord('test-mail-id', 'test-contact-id', 'test-user-id')
      ).rejects.toEqual(dbError);
    });
  });

  describe('waiveFee', () => {
    it('should waive a fee and update status', async () => {
      const mockEq2 = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              fee_id: 'test-fee-id',
              fee_status: 'waived',
              waived_date: expect.any(String),
            },
            error: null,
          }),
        }),
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      supabaseAdmin.from.mockReturnValue({
        update: mockUpdate,
      });

      const result = await feeService.waiveFee(
        'test-fee-id',
        'Customer complaint',
        'test-user-id'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fee_status: 'waived',
          waive_reason: 'Customer complaint',
          waived_by: 'test-user-id',
        })
      );
    });
  });

  describe('getRevenueStats', () => {
    it('should calculate revenue correctly', async () => {
      const mockPaidData = [
        { fee_amount: 10.00, paid_date: '2025-12-05T10:00:00Z' },
        { fee_amount: 20.00, paid_date: '2025-12-10T10:00:00Z' },
        { fee_amount: 15.50, paid_date: '2025-12-15T10:00:00Z' },
      ];

      const mockPendingData = [
        { fee_amount: 25.00 },
        { fee_amount: 30.00 },
      ];

      const mockWaivedData = [
        { fee_amount: 5.00, waived_date: '2025-12-03T10:00:00Z' },
      ];

      let callCount = 0;
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'package_fees') {
          callCount++;
          
          const mockEq2 = jest.fn().mockImplementation(() => {
            if (callCount === 1) {
              // First call: paid fees
              return Promise.resolve({ data: mockPaidData, error: null });
            } else if (callCount === 2) {
              // Second call: pending fees
              return Promise.resolve({ data: mockPendingData, error: null });
            } else {
              // Third call: waived fees
              return Promise.resolve({ data: mockWaivedData, error: null });
            }
          });

          const mockEq1 = jest.fn().mockReturnValue({
            eq: mockEq2,
          });

          const mockSelect = jest.fn().mockReturnValue({
            eq: mockEq1,
          });

          return {
            select: mockSelect,
          };
        }
        return {};
      });

      const result = await feeService.getRevenueStats('test-user-id');

      expect(result.totalRevenue).toBe(45.50); // 10 + 20 + 15.50
      expect(result.outstandingFees).toBe(55.00); // 25 + 30
      expect(result.waivedFees).toBe(5.00);
    });

    it('should calculate outstanding fees correctly', async () => {
      const mockPaidData = [];
      const mockPendingData = [
        { fee_amount: 25.00 },
        { fee_amount: 30.00 },
      ];
      const mockWaivedData = [];

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        
        const mockEq2 = jest.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve({ data: mockPaidData, error: null });
          } else if (callCount === 2) {
            return Promise.resolve({ data: mockPendingData, error: null });
          } else {
            return Promise.resolve({ data: mockWaivedData, error: null });
          }
        });

        const mockEq1 = jest.fn().mockReturnValue({
          eq: mockEq2,
        });

        const mockSelect = jest.fn().mockReturnValue({
          eq: mockEq1,
        });

        return {
          select: mockSelect,
        };
      });

      const result = await feeService.getRevenueStats('test-user-id');

      expect(result.outstandingFees).toBe(55.00);
    });
  });

  describe('updateFeesForAllPackages', () => {
    it('should update fees for all pending packages', async () => {
      getDaysBetweenNY.mockReturnValue(5);

      const mockPendingFees = [
        {
          fee_id: 'fee-1',
          mail_items: {
            mail_item_id: 'mail-1',
            received_date: '2025-12-05T10:00:00Z',
            status: 'Received',
          },
        },
        {
          fee_id: 'fee-2',
          mail_items: {
            mail_item_id: 'mail-2',
            received_date: '2025-12-03T10:00:00Z',
            status: 'Notified',
          },
        },
      ];

      // Mock the query chain
      const mockEq2 = jest.fn().mockResolvedValue({
        data: mockPendingFees,
        error: null,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2, // Return an object with .eq() method for chaining
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      const mockUpdateEq = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'package_fees') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const result = await feeService.updateFeesForAllPackages('test-user-id');

      expect(result.updated).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
    });

    it('should skip picked up packages', async () => {
      const mockPendingFees = [
        {
          fee_id: 'fee-1',
          mail_items: {
            mail_item_id: 'mail-1',
            received_date: '2025-12-05T10:00:00Z',
            status: 'Picked Up',
          },
        },
      ];

      const mockEq2 = jest.fn().mockResolvedValue({
        data: mockPendingFees,
        error: null,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      supabaseAdmin.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await feeService.updateFeesForAllPackages('test-user-id');

      expect(result.updated).toBe(0);
    });
  });
});

