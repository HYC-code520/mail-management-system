const request = require('supertest');
const express = require('express');
const mailItemsRouter = require('../routes/mailItems.routes');

// Mock the Supabase service
jest.mock('../services/supabase.service', () => ({
  getSupabaseClient: jest.fn()
}));

// Mock the auth middleware
jest.mock('../middleware/auth.middleware', () => {
  return (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      token: 'test-token'
    };
    next();
  };
});

const { getSupabaseClient } = require('../services/supabase.service');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/mail-items', mailItemsRouter);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });
  
  return app;
};

describe('Mail Items API', () => {
  let app;
  let mockSupabaseClient;

  beforeEach(() => {
    app = createTestApp();
    
    // Create a proper query builder mock that chains correctly
    const createQueryBuilder = () => {
      const builder = {
        from: jest.fn(),
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        eq: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        order: jest.fn(),
        single: jest.fn()
      };
      
      // Make all methods return the builder for chaining
      Object.keys(builder).forEach(key => {
        builder[key].mockReturnValue(builder);
      });
      
      return builder;
    };
    
    mockSupabaseClient = createQueryBuilder();
    getSupabaseClient.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/mail-items', () => {
    it('should return all mail items', async () => {
      const mockMailItems = [
        {
          mail_item_id: '1',
          contact_id: 'contact-1',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-11-22',
          notification_count: 0, // Added for notification history feature
          contacts: {
            contact_person: 'John Doe',
            mailbox_number: 'MB-101'
          }
        }
      ];

      // The controller awaits query directly (not .execute())
      // So we need to make the query itself awaitable
      const mockQuery = Promise.resolve({
        data: mockMailItems,
        error: null
      });
      
      mockSupabaseClient.order.mockReturnValue(mockQuery);

      // Mock the notification history query (for batched notification counts)
      const notificationChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      
      // When from('notification_history') is called, return the notification chain
      mockSupabaseClient.from.mockImplementation((tableName) => {
        if (tableName === 'notification_history') {
          return notificationChain;
        }
        return mockSupabaseClient;
      });

      const response = await request(app)
        .get('/api/mail-items')
        .expect(200);

      // Expect enriched data with notification_count
      const expectedData = mockMailItems.map(item => ({ ...item, notification_count: 0 }));
      expect(response.body).toEqual(expectedData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('mail_items');
    });

    it('should filter by contact_id', async () => {
      // Mock the eq method to return a promise
      const mockQuery = Promise.resolve({
        data: [],
        error: null
      });
      
      mockSupabaseClient.eq.mockReturnValue(mockQuery);

      // Mock the notification history query (even for empty results)
      const notificationChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      
      mockSupabaseClient.from.mockImplementation((tableName) => {
        if (tableName === 'notification_history') {
          return notificationChain;
        }
        return mockSupabaseClient;
      });

      await request(app)
        .get('/api/mail-items?contact_id=contact-123')
        .expect(200);

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('contact_id', 'contact-123');
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = Promise.resolve({
        data: null,
        error: new Error('Database connection failed')
      });
      
      mockSupabaseClient.order.mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/mail-items')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/mail-items', () => {
    it('should create a new mail item', async () => {
      const newMailItem = {
        contact_id: 'contact-123',
        item_type: 'Package',
        description: 'Test package',
        status: 'Received'
      };

      const createdMailItem = {
        mail_item_id: 'mail-1',
        ...newMailItem,
        received_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdMailItem,
        error: null
      });

      const response = await request(app)
        .post('/api/mail-items')
        .send(newMailItem)
        .expect(201);

      expect(response.body).toHaveProperty('mail_item_id');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should return 400 when contact_id is missing', async () => {
      const invalidMailItem = {
        item_type: 'Package',
        description: 'No contact'
      };

      const response = await request(app)
        .post('/api/mail-items')
        .send(invalidMailItem)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('contact_id is required');
    });

    it('should return 400 when status is invalid', async () => {
      const invalidMailItem = {
        contact_id: 'contact-123',
        item_type: 'Package',
        status: 'Invalid Status'
      };

      const response = await request(app)
        .post('/api/mail-items')
        .send(invalidMailItem)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status');
    });

    it('should create mail item with new status values', async () => {
      const newStatuses = ['Scanned Document', 'Forward', 'Abandoned Package'];
      
      for (const status of newStatuses) {
        const mailItem = {
          contact_id: 'contact-123',
          item_type: 'Package',
          status: status
        };

        const createdItem = {
          mail_item_id: 'mail-1',
          ...mailItem,
          received_date: new Date().toISOString()
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: createdItem,
          error: null
        });

        const response = await request(app)
          .post('/api/mail-items')
          .send(mailItem)
          .expect(201);

        expect(response.body.status).toBe(status);
      }
    });
  });

  describe('PUT /api/mail-items/:id', () => {
    it('should update mail item status', async () => {
      const updateData = {
        status: 'Notified'
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        status: 'Notified',
        contact_id: 'contact-123'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      // Controller returns { mailItem: data }
      expect(response.body).toHaveProperty('mailItem');
      expect(response.body.mailItem.status).toBe('Notified');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('should return 500 for database errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const response = await request(app)
        .put('/api/mail-items/non-existent')
        .send({ status: 'Notified' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors during update', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ status: 'Notified' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when no update fields provided', async () => {
      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No update fields provided');
    });

    it('should update mail item with new status values', async () => {
      const newStatuses = ['Scanned Document', 'Forward', 'Abandoned Package'];
      
      for (const status of newStatuses) {
        const updatedItem = {
          mail_item_id: 'mail-1',
          status: status
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: updatedItem,
          error: null
        });

        const response = await request(app)
          .put('/api/mail-items/mail-1')
          .send({ status: status })
          .expect(200);

        expect(response.body.mailItem.status).toBe(status);
      }
    });

    it('should return 400 when updating with invalid status', async () => {
      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ status: 'Invalid Status' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status');
    });

    it('should update mail item quantity', async () => {
      const updateData = {
        quantity: 5
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        contact_id: 'contact-123',
        quantity: 5,
        status: 'Received'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('mailItem');
      expect(response.body.mailItem.quantity).toBe(5);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 })
      );
    });

    it('should return 400 when updating with invalid quantity (negative)', async () => {
      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ quantity: -1 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity must be a positive integer');
    });

    it('should return 400 when updating with invalid quantity (zero)', async () => {
      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity must be a positive integer');
    });

    it('should return 400 when updating with invalid quantity (decimal)', async () => {
      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ quantity: 3.5 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity must be a positive integer');
    });

    it('should update received_date', async () => {
      const newDate = '2025-11-25';
      const updateData = {
        received_date: newDate
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        contact_id: 'contact-123',
        received_date: newDate,
        status: 'Received'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('mailItem');
      expect(response.body.mailItem.received_date).toBe(newDate);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ received_date: newDate })
      );
    });

    it('should update multiple fields at once (quantity, status, date)', async () => {
      const updateData = {
        quantity: 3,
        status: 'Notified',
        received_date: '2025-11-24'
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        contact_id: 'contact-123',
        quantity: 3,
        status: 'Notified',
        received_date: '2025-11-24'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('mailItem');
      expect(response.body.mailItem.quantity).toBe(3);
      expect(response.body.mailItem.status).toBe('Notified');
      expect(response.body.mailItem.received_date).toBe('2025-11-24');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3,
          status: 'Notified',
          received_date: '2025-11-24'
        })
      );
    });

    it('should set pickup_date when status is updated to "Picked Up"', async () => {
      const updateData = {
        status: 'Picked Up'
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        status: 'Picked Up',
        pickup_date: new Date().toISOString()
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      expect(response.body.mailItem.status).toBe('Picked Up');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Picked Up',
          pickup_date: expect.any(String)
        })
      );
    });

    it('should clear pickup_date when status changes from "Picked Up"', async () => {
      const updateData = {
        status: 'Received'
      };

      const updatedMailItem = {
        mail_item_id: 'mail-1',
        status: 'Received',
        pickup_date: null
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMailItem,
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send(updateData)
        .expect(200);

      expect(response.body.mailItem.status).toBe('Received');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Received',
          pickup_date: null
        })
      );
    });
  });
});

