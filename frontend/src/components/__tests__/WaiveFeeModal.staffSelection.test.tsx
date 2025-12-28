import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WaiveFeeModal from '../WaiveFeeModal';
import { api } from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client');
vi.mock('react-hot-toast');

describe('WaiveFeeModal - Staff Selection', () => {
  const mockGroup = {
    contact: {
      contact_id: 'contact-1',
      contact_person: 'John Doe',
      company_name: undefined,
      mailbox_number: 'MB-101'
    },
    packages: [
      {
        mail_item_id: 'mail-1',
        item_type: 'Package',
        received_date: '2025-12-01',
        status: 'Notified',
        quantity: 1,
        packageFee: {
          fee_id: 'fee-1',
          fee_amount: 10.00,
          fee_status: 'pending',
          days_charged: 5
        }
      }
    ],
    letters: [],
    totalFees: 10.00,
    urgencyScore: 10,
    lastNotified: '2025-12-01'
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fees.waive).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render staff selection buttons (Madison and Merlin)', () => {
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

    expect(screen.getByText('Madison')).toBeInTheDocument();
    expect(screen.getByText('Merlin')).toBeInTheDocument();
    expect(screen.getByText('Who is waiving this fee?')).toBeInTheDocument();
  });

  it('should show validation error when staff is not selected', async () => {
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

    // Fill in reason
    const reasonInput = screen.getByPlaceholderText(/Goodwill gesture/i);
    fireEvent.change(reasonInput, { target: { value: 'Customer loyalty discount' } });

    // Try to submit without selecting staff
    const waiveButton = screen.getByRole('button', { name: /Waive \$10.00/i });
    fireEvent.click(waiveButton);

    // Should show validation message
    await waitFor(() => {
      expect(screen.getByText('Please select who is waiving the fee')).toBeInTheDocument();
    });

    // API should not be called
    expect(api.fees.waive).not.toHaveBeenCalled();
  });

  it('should highlight selected staff button', () => {
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

    const madisonButton = screen.getByRole('button', { name: 'Madison' });
    const merlinButton = screen.getByRole('button', { name: 'Merlin' });

    // Initially neither should be highlighted (purple or blue background)
    expect(madisonButton).not.toHaveClass('bg-purple-50');
    expect(merlinButton).not.toHaveClass('bg-blue-50');

    // Click Madison
    fireEvent.click(madisonButton);
    expect(madisonButton).toHaveClass('bg-purple-50');
    expect(merlinButton).not.toHaveClass('bg-blue-50');

    // Click Merlin
    fireEvent.click(merlinButton);
    expect(madisonButton).not.toHaveClass('bg-purple-50');
    expect(merlinButton).toHaveClass('bg-blue-50');
  });

  it('should submit with Madison selected', async () => {
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

    // Fill in reason
    const reasonInput = screen.getByPlaceholderText(/Goodwill gesture/i);
    fireEvent.change(reasonInput, { target: { value: 'Customer loyalty discount' } });

    // Select Madison
    const madisonButton = screen.getByRole('button', { name: 'Madison' });
    fireEvent.click(madisonButton);

    // Submit
    const waiveButton = screen.getByRole('button', { name: /Waive \$10.00/i });
    fireEvent.click(waiveButton);

    // Verify API was called - staff tracking is now handled server-side
    await waitFor(() => {
      expect(api.fees.waive).toHaveBeenCalledWith(
        'fee-1',
        'Customer loyalty discount'
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should submit with Merlin selected', async () => {
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

    // Fill in reason
    const reasonInput = screen.getByPlaceholderText(/Goodwill gesture/i);
    fireEvent.change(reasonInput, { target: { value: 'System error correction' } });

    // Select Merlin
    const merlinButton = screen.getByRole('button', { name: 'Merlin' });
    fireEvent.click(merlinButton);

    // Submit
    const waiveButton = screen.getByRole('button', { name: /Waive \$10.00/i });
    fireEvent.click(waiveButton);

    // Verify API was called - staff tracking is now handled server-side
    await waitFor(() => {
      expect(api.fees.waive).toHaveBeenCalledWith(
        'fee-1',
        'System error correction'
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should reset staff selection on modal close', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Select Madison
    const madisonButton = screen.getByRole('button', { name: 'Madison' });
    fireEvent.click(madisonButton);
    expect(madisonButton).toHaveClass('bg-purple-50');

    // Click cancel to trigger handleClose
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();

    // Unmount and remount to simulate modal closing and reopening
    unmount();

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

    // Staff selection should be reset (new component instance)
    const madisonButtonAfterReopen = screen.getByRole('button', { name: 'Madison' });
    expect(madisonButtonAfterReopen).not.toHaveClass('bg-purple-50');
  });

  it('should disable staff buttons while saving', async () => {
    // Make API call slow
    vi.mocked(api.fees.waive).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    const { unmount } = render(
      <BrowserRouter>
        <WaiveFeeModal
          isOpen={true}
          onClose={mockOnClose}
          group={mockGroup}
          onSuccess={mockOnSuccess}
        />
      </BrowserRouter>
    );

    // Fill form and select staff
    const reasonInput = screen.getByPlaceholderText(/Goodwill gesture/i);
    fireEvent.change(reasonInput, { target: { value: 'Customer complaint' } });
    
    const madisonButton = screen.getByRole('button', { name: 'Madison' });
    fireEvent.click(madisonButton);

    // Submit
    const waiveButton = screen.getByRole('button', { name: /Waive \$10.00/i });
    fireEvent.click(waiveButton);

    // Buttons should be disabled during save
    await waitFor(() => {
      expect(madisonButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Merlin' })).toBeDisabled();
    });

    // Wait for the async operation to complete before unmounting
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    // Clean up
    unmount();
  });
});

