const request = require('supertest');
const app = require('../server');
const { supabase, getSupabaseClient } = require('../services/supabase.service');
const { sendTemplateEmail } = require('../services/email.service');

// Mock Supabase
jest.mock('../services/supabase.service', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn()
  },
  supabaseAdmin: {
    from: jest.fn()
  },
  getSupabaseClient: jest.fn()
}));

// Mock email service
jest.mock('../services/email.service', () => ({
  sendTemplateEmail: jest.fn()
}));

describe('Bulk Email Notifications API', () => {
  let mockToken;
  let mockUserId = 'test-user-id-123';

  const mockContact = {
    contact_id: 'contact-123',
    email: 'customer@example.com',
    contact_person: 'John Doe',
    company_name: 'Test Company',
    mailbox_number: 'A123',
    preferred_language: 'en'
  };

  const mockTemplate = {
    template_id: 'template-summary',
    template_name: 'Summary Notification (All Items)',
    template_type: 'Summary',
    subject_line: 'Your items at Mei Way Mail Plus - Mailbox {BoxNumber}',
    message_body: 'Hello {Name}, You have {TotalItems} items waiting. {ItemSummary}'
  };

  const mockMailItems = [
    {
      mail_item_id: 'mail-1',
      item_type: 'Package',
      received_date: '2024-11-25',
      package_fee: 10.00
    },
    {
      mail_item_id: 'mail-2',
      item_type: 'Package',
      received_date: '2024-11-26',
      package_fee: 15.00
    },
    {
      mail_item_id: 'mail-3',
      item_type: 'Letter',
      received_date: '2024-11-27',
      package_fee: null
    }
  ];

  // Helper to create a fully configured mock Supabase client
  const createMockSupabaseClient = (options = {}) => {
    const {
      contactData = mockContact,
      templateData = mockTemplate,
      mailItemsData = mockMailItems,
      contactError = null,
      templateError = null,
      mailItemsError = null,
      updateError = null
    } = options;

    return {
      from: jest.fn((table) => {
        if (table === 'contacts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: contactData,
              error: contactError
            })
          };
        }
        if (table === 'message_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: templateData,
              error: templateError
            })
          };
        }
        if (table === 'mail_items') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: mailItemsData,
              error: mailItemsError
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: updateError
              })
            })
          };
        }
        if (table === 'outreach_messages') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { message_id: 'outreach-123' },
              error: null
            })
          };
        }
        if (table === 'action_history') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        if (table === 'notification_history') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: mockUserId, email: 'test@example.com' } },
          error: null
        })
      }
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'mock-jwt-token';

    // Mock authenticated user
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId, email: 'test@example.com' } },
      error: null
    });
  });

  describe('POST /api/emails/send-bulk', () => {
    it('should successfully send bulk notification email', async () => {
      // Setup mock
      const mockClient = createMockSupabaseClient();
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      sendTemplateEmail.mockResolvedValue({
        success: true,
        messageId: 'gmail-bulk-123'
      });

      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2', 'mail-3'],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should update all mail items to Notified status', async () => {
      const mockClient = createMockSupabaseClient();
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      sendTemplateEmail.mockResolvedValue({ success: true, messageId: 'test-123' });

      await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2', 'mail-3'],
          sent_by: 'Merlin'
        });

      // Verify mail_items table was accessed for update
      expect(mockClient.from).toHaveBeenCalledWith('mail_items');
    });

    it('should create action history entries', async () => {
      const mockClient = createMockSupabaseClient();
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      sendTemplateEmail.mockResolvedValue({ success: true, messageId: 'test-123' });

      await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2', 'mail-3'],
          sent_by: 'Madison'
        });

      // Verify action_history table was accessed
      expect(mockClient.from).toHaveBeenCalledWith('action_history');
    });

    it('should return 400 when contact_id is missing', async () => {
      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2'],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('contact_id');
    });

    it('should return 400 when template_id is missing', async () => {
      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          mail_item_ids: ['mail-1', 'mail-2'],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('template_id');
    });

    it('should return 400 when mail_item_ids is missing', async () => {
      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          sent_by: 'Madison'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mail_item_ids');
    });

    it('should return 400 when mail_item_ids is empty', async () => {
      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: [],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mail_item_ids');
    });

    it('should return 400 when contact has no email', async () => {
      const mockClient = createMockSupabaseClient({
        contactData: { ...mockContact, email: null }
      });
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2'],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Contact has no email address');
    });

    it('should handle email sending failures gracefully', async () => {
      const mockClient = createMockSupabaseClient();
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      // Mock email service failure
      sendTemplateEmail.mockRejectedValue(new Error('Gmail disconnected'));

      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2'],
          sent_by: 'Madison'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.error).toBeDefined();
    });

    it('should correctly count quantities when mail items have quantity > 1', async () => {
      // Mock mail items with quantities
      const mockMailItemsWithQuantities = [
        {
          mail_item_id: 'mail-1',
          item_type: 'Package',
          received_date: '2024-11-25',
          quantity: 2,
          package_fees: [{ fee_amount: 10.00, fee_status: 'pending' }]
        },
        {
          mail_item_id: 'mail-2',
          item_type: 'Letter',
          received_date: '2024-11-26',
          quantity: 5
        },
        {
          mail_item_id: 'mail-3',
          item_type: 'Package',
          received_date: '2024-11-27',
          quantity: 1,
          package_fees: [{ fee_amount: 15.00, fee_status: 'pending' }]
        }
      ];

      const mockClient = createMockSupabaseClient({
        mailItemsData: mockMailItemsWithQuantities
      });
      supabase.from = mockClient.from;
      getSupabaseClient.mockReturnValue(mockClient);

      sendTemplateEmail.mockResolvedValue({ messageId: 'msg-123' });

      const response = await request(app)
        .post('/api/emails/send-bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          contact_id: 'contact-123',
          template_id: 'template-summary',
          mail_item_ids: ['mail-1', 'mail-2', 'mail-3'],
          sent_by: 'Madison'
        });

      expect(response.status).toBe(200);
      expect(sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            TotalItems: 8,        // 2 + 5 + 1 = 8 total items
            TotalPackages: 3,     // 2 + 1 = 3 packages
            TotalLetters: 5       // 5 letters
          })
        })
      );
    });
  });
});
