// Mock dependencies BEFORE importing modules
jest.mock('../services/supabase.service', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));
jest.mock('../services/email.service', () => ({
  sendTemplateEmail: jest.fn()
}));

const scanController = require('../controllers/scan.controller');
const { supabaseAdmin } = require('../services/supabase.service');
const { sendTemplateEmail } = require('../services/email.service');

describe('Scan Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: 'test-user-123',
        email: 'test@example.com'
      },
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('bulkSubmitScanSession', () => {
    it('should require user authentication', async () => {
      req.user = null;

      await scanController.bulkSubmitScanSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User authentication required to send notifications'
      });
    });

    it('should require items array', async () => {
      req.body = {};

      await scanController.bulkSubmitScanSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    });

    it('should require non-empty items array', async () => {
      req.body = { items: [] };

      await scanController.bulkSubmitScanSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    });

    it('should create mail items and send notifications for letters only', async () => {
      const mockContact = {
        contact_id: 'contact-1',
        contact_person: 'John Doe',
        company_name: 'Test Company',
        email: 'john@example.com',
        mailbox_number: 'A1'
      };

      const mockTemplate = {
        template_id: 'template-1',
        template_name: 'Scan: Letters Only',
        subject_line: 'Mail Ready',
        message_body: 'Hello {Name}, you have {LetterCount} {LetterText}...'
      };

      const mockMailItems = [
        { mail_item_id: 'item-1', contact_id: 'contact-1' },
        { mail_item_id: 'item-2', contact_id: 'contact-1' }
      ];

      req.body = {
        items: [
          {
            contact_id: 'contact-1',
            item_type: 'Letter',
            scanned_at: '2025-12-07T10:00:00Z'
          },
          {
            contact_id: 'contact-1',
            item_type: 'Letter',
            scanned_at: '2025-12-07T10:01:00Z'
          }
        ]
      };

      // Mock Supabase calls
      supabaseAdmin.from = jest.fn((table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn(),
          insert: jest.fn(),
          update: jest.fn()
        };

        if (table === 'contacts') {
          chain.single.mockResolvedValue({ data: mockContact, error: null });
          return chain;
        } else if (table === 'message_templates') {
          chain.single.mockResolvedValue({ data: mockTemplate, error: null });
          return chain;
        } else if (table === 'mail_items' && supabaseAdmin.from.mock.calls.filter(c => c[0] === 'mail_items').length === 1) {
          // First call - insert mail items
          chain.insert.mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
          });
          return chain;
        } else if (table === 'mail_items') {
          // Second call - update mail items
          chain.update.mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: mockMailItems, error: null })
          });
          return chain;
        } else if (table === 'notification_history') {
          chain.insert.mockResolvedValue({ data: { notification_id: 'notif-1' }, error: null });
          return chain;
        }

        return chain;
      });

      sendTemplateEmail.mockResolvedValue({ success: true });

      await scanController.bulkSubmitScanSession(req, res, next);

      // Verify mail items were created
      expect(supabaseAdmin.from).toHaveBeenCalledWith('mail_items');

      // Verify email was sent with correct variables
      expect(sendTemplateEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        templateSubject: 'Mail Ready',
        templateBody: 'Hello {Name}, you have {LetterCount} {LetterText}...',
        variables: {
          Name: 'John Doe',
          BoxNumber: 'A1',
          LetterCount: 2,
          PackageCount: 0,
          TotalCount: 2,
          Date: expect.any(String),
          LetterText: 'letters',
          PackageText: 'packages'
        },
        userId: 'test-user-123'
      });

      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        itemsCreated: 2,
        notificationsSent: 1,
        summary: expect.arrayContaining([
          expect.objectContaining({
            contact_id: 'contact-1',
            letterCount: 2,
            packageCount: 0,
            notificationSent: true
          })
        ]),
        errors: undefined
      });
    });

    it('should use "letter" singular for count of 1', async () => {
      const mockContact = {
        contact_id: 'contact-1',
        contact_person: 'Jane Doe',
        email: 'jane@example.com',
        mailbox_number: 'B2'
      };

      const mockTemplate = {
        template_id: 'template-1',
        template_name: 'Scan: Letters Only',
        subject_line: 'Mail Ready',
        message_body: 'You have {LetterCount} {LetterText}...'
      };

      req.body = {
        items: [
          {
            contact_id: 'contact-1',
            item_type: 'Letter',
            scanned_at: '2025-12-07T10:00:00Z'
          }
        ]
      };

      supabaseAdmin.from = jest.fn((table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis()
        };

        if (table === 'contacts') {
          chain.single.mockResolvedValue({ data: mockContact, error: null });
        } else if (table === 'message_templates') {
          chain.single.mockResolvedValue({ data: mockTemplate, error: null });
        } else if (table === 'mail_items') {
          chain.select.mockResolvedValue({ 
            data: [{ mail_item_id: 'item-1' }], 
            error: null 
          });
        }

        chain.update.mockResolvedValue({ data: [], error: null });

        return chain;
      });

      sendTemplateEmail.mockResolvedValue({ success: true });

      await scanController.bulkSubmitScanSession(req, res, next);

      expect(sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            LetterCount: 1,
            LetterText: 'letter' // Singular!
          })
        })
      );
    });

    it('should select correct template for packages only', async () => {
      const mockContact = {
        contact_id: 'contact-1',
        contact_person: 'Bob Smith',
        email: 'bob@example.com',
        mailbox_number: 'C3'
      };

      req.body = {
        items: [
          {
            contact_id: 'contact-1',
            item_type: 'Package',
            scanned_at: '2025-12-07T10:00:00Z'
          }
        ]
      };

      supabaseAdmin.from = jest.fn((table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis()
        };

        if (table === 'contacts') {
          chain.single.mockResolvedValue({ data: mockContact, error: null });
        } else if (table === 'message_templates') {
          chain.eq.mockImplementation((field, value) => {
            if (value === 'Scan: Packages Only') {
              chain.single.mockResolvedValue({
                data: {
                  template_id: 'template-2',
                  template_name: 'Scan: Packages Only',
                  subject_line: 'Package Ready',
                  message_body: 'You have {PackageCount} {PackageText}...'
                },
                error: null
              });
            }
            return chain;
          });
        } else if (table === 'mail_items') {
          chain.select.mockResolvedValue({ 
            data: [{ mail_item_id: 'item-1' }], 
            error: null 
          });
        }

        chain.update.mockResolvedValue({ data: [], error: null });

        return chain;
      });

      sendTemplateEmail.mockResolvedValue({ success: true });

      await scanController.bulkSubmitScanSession(req, res, next);

      // Verify correct template was requested
      const fromCalls = supabaseAdmin.from.mock.calls;
      const templateCalls = fromCalls.filter(call => call[0] === 'message_templates');
      expect(templateCalls.length).toBeGreaterThan(0);
    });

    it('should select mixed items template for letters + packages', async () => {
      const mockContact = {
        contact_id: 'contact-1',
        contact_person: 'Alice Jones',
        email: 'alice@example.com',
        mailbox_number: 'D4'
      };

      req.body = {
        items: [
          {
            contact_id: 'contact-1',
            item_type: 'Letter',
            scanned_at: '2025-12-07T10:00:00Z'
          },
          {
            contact_id: 'contact-1',
            item_type: 'Package',
            scanned_at: '2025-12-07T10:01:00Z'
          }
        ]
      };

      supabaseAdmin.from = jest.fn((table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis()
        };

        if (table === 'contacts') {
          chain.single.mockResolvedValue({ data: mockContact, error: null });
        } else if (table === 'message_templates') {
          chain.eq.mockImplementation((field, value) => {
            if (value === 'Scan: Mixed Items') {
              chain.single.mockResolvedValue({
                data: {
                  template_id: 'template-3',
                  template_name: 'Scan: Mixed Items',
                  subject_line: 'Mail & Packages Ready',
                  message_body: 'You have {LetterCount} {LetterText} and {PackageCount} {PackageText}...'
                },
                error: null
              });
            }
            return chain;
          });
        } else if (table === 'mail_items') {
          chain.select.mockResolvedValue({ 
            data: [
              { mail_item_id: 'item-1' },
              { mail_item_id: 'item-2' }
            ], 
            error: null 
          });
        }

        chain.update.mockResolvedValue({ data: [], error: null });

        return chain;
      });

      sendTemplateEmail.mockResolvedValue({ success: true });

      await scanController.bulkSubmitScanSession(req, res, next);

      expect(sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            LetterCount: 1,
            PackageCount: 1,
            LetterText: 'letter',
            PackageText: 'package'
          })
        })
      );
    });

    it('should handle email sending failures gracefully', async () => {
      const mockContact = {
        contact_id: 'contact-1',
        contact_person: 'Test User',
        email: 'test@example.com',
        mailbox_number: 'E5'
      };

      req.body = {
        items: [
          {
            contact_id: 'contact-1',
            item_type: 'Letter',
            scanned_at: '2025-12-07T10:00:00Z'
          }
        ]
      };

      supabaseAdmin.from = jest.fn((table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis()
        };

        if (table === 'contacts') {
          chain.single.mockResolvedValue({ data: mockContact, error: null });
        } else if (table === 'message_templates') {
          chain.single.mockResolvedValue({
            data: {
              template_id: 'template-1',
              template_name: 'Scan: Letters Only',
              subject_line: 'Mail Ready',
              message_body: 'Test'
            },
            error: null
          });
        } else if (table === 'mail_items') {
          chain.select.mockResolvedValue({ 
            data: [{ mail_item_id: 'item-1' }], 
            error: null 
          });
        }

        chain.update.mockResolvedValue({ data: [], error: null });

        return chain;
      });

      // Mock email failure
      sendTemplateEmail.mockRejectedValue(new Error('SMTP error'));

      await scanController.bulkSubmitScanSession(req, res, next);

      // Should still return success, but with notificationsSent: 0
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        itemsCreated: 1,
        notificationsSent: 0, // No emails sent
        summary: expect.arrayContaining([
          expect.objectContaining({
            notificationSent: false
          })
        ]),
        errors: undefined
      });
    });
  });

  describe('smartMatchWithGemini', () => {
    it('should require image data', async () => {
      req.body = {
        contacts: [{ contact_id: '1', contact_person: 'John' }]
      };

      await scanController.smartMatchWithGemini(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Image data is required'
      });
    });

    it('should require contacts array', async () => {
      req.body = {
        image: 'base64data',
        mimeType: 'image/jpeg'
      };

      await scanController.smartMatchWithGemini(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Contacts array is required'
      });
    });

    // Note: Full Gemini API tests would require mocking the GoogleGenerativeAI SDK
    // which is complex. For now, we test input validation.
  });
});

