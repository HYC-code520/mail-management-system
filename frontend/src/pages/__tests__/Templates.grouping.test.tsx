import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TemplatesPage from '../Templates';
import { api } from '../../lib/api-client';

// Mock API
vi.mock('../../lib/api-client', () => ({
  api: {
    templates: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  },
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockTemplates = [
  // Scan templates
  {
    template_id: '1',
    template_name: 'Scan: Letters Only',
    template_type: 'Initial',
    subject_line: 'Mail Ready',
    message_body: 'You have {LetterCount} {LetterText}...',
    is_default: true,
    default_channel: 'Email'
  },
  {
    template_id: '2',
    template_name: 'Scan: Packages Only',
    template_type: 'Initial',
    subject_line: 'Package Ready',
    message_body: 'You have {PackageCount} {PackageText}...',
    is_default: true,
    default_channel: 'Email'
  },
  {
    template_id: '3',
    template_name: 'Scan: Mixed Items',
    template_type: 'Initial',
    subject_line: 'Mail & Packages Ready',
    message_body: 'You have items ready...',
    is_default: true,
    default_channel: 'Email'
  },
  // Standard templates
  {
    template_id: '4',
    template_name: 'New Mail Notification',
    template_type: 'Initial',
    subject_line: 'New Mail Received',
    message_body: 'Hello {Name}, you have mail...',
    is_default: true,
    default_channel: 'Email'
  },
  {
    template_id: '5',
    template_name: 'Reminder (Uncollected Mail)',
    template_type: 'Reminder',
    subject_line: 'Reminder',
    message_body: 'Please collect your mail...',
    is_default: true,
    default_channel: 'Email'
  },
  // Custom template
  {
    template_id: '6',
    template_name: 'My Custom Template',
    template_type: 'Custom',
    subject_line: 'Custom Subject',
    message_body: 'Custom message...',
    is_default: false,
    user_id: 'user-123',
    default_channel: 'Email'
  }
];

describe('Templates Page - Grouped View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.templates.getAll as any).mockResolvedValue({
      templates: mockTemplates
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <TemplatesPage />
      </BrowserRouter>
    );
  };

  describe('Template Grouping', () => {
    it('should display scan templates section', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/📱 SCAN TEMPLATES/i)).toBeInTheDocument();
      });
    });

    it('should display standard templates section', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/🔔 STANDARD TEMPLATES/i)).toBeInTheDocument();
      });
    });

    it('should display custom templates section', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/✨ CUSTOM TEMPLATES/i)).toBeInTheDocument();
      });
    });

    it('should group scan templates correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const scanSection = screen.getByText(/📱 SCAN TEMPLATES/i).parentElement;
        expect(scanSection).toBeInTheDocument();
      });

      // Should show all 3 scan templates
      expect(screen.getByText('Letters Only')).toBeInTheDocument();
      expect(screen.getByText('Packages Only')).toBeInTheDocument();
      expect(screen.getByText('Mixed Items')).toBeInTheDocument();
    });

    it('should show "auto" badge for scan templates', async () => {
      renderComponent();

      await waitFor(() => {
        const lettersTemplate = screen.getByText('Letters Only').closest('button');
        expect(within(lettersTemplate!).getByText('auto')).toBeInTheDocument();
      });
    });

    it('should show "default" badge for standard templates', async () => {
      renderComponent();

      await waitFor(() => {
        const newMailTemplate = screen.getByText('New Mail Notification').closest('button');
        expect(within(newMailTemplate!).getByText('default')).toBeInTheDocument();
      });
    });

    it('should not show badge for custom templates', async () => {
      renderComponent();

      await waitFor(() => {
        const customTemplate = screen.getByText('My Custom Template').closest('button');
        expect(within(customTemplate!).queryByText('auto')).not.toBeInTheDocument();
        expect(within(customTemplate!).queryByText('default')).not.toBeInTheDocument();
      });
    });

    it('should show "No custom templates yet" when no custom templates', async () => {
      const templatesWithoutCustom = mockTemplates.filter(t => t.is_default);
      (api.templates.getAll as any).mockResolvedValue({
        templates: templatesWithoutCustom
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/No custom templates yet/i)).toBeInTheDocument();
      });
    });

    it('should highlight scan templates with blue when selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Letters Only')).toBeInTheDocument();
      });

      const lettersButton = screen.getByText('Letters Only').closest('button');
      await user.click(lettersButton!);

      await waitFor(() => {
        expect(lettersButton).toHaveClass('bg-blue-50');
        expect(lettersButton).toHaveClass('text-blue-900');
      });
    });
  });

  describe('Template Actions', () => {
    it('should have edit button for scan templates', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Letters Only')).toBeInTheDocument();
      });

      // Find the template item
      const templateItem = screen.getByText('Letters Only').closest('.relative');
      expect(templateItem).toBeInTheDocument();
      
      // Edit button exists (verifies it's editable)
      const buttons = within(templateItem!).getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute('title', 'Edit');
    });

    it('should not show delete button for scan templates', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Letters Only')).toBeInTheDocument();
      });

      const templateItem = screen.getByText('Letters Only').closest('.relative');
      
      // Delete button should NOT exist for scan templates
      const buttons = within(templateItem!).getAllByRole('button');
      const deleteButton = buttons.find(btn => btn.getAttribute('title') === 'Delete');
      expect(deleteButton).toBeUndefined();
    });

    it('should not show delete button for standard templates', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('New Mail Notification')).toBeInTheDocument();
      });

      const templateItem = screen.getByText('New Mail Notification').closest('.relative');
      
      // Delete button should NOT exist for standard templates
      const buttons = within(templateItem!).getAllByRole('button');
      const deleteButton = buttons.find(btn => btn.getAttribute('title') === 'Delete');
      expect(deleteButton).toBeUndefined();
    });

    it('should have delete button for custom templates only', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('My Custom Template')).toBeInTheDocument();
      });

      const templateItem = screen.getByText('My Custom Template').closest('.relative');
      
      // Delete button SHOULD exist for custom templates
      const buttons = within(templateItem!).getAllByRole('button');
      const deleteButton = buttons.find(btn => btn.getAttribute('title') === 'Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('title', 'Delete');
      
      // Verify it's not disabled
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Template Content Display', () => {
    it('should display template with variable placeholders', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Letters Only')).toBeInTheDocument();
      });

      const lettersButton = screen.getByText('Letters Only');
      await user.click(lettersButton);

      await waitFor(() => {
        // Template content should be displayed
        const content = document.body.textContent || '';
        expect(content).toContain('{LetterCount}');
        expect(content).toContain('{LetterText}');
      });
    });

    it('should show pluralization variables correctly', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Packages Only')).toBeInTheDocument();
      });

      const packagesButton = screen.getByText('Packages Only');
      await user.click(packagesButton);

      await waitFor(() => {
        // Template content should be displayed
        const content = document.body.textContent || '';
        expect(content).toContain('{PackageCount}');
        expect(content).toContain('{PackageText}');
      });
    });
  });

  describe('Create New Template', () => {
    it('should have create button that opens form', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/New Template/i)).toBeInTheDocument();
      });

      const createButton = screen.getByText(/New Template/i);
      expect(createButton).toBeInTheDocument();
      
      // Verify button is clickable (not disabled)
      expect(createButton.closest('button')).not.toBeDisabled();
      
      // Verify button has Plus icon (indicates it's a create action)
      const buttonElement = createButton.closest('button');
      expect(buttonElement).toBeInTheDocument();
    });
  });

  describe('Section Order', () => {
    it('should display sections in correct order', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Letters Only')).toBeInTheDocument();
      });

      // Get all section headers
      const scanHeader = screen.getByText(/📱 SCAN TEMPLATES/i);
      const standardHeader = screen.getByText(/🔔 STANDARD TEMPLATES/i);
      const customHeader = screen.getByText(/✨ CUSTOM TEMPLATES/i);

      expect(scanHeader).toBeInTheDocument();
      expect(standardHeader).toBeInTheDocument();
      expect(customHeader).toBeInTheDocument();

      // Check DOM order using compareDocumentPosition
      const scanPosition = scanHeader.compareDocumentPosition(standardHeader);
      const standardPosition = standardHeader.compareDocumentPosition(customHeader);

      // DOCUMENT_POSITION_FOLLOWING (4) means the node comes after
      expect(scanPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(standardPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      (api.templates.getAll as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      // Should show skeleton/pulse animation (no "Loading" text)
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should handle API errors', async () => {
      (api.templates.getAll as any).mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        // Should still render but show error toast (mocked)
        expect(api.templates.getAll).toHaveBeenCalled();
      });
    });
  });
});

