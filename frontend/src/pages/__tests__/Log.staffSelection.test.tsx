import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LogPage from '../Log';
import { api } from '../../lib/api-client';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  api: {
    mailItems: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    contacts: {
      getAll: vi.fn()
    },
    actionHistory: {
      getByMailItem: vi.fn()
    }
  }
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('LogPage - Staff Selection Toggle Buttons in Edit Modal', () => {
  const mockContact = {
    contact_id: 'contact-123',
    contact_person: 'John Doe',
    company_name: 'Test Company',
    mailbox_number: 'A1',
    status: 'Active',
    service_tier: 2,
    email: 'test@example.com',
    display_name_preference: 'person' as const
  };

  const mockMailItem = {
    mail_item_id: 'mail-123',
    contact_id: 'contact-123',
    item_type: 'Package',
    status: 'Received',
    received_date: '2024-12-01T12:00:00-05:00',
    quantity: 1,
    contacts: mockContact
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.mailItems.getAll as any).mockResolvedValue([mockMailItem]);
    (api.contacts.getAll as any).mockResolvedValue([mockContact]);
    (api.actionHistory.getByMailItem as any).mockResolvedValue([]);
  });

  describe('Toggle Button Display', () => {
    it('should display Madison and Merlin toggle buttons in edit modal', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load (not just API call)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find and click the three-dot menu
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        // Click Edit option
        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        // Staff buttons should appear in edit modal
        await waitFor(() => {
          expect(screen.getByText(/Madison/i)).toBeInTheDocument();
          expect(screen.getByText(/Merlin/i)).toBeInTheDocument();
        });
      }
    });

    it('should have "Who is making this change?" label', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open edit modal
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByText(/Who is making this change?/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Toggle Button Functionality', () => {
    it('should start with no staff selected', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load (not just API call)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open edit modal and check initial state
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          const merlinButton = screen.getByText(/Merlin/i).closest('button');
          
          expect(madisonButton).not.toHaveClass('bg-blue-50');
          expect(merlinButton).not.toHaveClass('bg-blue-50');
        });
      }
    });

    it('should select Madison when clicked', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load (not just API call)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          fireEvent.click(madisonButton!);
        });

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          expect(madisonButton).toHaveClass('bg-blue-50');
        });
      }
    });

    it('should switch selection from Madison to Merlin', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          fireEvent.click(madisonButton!);
        });

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          expect(madisonButton).toHaveClass('bg-blue-50');
        });

        // Switch to Merlin
        const merlinButton = screen.getByText(/Merlin/i).closest('button');
        fireEvent.click(merlinButton!);

        await waitFor(() => {
          const madisonButton = screen.getByText(/Madison/i).closest('button');
          const merlinButton = screen.getByText(/Merlin/i).closest('button');
          
          expect(merlinButton).toHaveClass('bg-blue-50');
          expect(madisonButton).not.toHaveClass('bg-blue-50');
        });
      }
    });
  });

  describe('Validation with Staff Selection', () => {
    it('should require staff selection when changing quantity', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        // Change quantity
        await waitFor(() => {
          const quantityInput = screen.getByLabelText(/Quantity/i);
          fireEvent.change(quantityInput, { target: { value: '5' } });
        });

        // Try to save without selecting staff
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        // Should show error
        await waitFor(() => {
          expect(screen.getByText(/Please select who made this quantity change/i)).toBeInTheDocument();
        });
      }
    });

    it('should require staff selection when changing status', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        // Change status
        await waitFor(() => {
          const statusSelect = screen.getByLabelText(/Status/i);
          fireEvent.change(statusSelect, { target: { value: 'Picked Up' } });
        });

        // Try to save without selecting staff
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        // Should show error
        await waitFor(() => {
          expect(screen.getByText(/Please select who made this status change/i)).toBeInTheDocument();
        });
      }
    });

    it('should allow saving when staff is selected and quantity changed', async () => {
      (api.mailItems.update as any).mockResolvedValue({
        ...mockMailItem,
        quantity: 5
      });

      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        // Change quantity and select staff
        await waitFor(() => {
          const quantityInput = screen.getByLabelText(/Quantity/i);
          fireEvent.change(quantityInput, { target: { value: '5' } });

          const madisonButton = screen.getByText(/Madison/i).closest('button');
          fireEvent.click(madisonButton!);
        });

        // Save should work
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(api.mailItems.update).toHaveBeenCalledWith(
            'mail-123',
            expect.objectContaining({
              quantity: 5,
              performed_by: 'Madison'
            })
          );
        });
      }
    });

    it('should include performed_by in update request', async () => {
      (api.mailItems.update as any).mockResolvedValue({
        ...mockMailItem,
        status: 'Picked Up'
      });

      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          const statusSelect = screen.getByLabelText(/Status/i);
          fireEvent.change(statusSelect, { target: { value: 'Picked Up' } });

          const merlinButton = screen.getByText(/Merlin/i).closest('button');
          fireEvent.click(merlinButton!);
        });

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(api.mailItems.update).toHaveBeenCalledWith(
            'mail-123',
            expect.objectContaining({
              performed_by: 'Merlin'
            })
          );
        });
      }
    });
  });

  describe('Error Messages', () => {
    it('should show error message when no staff selected', async () => {
      render(
        <BrowserRouter>
          <LogPage />
        </BrowserRouter>
      );

      // Wait for actual content to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === 'Actions');
      
      if (menuButton) {
        fireEvent.click(menuButton);

        await waitFor(() => {
          const editButton = screen.getByText(/Edit/i);
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          const quantityInput = screen.getByLabelText(/Quantity/i);
          fireEvent.change(quantityInput, { target: { value: '5' } });
        });

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        // Should show red error text
        await waitFor(() => {
          const errorMessage = screen.getByText(/Please select who is making this change/i);
          expect(errorMessage).toBeInTheDocument();
          expect(errorMessage).toHaveClass('text-red-600');
        });
      }
    });
  });
});

