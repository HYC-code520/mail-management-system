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
      sendWithTemplate: vi.fn(),
      sendBulk: vi.fn()
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

describe('SendEmailModal - Sent By Staff Selection', () => {
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
      subject_line: 'Mail Notification for {Name}',
      message_body: 'Hello {Name}, you have a {ItemType}.',
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
    (api.templates.getAll as any).mockResolvedValue({ templates: mockTemplates });
    (api.contacts.getById as any).mockResolvedValue({
      contact_id: 'contact-123',
      email: 'customer@example.com',
      contact_person: 'John Doe'
    });
  });

  describe('Staff Selection Toggle Buttons', () => {
    it('should display Madison and Merlin toggle buttons', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
        expect(screen.getByText(/Merlin/i)).toBeInTheDocument();
      });
    });

    it('should start with no staff selected', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      // Neither button should have selected styling initially
      const madisonButton = screen.getByText(/Madison/i).closest('button');
      const merlinButton = screen.getByText(/Merlin/i).closest('button');
      
      expect(madisonButton).not.toHaveClass('bg-blue-600');
      expect(merlinButton).not.toHaveClass('bg-blue-600');
    });

    it('should select Madison when clicked', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      const madisonButton = screen.getByText(/Madison/i).closest('button');
      fireEvent.click(madisonButton!);

      await waitFor(() => {
        expect(madisonButton).toHaveClass('bg-blue-600');
      });
    });

    it('should select Merlin when clicked', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Merlin/i)).toBeInTheDocument();
      });

      const merlinButton = screen.getByText(/Merlin/i).closest('button');
      fireEvent.click(merlinButton!);

      await waitFor(() => {
        expect(merlinButton).toHaveClass('bg-blue-600');
      });
    });

    it('should switch selection from Madison to Merlin', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      const madisonButton = screen.getByText(/Madison/i).closest('button');
      const merlinButton = screen.getByText(/Merlin/i).closest('button');

      // Select Madison
      fireEvent.click(madisonButton!);
      await waitFor(() => {
        expect(madisonButton).toHaveClass('bg-blue-600');
      });

      // Switch to Merlin
      fireEvent.click(merlinButton!);
      await waitFor(() => {
        expect(merlinButton).toHaveClass('bg-blue-600');
        expect(madisonButton).not.toHaveClass('bg-blue-600');
      });
    });

    it('should show helper text about internal tracking', async () => {
      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/For internal tracking only/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sent By Field Validation', () => {
    it('should require staff selection before sending', async () => {
      (api.emails.sendWithTemplate as any).mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });

      // Try to send without selecting staff
      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please select who is sending this email');
      });

      // Email should NOT be sent
      expect(api.emails.sendWithTemplate).not.toHaveBeenCalled();
    });

    it('should allow sending when staff is selected', async () => {
      (api.emails.sendWithTemplate as any).mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      // Select Madison
      const madisonButton = screen.getByText(/Madison/i).closest('button');
      fireEvent.click(madisonButton!);

      // Send email
      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      // Should send email with sent_by field
      await waitFor(() => {
        expect(api.emails.sendWithTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            sent_by: 'Madison'
          })
        );
      });
    });

    it('should include sent_by in success toast', async () => {
      (api.emails.sendWithTemplate as any).mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });

      render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Merlin/i)).toBeInTheDocument();
      });

      // Select Merlin
      const merlinButton = screen.getByText(/Merlin/i).closest('button');
      fireEvent.click(merlinButton!);

      // Send email
      const sendButton = screen.getByRole('button', { name: /send$/i });
      fireEvent.click(sendButton);

      // Should show success toast with staff name
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        const toastCall = (toast.success as any).mock.calls[0];
        const toastMessage = toastCall[0];
        expect(toastMessage).toContain('Merlin');
      });
    });
  });

  describe('Staff Selection Reset on Close', () => {
    it('should reset staff selection when modal is closed', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      // Select Madison
      const madisonButton = screen.getByText(/Madison/i).closest('button');
      fireEvent.click(madisonButton!);

      await waitFor(() => {
        expect(madisonButton).toHaveClass('bg-blue-600');
      });

      // Close modal
      rerender(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} isOpen={false} />
        </BrowserRouter>
      );

      // Reopen modal
      rerender(
        <BrowserRouter>
          <SendEmailModal {...defaultProps} isOpen={true} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Madison/i)).toBeInTheDocument();
      });

      // Madison should not be selected anymore
      const newMadisonButton = screen.getByText(/Madison/i).closest('button');
      expect(newMadisonButton).not.toHaveClass('bg-blue-600');
    });
  });
});

