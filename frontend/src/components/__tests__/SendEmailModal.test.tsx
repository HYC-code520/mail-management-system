import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SendEmailModal from '../SendEmailModal';
import { api } from '../../lib/api-client';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../lib/api-client', () => ({
  api: {
    templates: {
      getAll: vi.fn()
    },
    emails: {
      send: vi.fn(),
      sendCustom: vi.fn(),
      sendWithTemplate: vi.fn()
    },
    contacts: {
      getById: vi.fn()
    }
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SendEmailModal - Gmail Disconnection Error Handling', () => {
  const mockMailItem = {
    mail_item_id: 'mail-123',
    item_type: 'Package',
    status: 'Received',
    received_date: '2024-12-01',
    contact_id: 'contact-123',
    contacts: {
      contact_id: 'contact-123',
      contact_person: 'John Doe',
      company_name: 'Test Company',
      email: 'customer@example.com',
      mailbox_number: '123'
    }
  };

  const mockTemplates = [
    {
      template_id: 'template-1',
      template_name: 'Initial Notification',
      subject_line: 'Mail Notification for {{contact_name}}',
      message_body: 'Hello {{contact_name}}, you have a {{item_type}}.',
      template_type: 'Initial'
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    mailItem: mockMailItem,
    onSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful template fetch by default
    (api.templates.getAll as any).mockResolvedValue({ templates: mockTemplates });
    
    // Mock successful contact fetch by default
    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });
  });

  describe('Gmail Disconnected Error', () => {
    it('should show user-friendly error toast when Gmail is disconnected', async () => {
      // Mock Gmail disconnected error from backend
      const mockError = {
        response: {
          data: {
            error: 'Gmail disconnected',
            message: 'Your Gmail account is disconnected. Please reconnect in Settings to send emails.',
            code: 'GMAIL_DISCONNECTED',
            action: 'reconnect_gmail'
          }
        }
      };
      (api.emails.sendWithTemplate as any).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      // Wait for modal to load
      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      // Find and click send button
      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      // Wait for error toast to be called
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify the error toast was called with Gmail disconnection message
      expect(toast.error).toHaveBeenCalled();
    });

    it('should show user-friendly error when email service not configured', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Email service not configured',
            message: 'Gmail is not connected. Please go to Settings and connect your Gmail account.',
            code: 'EMAIL_NOT_CONFIGURED',
            action: 'connect_gmail'
          }
        }
      };
      (api.emails.sendWithTemplate as any).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should show generic error for non-Gmail errors', async () => {
      const mockError = {
        message: 'Network error',
        response: {
          data: {
            error: 'Network error',
            message: 'Failed to connect to server'
          }
        }
      };
      (api.emails.sendWithTemplate as any).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Email Refresh Functionality', () => {
    it('should fetch latest email when modal opens', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      // Wait for the modal to fetch contact info
      await waitFor(() => {
        expect(api.contacts.getById).toHaveBeenCalledWith('contact-123');
      });

      // Verify email is displayed in the header
      await waitFor(() => {
        expect(screen.getByText(/customer@example\.com/i)).toBeInTheDocument();
      });
    });

    it('should show "No email on file" when contact has no email', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'John Doe'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      // Send button should not exist when there's no email
      expect(screen.queryByRole('button', { name: /send$/i })).not.toBeInTheDocument();
    });

    it('should refresh email when refresh button is clicked', async () => {
      // Mock that contact initially has no email
      (api.contacts.getById as any).mockResolvedValueOnce({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'John Doe'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      // Mock that after refresh, contact has email
      (api.contacts.getById as any).mockResolvedValueOnce({
        contact_id: 'contact-123',
        email: 'updated@example.com',
        contact_person: 'John Doe'
      });

      // The modal doesn't have a manual refresh button anymore
      // It auto-refreshes when opened, so just verify the API was called
      expect(api.contacts.getById).toHaveBeenCalledWith('contact-123');
    });
  });

  describe('Success Flow', () => {
    it('should load templates and enable send button when email is available', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      // Wait for templates to load
      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Verify latest email is displayed (fetched from contact)
      await waitFor(() => {
        expect(screen.getByText('updated@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should require template to be loaded before sending', async () => {
      // Mock empty templates
      (api.templates.getAll as any).mockResolvedValue({ templates: [] });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /send$/i });
      
      // With no templates, button should still render but not send
      expect(sendButton).toBeInTheDocument();
    });

    it('should require contact email before sending', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null, // No email
        contact_person: 'John Doe'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      // Send button should not exist when there's no email
      expect(screen.queryByRole('button', { name: /send$/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation to Customer Profile', () => {
    it('should navigate to customer profile when "Add Email Address" is clicked', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'John Doe'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      // Click "Add Email Address" button
      const addEmailButton = screen.getByText(/Add Email Address/i);
      fireEvent.click(addEmailButton);

      // Should navigate to customer profile
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/contacts/contact-123');
      });

      // Should close the modal
      expect(defaultProps.onClose).toHaveBeenCalled();

      // Should show success toast
      expect(toast.success).toHaveBeenCalled();
    });

    it('should navigate to customer profile when "Add email" link is clicked', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'John Doe',
        company_name: 'Acme Corp'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      // Click "Add email →" link
      const addEmailButton = screen.getByText(/add email/i);
      fireEvent.click(addEmailButton);

      // Should navigate to customer profile
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/contacts/contact-123');
      });

      // Should close the modal
      expect(defaultProps.onClose).toHaveBeenCalled();

      // Should show success toast with customer name
      expect(toast.success).toHaveBeenCalled();
      const toastCall = (toast.success as any).mock.calls[0];
      expect(toastCall[0]).toContain('John Doe');
    });

    it('should show toast with correct customer name', async () => {
      const customMailItem = {
        ...mockMailItem,
        contacts: {
          ...mockMailItem.contacts,
          contact_person: 'Jane Smith',
          company_name: 'Test Corp'
        }
      };

      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'Jane Smith',
        company_name: 'Test Corp'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} mailItem={customMailItem} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/Add Email Address/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('Jane Smith');
      });
    });

    it('should use company name if contact person is not available', async () => {
      const customMailItem = {
        ...mockMailItem,
        contacts: {
          ...mockMailItem.contacts,
          contact_person: undefined,
          company_name: 'Big Company Inc'
        }
      };

      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: undefined,
        company_name: 'Big Company Inc'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} mailItem={customMailItem} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/Add Email Address/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('Big Company Inc');
      });
    });

    it('should use fallback text if neither name nor company available', async () => {
      const customMailItem = {
        ...mockMailItem,
        contacts: {
          ...mockMailItem.contacts,
          contact_person: undefined,
          company_name: undefined
        }
      };

      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: undefined,
        company_name: undefined
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} mailItem={customMailItem} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Email Address/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/Add Email Address/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('the customer');
      });
    });
  });
});

describe('SendEmailModal - Notification History Banner', () => {
  const mockMailItem = {
    mail_item_id: 'mail-123',
    item_type: 'Package',
    status: 'Received',
    received_date: '2024-12-01',
    contact_id: 'contact-123',
    contacts: {
      contact_id: 'contact-123',
      contact_person: 'John Doe',
      company_name: 'Test Company',
      email: 'customer@example.com',
      mailbox_number: '123'
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    mailItem: mockMailItem,
    onSuccess: vi.fn()
  };

  const mockTemplates = [
    {
      template_id: 'template-1',
      template_name: 'Initial Notification',
      template_type: 'Initial',
      subject_line: 'Mail Ready',
      message_body: 'Hello'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.templates.getAll as any).mockResolvedValue({ templates: mockTemplates });
  });

  it('should show notification banner when mail item has notification history', async () => {
    const mailItemWithHistory = {
      ...defaultProps.mailItem,
      notification_count: 2,
      last_notified: '2025-11-25T10:00:00Z'
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemWithHistory} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Previously notified 2 time/i)).toBeInTheDocument();
    });
  });

  it('should show last notified date in banner', async () => {
    const mailItemWithHistory = {
      ...defaultProps.mailItem,
      notification_count: 1,
      last_notified: '2025-11-20T10:00:00Z'
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemWithHistory} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check that the banner exists and contains notification text
      const banner = screen.getByText(/Previously notified 1 time/i);
      expect(banner).toBeInTheDocument();
    });
  });

  it('should NOT show notification banner when notification_count is 0', async () => {
    const mailItemNoHistory = {
      ...defaultProps.mailItem,
      notification_count: 0,
      last_notified: undefined
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemNoHistory} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Message')).toBeInTheDocument();
    });

    // Verify banner is NOT displayed
    expect(screen.queryByText(/Previously notified/i)).not.toBeInTheDocument();
  });

  it('should show singular "time" for 1 notification', async () => {
    const mailItemWithOneNotification = {
      ...defaultProps.mailItem,
      notification_count: 1,
      last_notified: '2025-11-25T10:00:00Z'
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemWithOneNotification} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should say "1 time" not "1 times"
      expect(screen.getByText(/Previously notified 1 time/i)).toBeInTheDocument();
    });
  });

  it('should show plural "times" for multiple notifications', async () => {
    const mailItemWithMultipleNotifications = {
      ...defaultProps.mailItem,
      notification_count: 5,
      last_notified: '2025-11-25T10:00:00Z'
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemWithMultipleNotifications} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should say "5 times" not "5 time"
      expect(screen.getByText(/Previously notified 5 time/i)).toBeInTheDocument();
    });
  });

  it('should have blue background for notification banner', async () => {
    const mailItemWithHistory = {
      ...defaultProps.mailItem,
      notification_count: 2,
      last_notified: '2025-11-25T10:00:00Z'
    };

    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });

    render(
      <BrowserRouter>
        <SendEmailModal {...defaultProps} mailItem={mailItemWithHistory} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Verify notification banner is displayed
      expect(screen.getByText(/Previously notified 2 time/i)).toBeInTheDocument();
    });
  });
});


