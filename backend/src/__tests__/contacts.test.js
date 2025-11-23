const request = require('supertest');
const express = require('express');
const contactsRouter = require('../routes/contacts.routes');

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
  app.use('/api/contacts', contactsRouter);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });
  
  return app;
};

describe('Contacts API', () => {
  let app;
  let mockSupabaseClient;

  beforeEach(() => {
    app = createTestApp();
    
    // Mock Supabase client methods
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    getSupabaseClient.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/contacts', () => {
    it('should return all contacts for authenticated user', async () => {
      const mockContacts = [
        {
          contact_id: '1',
          contact_person: 'John Doe',
          email: 'john@example.com',
          mailbox_number: 'MB-101'
        },
        {
          contact_id: '2',
          contact_person: 'Jane Smith',
          email: 'jane@example.com',
          mailbox_number: 'MB-102'
        }
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockContacts,
        error: null
      });

      const response = await request(app)
        .get('/api/contacts')
        .expect(200);

      expect(response.body).toEqual(mockContacts);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contacts');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });

    it('should filter contacts by search query', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null
      });

      await request(app)
        .get('/api/contacts?search=John')
        .expect(200);

      expect(mockSupabaseClient.or).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const response = await request(app)
        .get('/api/contacts')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact with valid data', async () => {
      const newContact = {
        contact_person: 'Test User',
        company_name: 'Test Company',
        email: 'test@company.com',
        phone: '555-1234',
        mailbox_number: 'MB-201',
        language_preference: 'English',
        status: 'Active'
      };

      const createdContact = {
        contact_id: 'new-id',
        ...newContact,
        phone_number: '555-1234',
        user_id: 'test-user-id',
        created_at: new Date().toISOString()
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: createdContact,
        error: null
      });

      const response = await request(app)
        .post('/api/contacts')
        .send(newContact)
        .expect(201);

      expect(response.body).toHaveProperty('contact_id');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contacts');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should map phone to phone_number field', async () => {
      const newContact = {
        contact_person: 'Test User',
        phone: '555-1234',
        mailbox_number: 'MB-201'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...newContact, contact_id: 'new-id' },
        error: null
      });

      await request(app)
        .post('/api/contacts')
        .send(newContact)
        .expect(201);

      const insertCall = mockSupabaseClient.insert.mock.calls[0][0];
      expect(insertCall).toHaveProperty('phone_number', '555-1234');
      expect(insertCall).not.toHaveProperty('phone');
    });

    it('should filter out invalid fields', async () => {
      const contactWithInvalidFields = {
        contact_person: 'Test User',
        mailbox_number: 'MB-201',
        wechat: 'invalid-field',
        customer_type: 'invalid-field',
        random_field: 'should-be-filtered'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { contact_id: 'new-id' },
        error: null
      });

      await request(app)
        .post('/api/contacts')
        .send(contactWithInvalidFields)
        .expect(201);

      const insertCall = mockSupabaseClient.insert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty('wechat');
      expect(insertCall).not.toHaveProperty('customer_type');
      expect(insertCall).not.toHaveProperty('random_field');
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return a single contact by ID', async () => {
      const mockContact = {
        contact_id: '123',
        contact_person: 'John Doe',
        email: 'john@example.com'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockContact,
        error: null
      });

      const response = await request(app)
        .get('/api/contacts/123')
        .expect(200);

      expect(response.body).toEqual(mockContact);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('contact_id', '123');
    });

    it('should return 404 for non-existent contact', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await request(app)
        .get('/api/contacts/non-existent')
        .expect(404);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update a contact with valid data', async () => {
      const updateData = {
        contact_person: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedContact = {
        contact_id: '123',
        ...updateData,
        user_id: 'test-user-id'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedContact,
        error: null
      });

      const response = await request(app)
        .put('/api/contacts/123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedContact);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('should filter out invalid fields on update', async () => {
      const updateData = {
        contact_person: 'Updated Name',
        wechat: 'should-be-filtered',
        invalid_field: 'also-filtered'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { contact_id: '123' },
        error: null
      });

      await request(app)
        .put('/api/contacts/123')
        .send(updateData)
        .expect(200);

      const updateCall = mockSupabaseClient.update.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('wechat');
      expect(updateCall).not.toHaveProperty('invalid_field');
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should soft delete a contact', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { contact_id: '123', status: 'No' },
        error: null
      });

      const response = await request(app)
        .delete('/api/contacts/123')
        .expect(204); // Changed from 200 to 204 (No Content)

      // No body expected for 204 responses
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ status: 'No' });
    });

    it('should return 404 when deleting non-existent contact', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await request(app)
        .delete('/api/contacts/non-existent')
        .expect(404);
    });
  });
});

