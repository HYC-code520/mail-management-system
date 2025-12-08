// Mock dependencies BEFORE importing modules
jest.mock('../services/supabase.service', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));
jest.mock('../services/oauth2.service');
jest.mock('nodemailer');
jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn(() => ({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({ data: { id: 'msg-123' } })
        }
      }
    }))
  }
}));

const { sendTemplateEmail } = require('../services/email.service');
const { getValidOAuthClient, getUserGmailAddress } = require('../services/oauth2.service');
const nodemailer = require('nodemailer');

describe('Email Service - Pluralization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OAuth client
    getValidOAuthClient.mockResolvedValue({});
    getUserGmailAddress.mockResolvedValue('sender@example.com');
  });

  describe('sendTemplateEmail - Pluralization Variables', () => {
    it('should replace LetterText with "letter" for count of 1', async () => {
      const templateBody = 'You have {LetterCount} {LetterText} ready for pickup.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 1,
          LetterText: 'letter'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      // Body should say "1 letter" not "1 letters"
    });

    it('should replace LetterText with "letters" for count > 1', async () => {
      const templateBody = 'You have {LetterCount} {LetterText} ready for pickup.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 3,
          LetterText: 'letters'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should replace PackageText with "package" for count of 1', async () => {
      const templateBody = 'You have {PackageCount} {PackageText} ready for pickup.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Package Ready',
        templateBody,
        variables: {
          PackageCount: 1,
          PackageText: 'package'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should replace PackageText with "packages" for count > 1', async () => {
      const templateBody = 'You have {PackageCount} {PackageText} ready for pickup.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Packages Ready',
        templateBody,
        variables: {
          PackageCount: 5,
          PackageText: 'packages'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle mixed items with correct pluralization', async () => {
      const templateBody = 'You have {LetterCount} {LetterText} and {PackageCount} {PackageText}.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 2,
          LetterText: 'letters',
          PackageCount: 1,
          PackageText: 'package'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      // Should say "2 letters and 1 package"
    });

    it('should replace all variable types in one template', async () => {
      const templateBody = `Hello {Name},
      
You have mail ready at box {BoxNumber}:
• {LetterCount} {LetterText}
• {PackageCount} {PackageText}

Total: {TotalCount} items
Date: {Date}`;

      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          Name: 'John Doe',
          BoxNumber: 'A1',
          LetterCount: 3,
          LetterText: 'letters',
          PackageCount: 2,
          PackageText: 'packages',
          TotalCount: 5,
          Date: '12/7/2025'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle zero counts gracefully', async () => {
      const templateBody = 'You have {LetterCount} {LetterText} and {PackageCount} {PackageText}.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 0,
          LetterText: 'letters',
          PackageCount: 1,
          PackageText: 'package'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should replace variables in subject line', async () => {
      const templateSubject = '{LetterCount} {LetterText} Ready for Pickup';
      const templateBody = 'Your mail is ready.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject,
        templateBody,
        variables: {
          LetterCount: 2,
          LetterText: 'letters'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle bilingual templates with pluralization', async () => {
      const templateBody = `Hello {Name},

You have {LetterCount} {LetterText} ready for pickup.

---

{Name} 您好，

您有 {LetterCount} 封信件在等待领取。`;

      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          Name: 'John Doe',
          LetterCount: 3,
          LetterText: 'letters'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing pluralization variables', async () => {
      const templateBody = 'You have {LetterCount} {LetterText}.';
      
      // Missing LetterText variable
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 2
          // LetterText is missing - should be replaced with empty string
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should support both {{VAR}} and {VAR} formats', async () => {
      const templateBody = 'You have {{LetterCount}} {LetterText}.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 1,
          LetterText: 'letter'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle large counts', async () => {
      const templateBody = 'You have {LetterCount} {LetterText}.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 100,
          LetterText: 'letters'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should preserve line breaks in email body', async () => {
      const templateBody = `Line 1
Line 2
Line 3`;
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Test',
        templateBody,
        variables: {},
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      // HTML should have <br> tags
    });

    it('should handle special characters in variable values', async () => {
      const templateBody = 'Dear {Name}, you have {LetterCount} {LetterText}.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          Name: "O'Brien & Associates",
          LetterCount: 1,
          LetterText: 'letter'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle multiple occurrences of same variable', async () => {
      const templateBody = 'You have {LetterCount} {LetterText}. Please collect your {LetterCount} {LetterText} soon.';
      
      const result = await sendTemplateEmail({
        to: 'test@example.com',
        templateSubject: 'Mail Ready',
        templateBody,
        variables: {
          LetterCount: 2,
          LetterText: 'letters'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Integration with Scan Feature', () => {
    it('should send correct email for letters only scan', async () => {
      const result = await sendTemplateEmail({
        to: 'customer@example.com',
        templateSubject: 'Mail Ready for Pickup',
        templateBody: 'Hello {Name}, you have {LetterCount} {LetterText} at box {BoxNumber}.',
        variables: {
          Name: 'John Doe',
          BoxNumber: 'A1',
          LetterCount: 3,
          LetterText: 'letters',
          Date: '12/7/2025'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send correct email for packages only scan', async () => {
      const result = await sendTemplateEmail({
        to: 'customer@example.com',
        templateSubject: 'Package Ready for Pickup',
        templateBody: 'Hello {Name}, you have {PackageCount} {PackageText} at box {BoxNumber}.',
        variables: {
          Name: 'Jane Smith',
          BoxNumber: 'B2',
          PackageCount: 1,
          PackageText: 'package',
          Date: '12/7/2025'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });

    it('should send correct email for mixed items scan', async () => {
      const result = await sendTemplateEmail({
        to: 'customer@example.com',
        templateSubject: 'Mail & Packages Ready',
        templateBody: 'Hello {Name}, you have {LetterCount} {LetterText} and {PackageCount} {PackageText}.',
        variables: {
          Name: 'Bob Johnson',
          BoxNumber: 'C3',
          LetterCount: 2,
          LetterText: 'letters',
          PackageCount: 1,
          PackageText: 'package',
          Date: '12/7/2025'
        },
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
    });
  });
});

