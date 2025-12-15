import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WaiveFeeModal from '../WaiveFeeModal';
import { api } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client');
vi.mock('react-hot-toast');

describe('WaiveFeeModal', () => {
  const mockGroup = {
    contact: {
      contact_id: 'contact-1',
      contact_person: 'John Doe',
      mailbox_number: 'Z1',
    },
    packages: [
      {
        mail_item_id: 'mail-1',
        item_type: 'Package',
        status: 'Received',
        received_date: '2025-12-03T10:00:00Z',
        contact_id: 'contact-1',
        packageFee: {
          fee_id: 'fee-1',
          fee_amount: 12.00,
          days_charged: 7,
          fee_status: 'pending',
        },
      },
      {
        mail_item_id: 'mail-2',
        item_type: 'Package',
        status: 'Received',
        received_date: '2025-12-01T10:00:00Z',
        contact_id: 'contact-1',
        packageFee: {
          fee_id: 'fee-2',
          fee_amount: 16.00,
          days_charged: 9,
          fee_status: 'pending',
        },
      },
    ],
    letters: [],
    totalFees: 28.00,
    urgencyScore: 50,
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with customer info', () => {
    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Waiving fees for:/i)).toBeInTheDocument();
    expect(screen.getByText(/Z1/)).toBeInTheDocument();
    expect(screen.getByText(/Packages \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('$28.00')).toBeInTheDocument();
  });

  it('should display all pending packages', () => {
    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Fee amounts are displayed in format "• Day X - $XX.XX"
    expect(screen.getByText(/\$12\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$16\.00/)).toBeInTheDocument();
  });

  it('should require reason input', async () => {
    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Button shows "Waive $XX.XX" and is disabled when reason is not entered
    const confirmButton = screen.getByText(/Waive \$28\.00/i);
    expect(confirmButton).toBeDisabled();
  });

  it('should waive all fees successfully', async () => {
    vi.mocked(api.fees.waive).mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    const reasonInput = screen.getByRole('textbox');
    fireEvent.change(reasonInput, { target: { value: 'Customer complaint resolution' } });

    // Select staff (Madison)
    const madisonButton = screen.getByRole('button', { name: 'Madison' });
    fireEvent.click(madisonButton);

    const confirmButton = screen.getByText(/Waive \$28\.00/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.fees.waive).toHaveBeenCalledTimes(2);
      // Staff tracking is now handled server-side
      expect(api.fees.waive).toHaveBeenCalledWith('fee-1', 'Customer complaint resolution');
      expect(api.fees.waive).toHaveBeenCalledWith('fee-2', 'Customer complaint resolution');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Waived'),
        expect.anything()
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(api.fees.waive).mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    const reasonInput = screen.getByRole('textbox');
    fireEvent.change(reasonInput, { target: { value: 'Good customer' } });

    // Select staff (Merlin)
    const merlinButton = screen.getByRole('button', { name: 'Merlin' });
    fireEvent.click(merlinButton);

    const confirmButton = screen.getByText(/Waive \$28\.00/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('should close modal on cancel', () => {
    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable button when reason is too short', () => {
    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Button should be disabled initially (no reason entered)
    const confirmButton = screen.getByText(/Waive \$28\.00/i);
    expect(confirmButton).toBeDisabled();

    // Enter a short reason (less than 5 characters)
    const reasonInput = screen.getByRole('textbox');
    fireEvent.change(reasonInput, { target: { value: 'abc' } });

    // Button should still be disabled
    expect(confirmButton).toBeDisabled();
    
    // Enter a valid reason (5+ characters)
    fireEvent.change(reasonInput, { target: { value: 'Valid reason' } });
    
    // Button should now be enabled
    expect(confirmButton).not.toBeDisabled();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={false}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should filter out already waived and paid fees', () => {
    const groupWithMixedFees = {
      ...mockGroup,
      packages: [
        ...mockGroup.packages,
        {
          mail_item_id: 'mail-3',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-11-28T10:00:00Z',
          contact_id: 'contact-1',
          packageFee: {
            fee_id: 'fee-3',
            fee_amount: 20.00,
            days_charged: 11,
            fee_status: 'waived',
          },
        },
        {
          mail_item_id: 'mail-4',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-11-25T10:00:00Z',
          contact_id: 'contact-1',
          packageFee: {
            fee_id: 'fee-4',
            fee_amount: 25.00,
            days_charged: 14,
            fee_status: 'paid',
          },
        },
      ],
    };

    render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={groupWithMixedFees}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Should show only 2 pending packages (the waived/paid ones are filtered out)
    expect(screen.getByText(/Packages \(2\)/i)).toBeInTheDocument();
    // The $20 and $25 fees (waived/paid) should not appear as line items
    expect(screen.queryByText(/Day 11 - \$20\.00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Day 14 - \$25\.00/)).not.toBeInTheDocument();
  });
});



