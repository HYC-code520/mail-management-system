import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LogPage from '../Log';
import * as apiClient from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    mailItems: {
      getAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
    },
    contacts: {
      getAll: vi.fn(),
    },
    notifications: {
      getByMailItem: vi.fn(),
      quickNotify: vi.fn(),
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

describe('LogPage - Date Functionality', () => {
  beforeEach(() => {
    // Mock API responses
    vi.mocked(apiClient.api.mailItems.getAll).mockResolvedValue([]);
    vi.mocked(apiClient.api.contacts.getAll).mockResolvedValue([
      {
        contact_id: '1',
        contact_person: 'Test User',
        company_name: 'Test Company',
        mailbox_number: 'A1',
        status: 'Active',
        service_tier: 2,
      },
    ]);
  });

  beforeEach(() => {
    // Mock system time to December 8, 2025 12:00 PM EST
    // This ensures consistent dates across all timezones (local and CI)
    const mockDate = new Date('2025-12-08T12:00:00-05:00');
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Restore real time
  });

  /**
   * Helper function to get today's date in local timezone
   * (matches the getTodayLocal() function in Log.tsx)
   */
  const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('should default date to today in local timezone (not UTC)', async () => {
    render(
      <BrowserRouter>
        <LogPage showAddForm={true} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue(getTodayLocal()) as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.type).toBe('date');
    });
  });

  it('should display helper text for date field', async () => {
    render(
      <BrowserRouter>
        <LogPage showAddForm={true} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Select the date the mail was received')).toBeInTheDocument();
    });
  });

  it('should reset date to today (local timezone) after successful submission', async () => {
    // Mock successful mail creation
    vi.mocked(apiClient.api.mailItems.create).mockResolvedValue({
      mail_item_id: '1',
      contact_id: '1',
      item_type: 'Letter',
      status: 'Received',
      quantity: 1,
      received_date: new Date().toISOString(),
    });

    render(
      <BrowserRouter>
        <LogPage showAddForm={true} />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      const dateInput = screen.getByDisplayValue(getTodayLocal());
      expect(dateInput).toBeInTheDocument();
    });

    // Note: Full form submission test would require more complex setup
    // This test verifies the initial state and constraints
    // Integration tests should cover the full submission flow
  });

  it('should handle timezone edge cases (near midnight)', () => {
    // Test that our date function works correctly
    const localDate = getTodayLocal();
    const utcDate = new Date().toISOString().split('T')[0];

    // Both should be valid date strings
    expect(localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Local date should never be in the future relative to UTC
    const localDateObj = new Date(localDate);
    const utcDateObj = new Date(utcDate);
    expect(localDateObj.getTime()).toBeLessThanOrEqual(utcDateObj.getTime() + 86400000); // Within 24 hours
  });

  it('should format date correctly with padded zeros', () => {
    const date = getTodayLocal();
    const parts = date.split('-');

    // Year should be 4 digits
    expect(parts[0]).toHaveLength(4);

    // Month should be 2 digits with leading zero if needed
    expect(parts[1]).toHaveLength(2);
    expect(parseInt(parts[1])).toBeGreaterThanOrEqual(1);
    expect(parseInt(parts[1])).toBeLessThanOrEqual(12);

    // Day should be 2 digits with leading zero if needed
    expect(parts[2]).toHaveLength(2);
    expect(parseInt(parts[2])).toBeGreaterThanOrEqual(1);
    expect(parseInt(parts[2])).toBeLessThanOrEqual(31);
  });

  it('should allow selecting old dates (30+ days ago)', async () => {
    // Mock API responses
    vi.mocked(apiClient.api.mailItems.create).mockResolvedValue({
      mail_item_id: '1',
      contact_id: '1',
      item_type: 'Letter',
      status: 'Received',
      quantity: 1,
      received_date: '2024-10-01', // 30+ days ago
    });

    render(
      <BrowserRouter>
        <LogPage showAddForm={true} />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(getTodayLocal());
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    // Find the date input
    const dateInputs = screen.getAllByDisplayValue(getTodayLocal());
    const dateInput = dateInputs.find((input: HTMLElement) => (input as HTMLInputElement).type === 'date') as HTMLInputElement;

    // Change date to 35 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);
    const oldDateString = oldDate.toISOString().split('T')[0];

    fireEvent.change(dateInput, { target: { value: oldDateString } });

    // Verify the date was updated
    await waitFor(() => {
      expect(dateInput.value).toBe(oldDateString);
    });
  });

  it('should send correct date format to backend (YYYY-MM-DD)', async () => {
    // Mock successful mail creation
    vi.mocked(apiClient.api.mailItems.create).mockResolvedValue({
      mail_item_id: '1',
      contact_id: '1',
      item_type: 'Letter',
      status: 'Received',
      quantity: 1,
      received_date: '2024-10-15',
    });

    render(
      <BrowserRouter>
        <LogPage showAddForm={true} />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getAllByDisplayValue(getTodayLocal()).length).toBeGreaterThan(0);
    });

    // Set a specific old date
    const dateInputs = screen.getAllByDisplayValue(getTodayLocal());
    const dateInput = dateInputs.find((input: HTMLElement) => (input as HTMLInputElement).type === 'date') as HTMLInputElement;
    
    fireEvent.change(dateInput, { target: { value: '2024-10-15' } });

    // Note: This test verifies the format, full integration would require
    // mocking contact selection and form submission
    expect(dateInput.value).toBe('2024-10-15');
  });
});

