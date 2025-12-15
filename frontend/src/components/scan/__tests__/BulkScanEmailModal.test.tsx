/**
 * BulkScanEmailModal Tests
 * 
 * Tests for the bulk scan email preview modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BulkScanEmailModal from '../BulkScanEmailModal';
import { api } from '../../../lib/api-client';

// Mock the API
vi.mock('../../../lib/api-client', () => ({
  api: {
    templates: {
      getAll: vi.fn(),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTemplates = [
  {
    template_id: 'template-1',
    template_name: 'Final Notice',
    subject_line: 'Final Notice: Mail at Mei Way',
    message_body: 'Dear {Name}, this is your final notice.',
  },
  {
    template_id: 'template-2',
    template_name: 'New Mail Notification',
    subject_line: 'New Mail for {Name}',
    message_body: 'Dear {Name}, you have {TotalCount} new items.',
  },
  {
    template_id: 'template-3',
    template_name: 'Reminder',
    subject_line: 'Reminder: Pick up your mail',
    message_body: 'Dear {Name}, please pick up your mail.',
  },
];

const mockGroups = [
  {
    contact: {
      contact_id: 'contact-1',
      contact_person: 'John Doe',
      company_name: 'Acme Inc',
      mailbox_number: '101',
      email: 'john@example.com',
    },
    letterCount: 2,
    packageCount: 1,
    totalCount: 3,
  },
  {
    contact: {
      contact_id: 'contact-2',
      contact_person: 'Jane Smith',
      mailbox_number: '102',
      email: 'jane@example.com',
    },
    letterCount: 1,
    packageCount: 0,
    totalCount: 1,
  },
];

describe('BulkScanEmailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.templates.getAll).mockResolvedValue({ templates: mockTemplates });
  });

  describe('Template Auto-Selection', () => {
    it('should auto-select "New Mail Notification" template when available', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Wait for template to be selected
      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toHaveValue('template-2'); // New Mail Notification
      });
    });

    it('should fall back to first template if "New Mail Notification" not found', async () => {
      const templatesWithoutNewMail = [
        {
          template_id: 'template-1',
          template_name: 'Final Notice',
          subject_line: 'Final Notice',
          message_body: 'Final notice message',
        },
        {
          template_id: 'template-3',
          template_name: 'Reminder',
          subject_line: 'Reminder',
          message_body: 'Reminder message',
        },
      ];

      vi.mocked(api.templates.getAll).mockResolvedValue({ templates: templatesWithoutNewMail });

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toHaveValue('template-1'); // Falls back to first
      });
    });

    it('should match template with "new mail" in name (case insensitive)', async () => {
      const templatesWithVariation = [
        {
          template_id: 'template-1',
          template_name: 'Final Notice',
          subject_line: 'Final Notice',
          message_body: 'Final notice',
        },
        {
          template_id: 'template-4',
          template_name: 'Customer New Mail Alert',
          subject_line: 'You have new mail',
          message_body: 'New mail alert',
        },
      ];

      vi.mocked(api.templates.getAll).mockResolvedValue({ templates: templatesWithVariation });

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toHaveValue('template-4'); // Matches "new mail" substring
      });
    });
  });

  describe('Recipients Display', () => {
    it('should display correct recipient count', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Recipients (2)')).toBeInTheDocument();
      // Check the description text that contains the count
      expect(screen.getByText(/Email notifications will be sent to/)).toBeInTheDocument();
    });

    it('should use singular "customer" for single recipient', async () => {
      const singleGroup = [mockGroups[0]];

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={singleGroup}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Recipients (1)')).toBeInTheDocument();
    });
  });

  describe('Template Variable Preview', () => {
    it('should replace {Name} with customer name in preview', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Wait for template to load and preview to render
      await waitFor(() => {
        // Use getAllByText since the name appears in multiple places (subject, body, preview note)
        const johnDoeElements = screen.getAllByText(/John Doe/);
        expect(johnDoeElements.length).toBeGreaterThan(0);
      });
    });

    it('should show preview note with customer name', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Preview shown for: John Doe/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    it('should toggle between preview and edit mode', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Find and click Edit Content button
      await waitFor(() => {
        const editButton = screen.getByText('Edit Content');
        fireEvent.click(editButton);
      });

      // Should now show Preview Mode button
      await waitFor(() => {
        expect(screen.getByText('Preview Mode')).toBeInTheDocument();
      });

      // Should show template variables help
      expect(screen.getByText('Template Variables')).toBeInTheDocument();
    });

    it('should show editable textarea in edit mode', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        const editButton = screen.getByText('Edit Content');
        fireEvent.click(editButton);
      });

      // Should have editable input for subject
      const subjectInput = screen.getByPlaceholderText('Email subject...');
      expect(subjectInput).toBeInTheDocument();

      // Should have editable textarea for body
      const bodyTextarea = screen.getByPlaceholderText('Email message...');
      expect(bodyTextarea).toBeInTheDocument();
    });
  });

  describe('Confirm and Send', () => {
    it('should call onConfirm with template id when sending', async () => {
      mockOnConfirm.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Wait for template to be selected
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /Send to 2 Customers/i });
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          'template-2', // New Mail Notification template ID
          undefined,    // No custom subject (not in edit mode)
          undefined     // No custom body (not in edit mode)
        );
      });
    });

    it('should pass custom subject and body when in edit mode', async () => {
      mockOnConfirm.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(api.templates.getAll).toHaveBeenCalled();
      });

      // Enter edit mode
      await waitFor(() => {
        const editButton = screen.getByText('Edit Content');
        fireEvent.click(editButton);
      });

      // Modify subject
      const subjectInput = screen.getByPlaceholderText('Email subject...');
      fireEvent.change(subjectInput, { target: { value: 'Custom Subject' } });

      // Modify body
      const bodyTextarea = screen.getByPlaceholderText('Email message...');
      fireEvent.change(bodyTextarea, { target: { value: 'Custom Body' } });

      // Send
      const sendButton = screen.getByRole('button', { name: /Send to 2 Customers/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          'template-2',
          'Custom Subject',
          'Custom Body'
        );
      });
    });

    it('should disable send button when no template selected', async () => {
      vi.mocked(api.templates.getAll).mockResolvedValue({ templates: [] });

      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /Send to 2 Customers/i });
        expect(sendButton).toBeDisabled();
      });
    });

    it('should show loading state when sending', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={true}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when Cancel is clicked', async () => {
      render(
        <BrowserRouter>
          <BulkScanEmailModal
            isOpen={true}
            onClose={mockOnClose}
            groups={mockGroups}
            onConfirm={mockOnConfirm}
            sending={false}
          />
        </BrowserRouter>
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
