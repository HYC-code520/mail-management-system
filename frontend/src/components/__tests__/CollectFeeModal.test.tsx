import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CollectFeeModal from '../CollectFeeModal';
import { api } from '../../lib/api-client';
import toast from 'react-hot-toast';
import * as AuthContext from '../../contexts/AuthContext';

vi.mock('../../lib/api-client');
vi.mock('react-hot-toast');
vi.mock('../../contexts/AuthContext');

describe('CollectFeeModal', () => {
  const mockUser = {
    id: 'user-123',
    email: 'ariel.chen@pursuit.org',
  };

  const mockGroupWithPackagesOnly = {
    contact: {
      contact_id: 'contact-1',
      contact_person: 'John Doe',
      mailbox_number: 'Z1',
    },
    packages: [
      {
        mail_item_id: 'pkg-1',
        item_type: 'Package',
        received_date: '2025-12-03T10:00:00Z',
        packageFee: {
          fee_id: 'fee-1',
          mail_item_id: 'pkg-1',
          fee_amount: 12.00,
          days_charged: 7,
          fee_status: 'pending' as const,
        },
      },
    ],
    letters: [],
    totalFees: 12.00,
    urgencyScore: 30,
  };

  const mockGroupWithPackagesAndLetters = {
    contact: {
      contact_id: 'contact-2',
      contact_person: 'Jane Smith',
      mailbox_number: 'A5',
    },
    packages: [
      {
        mail_item_id: 'pkg-1',
        item_type: 'Package',
        received_date: '2025-12-01T10:00:00Z',
        packageFee: {
          fee_id: 'fee-1',
          mail_item_id: 'pkg-1',
          fee_amount: 20.00,
          days_charged: 11,
          fee_status: 'pending' as const,
        },
      },
    ],
    letters: [
      {
        mail_item_id: 'letter-1',
        item_type: 'Letter',
        received_date: '2025-12-05T10:00:00Z',
        quantity: 3,
      },
      {
        mail_item_id: 'letter-2',
        item_type: 'Letter',
        received_date: '2025-12-08T10:00:00Z',
        quantity: 2,
      },
    ],
    totalFees: 20.00,
    urgencyScore: 40,
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render modal with customer info and fee details', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Z1/)).toBeInTheDocument();
      expect(screen.getByText('$12.00')).toBeInTheDocument();
      expect(screen.getByText(/Packages with fees \(1\)/i)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={false}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show staff selection buttons (Madison and Merlin)', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: 'Madison' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Merlin' })).toBeInTheDocument();
    });

    it('should show payment method buttons', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('Zelle')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('should allow selecting PayPal as payment method', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Select staff first
      fireEvent.click(screen.getByRole('button', { name: 'Madison' }));

      // Select PayPal as payment method
      const paypalButton = screen.getByText('PayPal');
      fireEvent.click(paypalButton);

      // Collect fee
      const collectButton = screen.getByRole('button', { name: /Collect \$12\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        expect(api.fees.markPaid).toHaveBeenCalledWith(
          'fee-1',
          'paypal',
          12.00,
          'Madison'
        );
      });
    });
  });

  describe('Letter Pickup Toggle', () => {
    it('should show "Mark as Picked Up" checkbox when not in pickup flow', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Also mark as Picked Up')).toBeInTheDocument();
    });

    it('should NOT show letter checkbox when customer has no letters', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Check the main "Mark as Picked Up" checkbox
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Letter checkbox should not appear (no letters in group)
      expect(screen.queryByText(/Also mark.*letter/i)).not.toBeInTheDocument();
    });

    it('should show letter checkbox when customer has letters AND main checkbox is checked', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Initially, letter checkbox should not be visible
      expect(screen.queryByText(/Also mark 2 letters as picked up/i)).not.toBeInTheDocument();

      // Check the main "Mark as Picked Up" checkbox
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Now letter checkbox should appear
      expect(screen.getByText(/Also mark 2 letters as picked up/i)).toBeInTheDocument();
    });

    it('should show correct letter count with proper pluralization', () => {
      const groupWithOneLetter = {
        ...mockGroupWithPackagesAndLetters,
        letters: [mockGroupWithPackagesAndLetters.letters[0]],
      };

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={groupWithOneLetter}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Check main checkbox
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Should say "letter" (singular)
      expect(screen.getByText(/Also mark 1 letter as picked up/i)).toBeInTheDocument();
    });

    it('should hide letter checkbox when main checkbox is unchecked', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Check main checkbox
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);
      expect(screen.getByText(/Also mark 2 letters as picked up/i)).toBeInTheDocument();

      // Uncheck main checkbox
      fireEvent.click(mainCheckbox);
      expect(screen.queryByText(/Also mark 2 letters as picked up/i)).not.toBeInTheDocument();
    });
  });

  describe('Staff Selection', () => {
    it('should require staff selection before collecting fee', async () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Try to collect without selecting staff
      const collectButton = screen.getByRole('button', { name: /Collect \$12\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        // Now uses informational toast instead of error toast
        expect(toast).toHaveBeenCalledWith('Please select who collected the fee', expect.objectContaining({
          icon: 'ℹ️'
        }));
      });
    });

    it('should allow collecting fee after selecting staff', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Select Madison
      const madisonButton = screen.getByRole('button', { name: 'Madison' });
      fireEvent.click(madisonButton);

      // Collect fee
      const collectButton = screen.getByRole('button', { name: /Collect \$12\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        expect(api.fees.markPaid).toHaveBeenCalledWith(
          'fee-1',
          'cash',
          12.00,
          'Madison'
        );
      });
    });

    it('should visually indicate selected staff', () => {
      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      const madisonButton = screen.getByRole('button', { name: 'Madison' });
      const merlinButton = screen.getByRole('button', { name: 'Merlin' });

      // Initially neither should be selected
      expect(madisonButton).not.toHaveClass('bg-purple-600');
      expect(merlinButton).not.toHaveClass('bg-blue-600');

      // Select Madison
      fireEvent.click(madisonButton);
      expect(madisonButton).toHaveClass('bg-purple-600');

      // Select Merlin (should deselect Madison)
      fireEvent.click(merlinButton);
      expect(merlinButton).toHaveClass('bg-blue-600');
      expect(madisonButton).not.toHaveClass('bg-purple-600');
    });
  });

  describe('Fee Collection with Pickup', () => {
    it('should mark only packages as picked up when letter checkbox is unchecked', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Select staff
      fireEvent.click(screen.getByRole('button', { name: 'Madison' }));

      // Check "Mark as Picked Up"
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Uncheck letter checkbox
      const letterCheckbox = screen.getByRole('checkbox', { name: /Also mark 2 letters/i });
      fireEvent.click(letterCheckbox);

      // Collect
      const collectButton = screen.getByRole('button', { name: /Collect \$20\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        // Should mark only the package as picked up, not the letters
        // API now only takes 2 arguments (id, status) - staff tracking is handled server-side
        expect(api.mailItems.updateStatus).toHaveBeenCalledTimes(1);
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith('pkg-1', 'Picked Up');
      });

      // Celebration overlay will show instead of toast
    });

    it('should mark both packages and letters as picked up when letter checkbox is checked', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Select staff
      fireEvent.click(screen.getByRole('button', { name: 'Merlin' }));

      // Check "Mark as Picked Up"
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Letter checkbox should be checked by default
      const letterCheckbox = screen.getByRole('checkbox', { name: /Also mark 2 letters/i });
      expect(letterCheckbox).toBeChecked();

      // Collect
      const collectButton = screen.getByRole('button', { name: /Collect \$20\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        // Should mark package + 2 letters = 3 items
        // API now only takes 2 arguments (id, status) - staff tracking is handled server-side
        expect(api.mailItems.updateStatus).toHaveBeenCalledTimes(3);
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith('pkg-1', 'Picked Up');
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith('letter-1', 'Picked Up');
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith('letter-2', 'Picked Up');
      });

      // Celebration overlay will show instead of toast
    });

    it('should NOT mark items as picked up when checkbox is unchecked', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Select staff
      fireEvent.click(screen.getByRole('button', { name: 'Madison' }));

      // Don't check "Mark as Picked Up"

      // Collect
      const collectButton = screen.getByRole('button', { name: /Collect \$20\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        // Should NOT call updateStatus at all
        expect(api.mailItems.updateStatus).not.toHaveBeenCalled();
      });

      // Celebration overlay will show instead of toast
    });
  });

  describe('Waive Flow', () => {
    it('should use user email as performed_by when waiving (no staff selection)', async () => {
      vi.mocked(api.fees.waive).mockResolvedValue({ success: true });
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Check "Mark as Picked Up" BEFORE entering waive mode
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Now click "Waive Fee" button to enter waive mode
      const waiveButton = screen.getByRole('button', { name: 'Waive Fee' });
      fireEvent.click(waiveButton);

      // Enter reason
      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Customer goodwill' } });

      // Confirm waive
      const confirmButton = screen.getByRole('button', { name: /Waive \$12\.00/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        // API now only takes 2 arguments (id, status) - staff tracking is handled server-side
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith(
          'pkg-1',
          'Picked Up'
        );
      });
    });
  });

  describe('Skip Flow', () => {
    it('should mark items as picked up with skip and user email', async () => {
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Check "Mark as Picked Up"
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Click "Skip (Owes)"
      const skipButton = screen.getByRole('button', { name: /Skip \(Owes\)/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        // API now only takes 2 arguments (id, status) - staff tracking is handled server-side
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith(
          'pkg-1',
          'Picked Up'
        );
      });
    });
  });

  describe('Amount Editing', () => {
    it('should allow editing fee amount for discounts', async () => {
      vi.mocked(api.fees.markPaid).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesOnly}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      // Find the amount input and change it
      const amountInput = screen.getByDisplayValue('12.00');
      fireEvent.change(amountInput, { target: { value: '8.00' } });

      // Select staff
      fireEvent.click(screen.getByRole('button', { name: 'Madison' }));

      // Collect
      const collectButton = screen.getByRole('button', { name: /Collect \$8\.00/i });
      fireEvent.click(collectButton);

      await waitFor(() => {
        expect(api.fees.markPaid).toHaveBeenCalledWith(
          'fee-1',
          'cash',
          8.00,
          'Madison'
        );
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset all fields when modal closes', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Make some changes
      fireEvent.click(screen.getByRole('button', { name: 'Madison' }));
      const mainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      fireEvent.click(mainCheckbox);

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Reopen modal
      rerender(
        <BrowserRouter>
          <CollectFeeModal
            isOpen={true}
            onClose={mockOnClose}
            group={mockGroupWithPackagesAndLetters}
            onSuccess={mockOnSuccess}
          />
        </BrowserRouter>
      );

      // Staff selection should be reset
      const madisonButton = screen.getByRole('button', { name: 'Madison' });
      expect(madisonButton).not.toHaveClass('bg-purple-600');

      // Checkbox should be unchecked
      const resetMainCheckbox = screen.getByRole('checkbox', { name: /Also mark as Picked Up/i });
      expect(resetMainCheckbox).not.toBeChecked();
    });
  });
});

