/**
 * Fee Controller Tests
 * Tests for fee management API endpoints
 */

// Mock Supabase service FIRST (before any imports)
jest.mock('../services/supabase.service', () => {
  const mockSupabaseAdmin = {
    from: jest.fn(),
  };
  return {
    supabaseAdmin: mockSupabaseAdmin,
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(),
    })),
  };
});

// Mock auth middleware - it's exported as a single function
jest.mock('../middleware/auth.middleware', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const request = require('supertest');
const express = require('express');
const feeRoutes = require('../routes/fee.routes');
const feeService = require('../services/fee.service');
const supabaseService = require('../services/supabase.service');

// Mock the fee service
jest.mock('../services/fee.service');

const app = express();
app.use(express.json());
app.use('/api/fees', feeRoutes);

describe('Fee Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default Supabase mock chain
    const mockBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    
    supabaseService.supabaseAdmin.from = jest.fn().mockReturnValue(mockBuilder);
  });

  describe('GET /api/fees', () => {
    it('should return all fees for user', async () => {
      const mockFees = [
        {
          fee_id: 'fee-1',
          fee_amount: 10.00,
          fee_status: 'pending',
        },
        {
          fee_id: 'fee-2',
          fee_amount: 20.00,
          fee_status: 'paid',
        },
      ];

      // Mock the Supabase query chain
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockFees, error: null }),
      };
      
      supabaseService.supabaseAdmin.from = jest.fn().mockReturnValue(mockBuilder);

      const response = await request(app).get('/api/fees');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFees);
    });

    it('should handle errors when fetching fees', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };
      
      supabaseService.supabaseAdmin.from = jest.fn().mockReturnValue(mockBuilder);

      const response = await request(app).get('/api/fees');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/fees/outstanding', () => {
    it('should return outstanding fees', async () => {
      const mockFees = [
        {
          fee_id: 'fee-1',
          fee_amount: 25.00,
          fee_status: 'pending',
        },
      ];

      feeService.getOutstandingFees = jest.fn().mockResolvedValue(mockFees);

      const response = await request(app).get('/api/fees/outstanding');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFees);
    });
  });

  describe('GET /api/fees/revenue', () => {
    it('should return revenue statistics', async () => {
      const mockStats = {
        monthlyRevenue: 100.00,
        totalRevenue: 500.00,
        outstandingFees: 75.00,
      };

      feeService.getRevenueStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app).get('/api/fees/revenue');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });

    it('should accept date range parameters', async () => {
      feeService.getRevenueStats = jest.fn().mockResolvedValue({
        monthlyRevenue: 50.00,
        totalRevenue: 200.00,
        outstandingFees: 30.00,
      });

      const response = await request(app)
        .get('/api/fees/revenue')
        .query({ startDate: '2025-12-01', endDate: '2025-12-10' });

      expect(response.status).toBe(200);
      expect(feeService.getRevenueStats).toHaveBeenCalledWith(
        'test-user-id',
        '2025-12-01',
        '2025-12-10'
      );
    });
  });

  describe('POST /api/fees/:feeId/waive', () => {
    it('should waive a fee with valid reason', async () => {
      const mockWaivedFee = {
        fee_id: 'fee-1',
        fee_status: 'waived',
        waive_reason: 'Customer complaint',
        fee_amount: 10.00,
      };

      // Mock the fee fetch query (first call)
      const mockSelectBuilder = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            fee_id: 'fee-1', 
            user_id: 'test-user-id', 
            fee_status: 'pending', 
            mail_item_id: 'mail-1', 
            fee_amount: 10.00 
          },
          error: null
        }),
      };

      // Mock the action_history insert (second call)
      const mockInsertBuilder = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      let callCount = 0;
      supabaseService.supabaseAdmin.from = jest.fn().mockImplementation((table) => {
        callCount++;
        if (callCount === 1 && table === 'package_fees') {
          return { select: jest.fn().mockReturnValue(mockSelectBuilder) };
        } else if (callCount === 2 && table === 'action_history') {
          return mockInsertBuilder;
        }
        return { select: jest.fn().mockReturnThis(), insert: jest.fn().mockResolvedValue({}) };
      });

      feeService.waiveFee = jest.fn().mockResolvedValue(mockWaivedFee);

      const response = await request(app)
        .post('/api/fees/fee-1/waive')
        .send({ reason: 'Customer complaint' });

      expect(response.status).toBe(200);
      expect(response.body.fee).toEqual(mockWaivedFee);
      expect(feeService.waiveFee).toHaveBeenCalledWith(
        'fee-1',
        'Customer complaint',
        'test-user-id'
      );
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request(app)
        .post('/api/fees/fee-1/waive')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('reason');
    });

    it('should return 400 if reason is too short', async () => {
      const response = await request(app)
        .post('/api/fees/fee-1/waive')
        .send({ reason: 'ok' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 5 characters');
    });

    it('should waive fee with waived_by parameter for staff tracking', async () => {
      const mockWaivedFee = {
        fee_id: 'fee-1',
        fee_status: 'waived',
        waive_reason: 'Customer loyalty discount',
        fee_amount: 10.00,
      };

      // Mock the fee fetch query
      const mockSelectBuilder = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            fee_id: 'fee-1', 
            user_id: 'test-user-id', 
            fee_status: 'pending', 
            mail_item_id: 'mail-1', 
            fee_amount: 10.00 
          },
          error: null
        }),
      };

      // Mock the action_history insert
      let actionHistoryData = null;
      const mockInsertBuilder = {
        insert: jest.fn().mockImplementation((data) => {
          actionHistoryData = data;
          return Promise.resolve({ data: null, error: null });
        }),
      };

      let callCount = 0;
      supabaseService.supabaseAdmin.from = jest.fn().mockImplementation((table) => {
        callCount++;
        if (callCount === 1 && table === 'package_fees') {
          return { select: jest.fn().mockReturnValue(mockSelectBuilder) };
        } else if (callCount === 2 && table === 'action_history') {
          return mockInsertBuilder;
        }
        return { select: jest.fn().mockReturnThis(), insert: jest.fn().mockResolvedValue({}) };
      });

      feeService.waiveFee = jest.fn().mockResolvedValue(mockWaivedFee);

      const response = await request(app)
        .post('/api/fees/fee-1/waive')
        .send({ 
          reason: 'Customer loyalty discount',
          waived_by: 'Madison'
        });

      expect(response.status).toBe(200);
      expect(response.body.fee).toEqual(mockWaivedFee);
      
      // Verify action history was created with waived_by parameter
      expect(actionHistoryData).toBeTruthy();
      expect(actionHistoryData.performed_by).toBe('Madison');
      expect(actionHistoryData.action_type).toBe('Fee Waived');
    });

    it('should fall back to email when waived_by is not provided', async () => {
      const mockWaivedFee = {
        fee_id: 'fee-1',
        fee_status: 'waived',
        waive_reason: 'System error',
        fee_amount: 10.00,
      };

      // Mock the fee fetch query
      const mockSelectBuilder = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            fee_id: 'fee-1', 
            user_id: 'test-user-id', 
            fee_status: 'pending', 
            mail_item_id: 'mail-1', 
            fee_amount: 10.00 
          },
          error: null
        }),
      };

      // Mock the action_history insert
      let actionHistoryData = null;
      const mockInsertBuilder = {
        insert: jest.fn().mockImplementation((data) => {
          actionHistoryData = data;
          return Promise.resolve({ data: null, error: null });
        }),
      };

      let callCount = 0;
      supabaseService.supabaseAdmin.from = jest.fn().mockImplementation((table) => {
        callCount++;
        if (callCount === 1 && table === 'package_fees') {
          return { select: jest.fn().mockReturnValue(mockSelectBuilder) };
        } else if (callCount === 2 && table === 'action_history') {
          return mockInsertBuilder;
        }
        return { select: jest.fn().mockReturnThis(), insert: jest.fn().mockResolvedValue({}) };
      });

      feeService.waiveFee = jest.fn().mockResolvedValue(mockWaivedFee);

      const response = await request(app)
        .post('/api/fees/fee-1/waive')
        .send({ reason: 'System error' }); // No waived_by provided

      expect(response.status).toBe(200);
      
      // Verify action history falls back to user email
      expect(actionHistoryData).toBeTruthy();
      expect(actionHistoryData.performed_by).toBe('test@example.com');
    });
  });

  describe('POST /api/fees/:feeId/pay', () => {
    it('should mark fee as paid with valid payment method', async () => {
      const mockPaidFee = {
        fee_id: 'fee-1',
        fee_status: 'paid',
        payment_method: 'cash',
        fee_amount: 10.00,
      };

      // Mock the fee fetch query (first call)
      const mockSelectBuilder = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            fee_id: 'fee-1', 
            user_id: 'test-user-id', 
            fee_status: 'pending', 
            mail_item_id: 'mail-1',
            fee_amount: 10.00
          },
          error: null
        }),
      };

      // Mock the action_history insert (second call)
      const mockInsertBuilder = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      let callCount = 0;
      supabaseService.supabaseAdmin.from = jest.fn().mockImplementation((table) => {
        callCount++;
        if (callCount === 1 && table === 'package_fees') {
          return { select: jest.fn().mockReturnValue(mockSelectBuilder) };
        } else if (callCount === 2 && table === 'action_history') {
          return mockInsertBuilder;
        }
        return { select: jest.fn().mockReturnThis(), insert: jest.fn().mockResolvedValue({}) };
      });

      feeService.markFeePaid = jest.fn().mockResolvedValue(mockPaidFee);

      const response = await request(app)
        .post('/api/fees/fee-1/pay')
        .send({ paymentMethod: 'cash' });

      expect(response.status).toBe(200);
      expect(response.body.fee).toEqual(mockPaidFee);
      expect(feeService.markFeePaid).toHaveBeenCalledWith(
        'fee-1',
        'cash',
        undefined // collected_amount (optional, for discounted fees)
      );
    });

    it('should return 400 if payment method is invalid', async () => {
      const response = await request(app)
        .post('/api/fees/fee-1/pay')
        .send({ paymentMethod: 'Bitcoin' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid payment method');
    });
  });

  describe('POST /api/fees/recalculate', () => {
    it('should recalculate fees for all packages', async () => {
      const mockResult = {
        updated: 5,
        errors: 0,
        message: '5 fees updated successfully',
        success: true,
      };

      feeService.updateFeesForAllPackages = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app).post('/api/fees/recalculate');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(feeService.updateFeesForAllPackages).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle errors during recalculation', async () => {
      feeService.updateFeesForAllPackages = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).post('/api/fees/recalculate');

      expect(response.status).toBe(500);
      // Error is handled by error middleware, response body structure may vary
    });
  });

  describe('POST /api/fees/cron/update', () => {
    it('should update fees via cron job', async () => {
      const mockResult = {
        updated: 10,
        errors: 1,
      };

      // Set up CRON_SECRET environment variable
      process.env.CRON_SECRET = 'test-secret';

      feeService.updateFeesForAllPackages = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/fees/cron/update')
        .set('x-cron-secret', 'test-secret');

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(10);
    });
  });
});


