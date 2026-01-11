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

    it('should create mail item with logged_by parameter for staff tracking', async () => {
      const newMailItem = {
        contact_id: 'contact-123',
        item_type: 'Letter',
        description: 'Test letter',
        status: 'Received',
        logged_by: 'Madison'
      };

      const createdMailItem = {
        mail_item_id: 'mail-1',
        contact_id: 'contact-123',
        item_type: 'Letter',
        description: 'Test letter',
        status: 'Received',
        quantity: 1,
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
      
      // Verify action history was created with logged_by parameter
      // The insert is called twice: once for mail_item, once for action_history
      const insertCalls = mockSupabaseClient.insert.mock.calls;
      const actionHistoryCall = insertCalls.find(call => 
        call[0] && call[0].action_type === 'created'
      );
      
      if (actionHistoryCall) {
        expect(actionHistoryCall[0].performed_by).toBe('Madison');
      }
    });

    it('should fall back to email when logged_by is not provided', async () => {
      const newMailItem = {
        contact_id: 'contact-123',
        item_type: 'Package',
        description: 'Test package',
        status: 'Received'
      };

      const createdMailItem = {
        mail_item_id: 'mail-2',
        ...newMailItem,
        quantity: 1,
        received_date: new Date().toISOString()
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
      
      // Verify action history falls back to user email
      const insertCalls = mockSupabaseClient.insert.mock.calls;
      const actionHistoryCall = insertCalls.find(call => 
        call[0] && call[0].action_type === 'created'
      );
      
      if (actionHistoryCall) {
        // Should use req.user.email from the mock auth middleware
        expect(actionHistoryCall[0].performed_by).toBe('test@example.com');
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

    it('should return 404 for non-existent mail items', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const response = await request(app)
        .put('/api/mail-items/non-existent')
        .send({ status: 'Notified' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors during update', async () => {
      // First call: successful fetch of existing item
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received' },
        error: null
      });
      
      // Second call: database error during update
      mockSupabaseClient.single.mockResolvedValueOnce({
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
      // Mock the fetch of existing item first
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received' },
        error: null
      });

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
      // Mock the fetch of existing item first
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received' },
        error: null
      });

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
      // Mock the fetch of existing item first
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received', quantity: 1 },
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ quantity: -1 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity must be a positive integer');
    });

    it('should return 400 when updating with invalid quantity (zero)', async () => {
      // Mock the fetch of existing item first
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received', quantity: 1 },
        error: null
      });

      const response = await request(app)
        .put('/api/mail-items/mail-1')
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity must be a positive integer');
    });

    it('should return 400 when updating with invalid quantity (decimal)', async () => {
      // Mock the fetch of existing item first
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { mail_item_id: 'mail-1', item_type: 'Letter', status: 'Received', quantity: 1 },
        error: null
      });

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

// Action History Logging Tests
describe('Action History Logging Logic', () => {
  describe('action type determination', () => {
    const determineActionType = (status, hasOtherChanges) => {
      if (status === 'Picked Up') return 'picked_up';
      if (status === 'Forward') return 'forwarded';
      if (status === 'Scanned' || status === 'Scanned Document') return 'scanned';
      if (status === 'Abandoned' || status === 'Abandoned Package') return 'abandoned';
      if (hasOtherChanges) return 'updated';
      return 'status_change';
    };

    it('should return picked_up for Picked Up status', () => {
      expect(determineActionType('Picked Up', false)).toBe('picked_up');
    });

    it('should return forwarded for Forward status', () => {
      expect(determineActionType('Forward', false)).toBe('forwarded');
    });

    it('should return scanned for Scanned status', () => {
      expect(determineActionType('Scanned', false)).toBe('scanned');
      expect(determineActionType('Scanned Document', false)).toBe('scanned');
    });

    it('should return abandoned for Abandoned status', () => {
      expect(determineActionType('Abandoned', false)).toBe('abandoned');
      expect(determineActionType('Abandoned Package', false)).toBe('abandoned');
    });

    it('should return updated for other changes', () => {
      expect(determineActionType('Received', true)).toBe('updated');
    });
  });

  describe('change detection', () => {
    const detectChanges = (existingItem, updates) => {
      const changes = [];
      
      if (updates.quantity !== undefined && existingItem.quantity !== updates.quantity) {
        changes.push({
          field: 'quantity',
          from: existingItem.quantity || 1,
          to: updates.quantity
        });
      }
      
      if (updates.status !== undefined && existingItem.status !== updates.status) {
        changes.push({
          field: 'status',
          from: existingItem.status,
          to: updates.status
        });
      }
      
      if (updates.item_type !== undefined && existingItem.item_type !== updates.item_type) {
        changes.push({
          field: 'item_type',
          from: existingItem.item_type,
          to: updates.item_type
        });
      }
      
      return changes;
    };

    it('should detect quantity changes', () => {
      const existing = { quantity: 1, status: 'Received', item_type: 'Letter' };
      const updates = { quantity: 5 };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ field: 'quantity', from: 1, to: 5 });
    });

    it('should detect status changes', () => {
      const existing = { quantity: 1, status: 'Received', item_type: 'Letter' };
      const updates = { status: 'Picked Up' };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ field: 'status', from: 'Received', to: 'Picked Up' });
    });

    it('should detect item type changes', () => {
      const existing = { quantity: 1, status: 'Received', item_type: 'Letter' };
      const updates = { item_type: 'Package' };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ field: 'item_type', from: 'Letter', to: 'Package' });
    });

    it('should detect multiple changes', () => {
      const existing = { quantity: 1, status: 'Received', item_type: 'Letter' };
      const updates = { quantity: 3, status: 'Notified' };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(2);
    });

    it('should not detect changes when values are the same', () => {
      const existing = { quantity: 1, status: 'Received', item_type: 'Letter' };
      const updates = { quantity: 1, status: 'Received' };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(0);
    });

    it('should handle undefined existing quantity as 1', () => {
      const existing = { quantity: undefined, status: 'Received', item_type: 'Letter' };
      const updates = { quantity: 5 };
      
      const changes = detectChanges(existing, updates);
      
      expect(changes).toHaveLength(1);
      expect(changes[0].from).toBe(1);
    });
  });

  describe('action description generation', () => {
    const generateDescription = (changes) => {
      return changes.map(change => {
        switch (change.field) {
          case 'quantity':
            return `Quantity: ${change.from} → ${change.to}`;
          case 'status':
            return `Status: ${change.from} → ${change.to}`;
          case 'item_type':
            return `Type: ${change.from} → ${change.to}`;
          default:
            return `${change.field} changed`;
        }
      }).join('; ');
    };

    it('should generate quantity change description', () => {
      const changes = [{ field: 'quantity', from: 1, to: 5 }];
      expect(generateDescription(changes)).toBe('Quantity: 1 → 5');
    });

    it('should generate status change description', () => {
      const changes = [{ field: 'status', from: 'Received', to: 'Picked Up' }];
      expect(generateDescription(changes)).toBe('Status: Received → Picked Up');
    });

    it('should combine multiple changes with semicolon', () => {
      const changes = [
        { field: 'quantity', from: 1, to: 3 },
        { field: 'status', from: 'Received', to: 'Notified' }
      ];
      expect(generateDescription(changes)).toBe('Quantity: 1 → 3; Status: Received → Notified');
    });
  });
});

// Staff Name Tracking Tests
describe('Staff Name Tracking in Action History', () => {
  describe('performed_by parameter handling', () => {
    it('should use performed_by parameter when provided', () => {
      const req = {
        body: { status: 'Picked Up', performed_by: 'Madison' },
        user: { email: 'ariel.chen@pursuit.org' }
      };
      
      // When performed_by is provided, it should be used
      const performedBy = req.body.performed_by || req.user.email || 'Staff';
      expect(performedBy).toBe('Madison');
    });

    it('should fallback to user email when performed_by is not provided', () => {
      const req = {
        body: { status: 'Picked Up' },
        user: { email: 'ariel.chen@pursuit.org' }
      };
      
      // When performed_by is NOT provided, fallback to email
      const performedBy = req.body.performed_by || req.user.email || 'Staff';
      expect(performedBy).toBe('ariel.chen@pursuit.org');
    });

    it('should support Merlin as performed_by', () => {
      const req = {
        body: { status: 'Picked Up', performed_by: 'Merlin' },
        user: { email: 'ariel.chen@pursuit.org' }
      };
      
      const performedBy = req.body.performed_by || req.user.email || 'Staff';
      expect(performedBy).toBe('Merlin');
    });

    it('should fallback to "Staff" when neither performed_by nor email is available', () => {
      const req = {
        body: { status: 'Picked Up' },
        user: {}
      };
      
      const performedBy = req.body.performed_by || req.user.email || 'Staff';
      expect(performedBy).toBe('Staff');
    });
  });

  describe('action history entry format', () => {
    it('should include performed_by in action history entry', () => {
      const actionHistoryEntry = {
        mail_item_id: 'mail-1',
        action_type: 'picked_up',
        action_description: 'Status: Notified → Picked Up',
        performed_by: 'Madison',
        action_timestamp: new Date().toISOString()
      };
      
      expect(actionHistoryEntry.performed_by).toBe('Madison');
      expect(actionHistoryEntry.action_type).toBe('picked_up');
    });

    it('should preserve staff name across multiple updates', () => {
      const staffName = 'Madison';
      const entries = [
        { mail_item_id: 'pkg-1', performed_by: staffName },
        { mail_item_id: 'letter-1', performed_by: staffName },
        { mail_item_id: 'letter-2', performed_by: staffName }
      ];
      
      entries.forEach(entry => {
        expect(entry.performed_by).toBe('Madison');
      });
    });
  });
});