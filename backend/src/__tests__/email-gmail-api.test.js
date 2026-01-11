/**
 * Tests for Gmail API email sending (not SMTP)
 * Ensures we don't accidentally switch back to nodemailer OAuth2 SMTP
 */

// Mock googleapis BEFORE importing email service
const mockGmailSend = jest.fn().mockResolvedValue({ data: { id: 'msg-123' } });
jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn(() => ({
      users: {
        messages: {
          send: mockGmailSend
        }
      }
    })),
    auth: {
      OAuth2: jest.fn()
    }
  }
}));

// Mock OAuth2 service
jest.mock('../services/oauth2.service', () => ({
  getValidOAuthClient: jest.fn().mockResolvedValue({
    credentials: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    }
  }),
  getUserGmailAddress: jest.fn().mockResolvedValue('sender@example.com')
}));

const { sendEmail } = require('../services/email.service');
const { google } = require('googleapis');

describe('Email Service - Gmail API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGmailSend.mockClear();
  });

  describe('Gmail API vs SMTP', () => {
    it('should use Gmail API when userId is provided', async () => {
      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        htmlContent: '<p>Hello World</p>',
        textContent: 'Hello World',
        userId: 'user-123'
      });

      // Verify Gmail API was called (not nodemailer)
      expect(google.gmail).toHaveBeenCalledWith({ version: 'v1', auth: expect.any(Object) });
      expect(mockGmailSend).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.any(String)
        }
      });
    });

    it('should encode email in base64url format for Gmail API', async () => {
      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test Content</p>',
        userId: 'user-123'
      });

      const callArgs = mockGmailSend.mock.calls[0][0];
      const encodedMessage = callArgs.requestBody.raw;

      // Verify base64url encoding (no +, /, or =)
      expect(encodedMessage).not.toMatch(/\+/);
      expect(encodedMessage).not.toMatch(/\//);
      expect(encodedMessage).not.toMatch(/=$/);
    });

    it('should include proper email headers in Gmail API message', async () => {
      await sendEmail({
        to: 'test@example.com',
        subject: 'Test Headers',
        htmlContent: '<p>Content</p>',
        userId: 'user-123'
      });

      const callArgs = mockGmailSend.mock.calls[0][0];
      const encodedMessage = callArgs.requestBody.raw;
      
      // Decode to verify headers
      const decodedMessage = Buffer.from(
        encodedMessage.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();

      expect(decodedMessage).toContain('From:');
      expect(decodedMessage).toContain('To: test@example.com');
      expect(decodedMessage).toContain('Subject: Test Headers');
      expect(decodedMessage).toContain('MIME-Version: 1.0');
      expect(decodedMessage).toContain('Content-Type: text/html; charset=utf-8');
    });

    it('should NOT use nodemailer when Gmail API succeeds', async () => {
      // This is critical - we don't want to fall back to SMTP OAuth2
      const nodemailer = require('nodemailer');
      const createTransportSpy = jest.spyOn(nodemailer, 'createTransport');

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        userId: 'user-123'
      });

      // Nodemailer should NOT be used when Gmail API works
      expect(createTransportSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if Gmail API fails and SMTP not configured', async () => {
      mockGmailSend.mockRejectedValueOnce(new Error('Gmail API error'));

      await expect(sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        userId: 'user-123'
      })).rejects.toThrow('Gmail not connected');
    });

    it('should return success with messageId when email sent via Gmail API', async () => {
      mockGmailSend.mockResolvedValueOnce({ data: { id: 'gmail-msg-456' } });

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        userId: 'user-123'
      });

      expect(result).toEqual({
        success: true,
        messageId: 'gmail-msg-456'
      });
    });
  });

  describe('Regression Prevention', () => {
    it('should NEVER switch back to nodemailer OAuth2 SMTP (Error #31)', async () => {
      // This test ensures we don't accidentally revert to the broken implementation
      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        userId: 'user-123'
      });

      // Gmail API should be used
      expect(mockGmailSend).toHaveBeenCalled();
      
      // The old OAuth2 SMTP error should never occur again
      // If this test fails, we've regressed to the broken implementation
      expect(mockGmailSend.mock.calls[0][0]).toHaveProperty('userId', 'me');
      expect(mockGmailSend.mock.calls[0][0]).toHaveProperty('requestBody.raw');
    });
  });
});

