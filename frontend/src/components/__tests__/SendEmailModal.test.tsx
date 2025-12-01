import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      sendCustom: vi.fn()
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
    (api.templates.getAll as any).mockResolvedValue(mockTemplates);
    
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
      (api.emails.sendCustom as any).mockRejectedValue(mockError);

      const { container } = render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      // Wait for modal to load
      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      // Fill in email form
      const subjectInput = screen.getByLabelText(/subject/i);
      const messageTextarea = screen.getByLabelText(/message/i);
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(messageTextarea, { target: { value: 'Test Message' } });

      // Click send button
      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      // Wait for error toast to be called
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Verify the error toast was called with a function (rich toast content)
      const toastCall = (toast.error as any).mock.calls[0];
      expect(toastCall).toBeTruthy();
      expect(typeof toastCall[0]).toBe('function'); // Rich toast with custom content
      expect(toastCall[1]).toEqual({ duration: 8000 }); // 8 second duration
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
      (api.emails.sendCustom as any).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      const subjectInput = screen.getByLabelText(/subject/i);
      const messageTextarea = screen.getByLabelText(/message/i);
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(messageTextarea, { target: { value: 'Test Message' } });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      const toastCall = (toast.error as any).mock.calls[0];
      expect(typeof toastCall[0]).toBe('function'); // Rich toast
      expect(toastCall[1]).toEqual({ duration: 8000 });
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
      (api.emails.sendCustom as any).mockRejectedValue(mockError);

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      const subjectInput = screen.getByLabelText(/subject/i);
      const messageTextarea = screen.getByLabelText(/message/i);
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(messageTextarea, { target: { value: 'Test Message' } });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to connect to server');
      });
    });
  });

  describe('Email Refresh Functionality', () => {
    it('should fetch latest email when modal opens', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.contacts.getById).toHaveBeenCalledWith('contact-123');
      });

      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
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
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      // Send button should be disabled
      const sendButton = screen.getByRole('button', { name: /send email/i });
      expect(sendButton).toBeDisabled();
    });

    it('should refresh email when refresh button is clicked', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.contacts.getById).toHaveBeenCalledTimes(1);
      });

      // Find and click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh email/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(api.contacts.getById).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Success Flow', () => {
    it('should successfully send email and call onSuccess', async () => {
      (api.emails.sendCustom as any).mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      const subjectInput = screen.getByLabelText(/subject/i);
      const messageTextarea = screen.getByLabelText(/message/i);
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(messageTextarea, { target: { value: 'Test Message' } });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(api.emails.sendCustom).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'customer@example.com',
            subject: 'Test Subject',
            body: 'Test Message',
            contact_id: 'contact-123',
            mail_item_id: 'mail-123'
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Email sent to customer@example.com');
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should prevent sending when subject is empty', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      const messageTextarea = screen.getByLabelText(/message/i);
      fireEvent.change(messageTextarea, { target: { value: 'Test Message' } });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Subject and message cannot be empty');
      });

      expect(api.emails.sendCustom).not.toHaveBeenCalled();
    });

    it('should prevent sending when message is empty', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Email Notification')).toBeInTheDocument();
      });

      const subjectInput = screen.getByLabelText(/subject/i);
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Subject and message cannot be empty');
      });

      expect(api.emails.sendCustom).not.toHaveBeenCalled();
    });

    it('should prevent sending when no email on file', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /send email/i });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Navigation to Customer Profile', () => {
    it('should navigate to customer profile when "Edit Customer Info" is clicked', async () => {
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
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      // Click "Edit Customer Info" button
      const editButton = screen.getByText(/edit customer info/i);
      fireEvent.click(editButton);

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
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
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
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: 'Jane Smith',
        company_name: 'Test Corp'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/edit customer info/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('Jane Smith');
        expect(toastCall[0]).toContain('Edit Contact');
      });
    });

    it('should use company name if contact person is not available', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: null,
        company_name: 'Big Company Inc'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/edit customer info/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('Big Company Inc');
      });
    });

    it('should use fallback text if neither name nor company available', async () => {
      (api.contacts.getById as any).mockResolvedValue({
        contact_id: 'contact-123',
        email: null,
        contact_person: null,
        company_name: null
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/edit customer info/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        expect(toastCall[0]).toContain('the customer');
      });
    });
  });
});


