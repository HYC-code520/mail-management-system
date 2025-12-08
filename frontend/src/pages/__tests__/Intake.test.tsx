import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import IntakePage from '../Intake';
import { api } from '../../lib/api-client';
import { getTodayNY, getNYTimestamp } from '../../utils/timezone';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    contacts: {
      getAll: vi.fn(),
    },
    mailItems: {
      getAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
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

// Mock timezone utilities
vi.mock('../../utils/timezone', () => ({
  getTodayNY: vi.fn(),
  getNYTimestamp: vi.fn(),
}));

const mockContacts = [
  {
    contact_id: '1',
    contact_person: 'John Doe',
    company_name: 'Acme Corp',
    mailbox_number: 'MB001',
    unit_number: 'A101',
    status: 'Active',
  },
  {
    contact_id: '2',
    contact_person: 'Jane Smith',
    company_name: 'Tech Inc',
    mailbox_number: 'MB002',
    unit_number: 'B202',
    status: 'Active',
  },
  {
    contact_id: '3',
    contact_person: 'Archived User',
    company_name: 'Old Corp',
    mailbox_number: 'MB003',
    unit_number: 'C303',
    status: 'No', // Should be excluded from search
  },
];

describe('IntakePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current date as 2025-12-06
    vi.mocked(getTodayNY).mockReturnValue('2025-12-06');
    vi.mocked(getNYTimestamp).mockReturnValue('2025-12-06T14:00:00.000Z');
    
    // Default mocks
    vi.mocked(api.contacts.getAll).mockResolvedValue(mockContacts);
    vi.mocked(api.mailItems.getAll).mockResolvedValue([]);
    vi.mocked(api.mailItems.create).mockResolvedValue({
      mail_item_id: 'new-mail-1',
      contact_id: '1',
      item_type: 'Letter',
      status: 'Received',
      quantity: 1,
      received_date: '2025-12-06T12:00:00-05:00',
    });
  });

  const renderIntakePage = () => {
    return render(
      <BrowserRouter>
        <IntakePage />
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    it('renders the intake form with correct default values', async () => {
      renderIntakePage();

      expect(screen.getByText('Mail Intake')).toBeInTheDocument();
      
      const form = screen.getByRole('form');
      const dateInput = within(form).getByDisplayValue('2025-12-06');
      const typeSelect = within(form).getByRole('combobox');
      const quantityInput = within(form).getByRole('spinbutton');
      
      expect(dateInput).toHaveValue('2025-12-06');
      expect(typeSelect).toHaveValue('Letter');
      expect(quantityInput).toHaveValue(1);
    });

    it('displays "Today\'s Entries" section', async () => {
      renderIntakePage();

      expect(screen.getByText('Today\'s Entries')).toBeInTheDocument();
      expect(screen.getByText('No entries yet today')).toBeInTheDocument();
    });
  });

  describe('Contact Search', () => {
    it('searches and displays active contacts', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('excludes archived contacts (status: No) from search', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'Archived');

      await waitFor(() => {
        expect(screen.queryByText('Archived User')).not.toBeInTheDocument();
      });
    });

    it('selects a contact from dropdown', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Should show selected contact
      expect(screen.getByText(/✓ John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Mailbox: MB001/)).toBeInTheDocument();
    });
  });

  describe('Mail Entry Creation - Timezone Handling', () => {
    it('creates mail item with NY timezone date when logging at 8pm', async () => {
      const user = userEvent.setup();
      
      // Mock time as 8pm EST (20:00)
      const mockDate = new Date('2025-12-06T20:00:00-05:00');
      vi.setSystemTime(mockDate);
      
      renderIntakePage();

      // Select contact
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');
      await waitFor(() => screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      // Submit form
      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalledWith({
          contact_id: '1',
          item_type: 'Letter',
          description: '',
          status: 'Received',
          quantity: 1,
          received_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/), // ISO timestamp
        });
      });
      
      vi.useRealTimers();
    });

    it('creates mail item with NY timezone date when logging at 11pm', async () => {
      const user = userEvent.setup();
      
      // Mock time as 11pm EST (23:00) - would be next day in UTC
      const mockDate = new Date('2025-12-06T23:00:00-05:00');
      vi.setSystemTime(mockDate);
      
      renderIntakePage();

      // Select contact
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');
      await waitFor(() => screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      // Submit form
      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalledWith({
          contact_id: '1',
          item_type: 'Letter',
          description: '',
          status: 'Received',
          quantity: 1,
          received_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/), // ISO timestamp
        });
      });
      
      vi.useRealTimers();
    });

    it('creates mail item with custom date selection', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      // Select contact
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');
      await waitFor(() => screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      // Change date
      const form = screen.getByRole('form');
      const dateInput = within(form).getByDisplayValue('2025-12-06');
      await user.clear(dateInput);
      await user.type(dateInput, '2025-12-05');

      // Submit form
      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalledWith({
          contact_id: '1',
          item_type: 'Letter',
          description: '',
          status: 'Received',
          quantity: 1,
          received_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/), // ISO timestamp
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('creates a letter mail item with all fields', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      // Fill form
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'Jane');
      await waitFor(() => screen.getByText('Jane Smith'));
      await user.click(screen.getByText('Jane Smith'));

      const form = screen.getByRole('form');
      const typeSelect = within(form).getByRole('combobox');
      await user.selectOptions(typeSelect, 'Letter');

      const quantityInput = within(form).getByRole('spinbutton');
      await user.tripleClick(quantityInput);
      await user.keyboard('3');

      const noteInput = screen.getByPlaceholderText(/Add any relevant notes/);
      await user.type(noteInput, 'Priority mail');

      // Submit
      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalledWith({
          contact_id: '2',
          item_type: 'Letter',
          description: 'Priority mail',
          status: 'Received',
          quantity: 3,
          received_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/), // ISO timestamp
        });
      }, { timeout: 2000 });
    });

    it('creates a package mail item', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      // Select contact
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');
      await waitFor(() => screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      // Change type to Package
      const form = screen.getByRole('form');
      const typeSelect = within(form).getByRole('combobox');
      await user.selectOptions(typeSelect, 'Package');

      // Submit
      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalledWith({
          contact_id: '1',
          item_type: 'Package',
          description: '',
          status: 'Received',
          quantity: 1,
          received_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/), // ISO timestamp
        });
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      // Fill and submit form
      const searchInput = screen.getByPlaceholderText(/Search by Name/);
      await user.type(searchInput, 'John');
      await waitFor(() => screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      await user.click(screen.getByText('Save Mail Entry'));

      await waitFor(() => {
        expect(api.mailItems.create).toHaveBeenCalled();
      });

      // Form should be reset
      const form = screen.getByRole('form');
      const typeSelect = within(form).getByRole('combobox');
      const quantityInput = within(form).getByRole('spinbutton');
      const dateInput = within(form).getByDisplayValue('2025-12-06');
      
      expect(typeSelect).toHaveValue('Letter');
      expect(quantityInput).toHaveValue(1);
      expect(dateInput).toHaveValue('2025-12-06');
      expect(screen.queryByText(/✓ John Doe/)).not.toBeInTheDocument();
    });

    it('shows error if no contact is selected', async () => {
      const user = userEvent.setup();
      renderIntakePage();

      // Try to submit without selecting contact
      await user.click(screen.getByText('Save Mail Entry'));

      // Should not call API
      expect(api.mailItems.create).not.toHaveBeenCalled();
    });
  });

  describe('Today\'s Entries Display', () => {
    it('loads and displays today\'s entries', async () => {
      const todaysMail = [
        {
          mail_item_id: '1',
          item_type: 'Letter',
          status: 'Received',
          received_date: '2025-12-06T10:00:00-05:00',
          quantity: 2,
          contacts: {
            contact_person: 'John Doe',
            company_name: 'Acme Corp',
          },
        },
        {
          mail_item_id: '2',
          item_type: 'Package',
          status: 'Notified',
          received_date: '2025-12-06T14:00:00-05:00',
          quantity: 1,
          contacts: {
            contact_person: 'Jane Smith',
            company_name: 'Tech Inc',
          },
          description: 'Fragile',
        },
      ];

      vi.mocked(api.mailItems.getAll).mockResolvedValue(todaysMail);

      renderIntakePage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Check that entries are displayed in the table
      const table = screen.getByRole('table');
      expect(within(table).getByText('John Doe')).toBeInTheDocument();
      expect(within(table).getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Fragile')).toBeInTheDocument();
    });

    it('filters entries to show only today\'s items', async () => {
      const mixedMail = [
        {
          mail_item_id: '1',
          item_type: 'Letter',
          status: 'Received',
          received_date: '2025-12-06T10:00:00-05:00', // Today
          contacts: { contact_person: 'Today User' },
        },
        {
          mail_item_id: '2',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-12-05T10:00:00-05:00', // Yesterday
          contacts: { contact_person: 'Yesterday User' },
        },
      ];

      vi.mocked(api.mailItems.getAll).mockResolvedValue(mixedMail);

      renderIntakePage();

      await waitFor(() => {
        expect(screen.getByText('Today User')).toBeInTheDocument();
      });

      // Yesterday's entry should not be displayed
      expect(screen.queryByText('Yesterday User')).not.toBeInTheDocument();
    });

    it('allows marking items as notified', async () => {
      const user = userEvent.setup();
      const todaysMail = [
        {
          mail_item_id: '1',
          item_type: 'Letter',
          status: 'Received',
          received_date: '2025-12-06T10:00:00-05:00',
          quantity: 1,
          contacts: { contact_person: 'John Doe' },
        },
      ];

      vi.mocked(api.mailItems.getAll).mockResolvedValue(todaysMail);
      vi.mocked(api.mailItems.updateStatus).mockResolvedValue({});

      renderIntakePage();

      await waitFor(() => {
        expect(screen.getByText('Mark as Notified')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mark as Notified'));

      await waitFor(() => {
        expect(api.mailItems.updateStatus).toHaveBeenCalledWith('1', 'Notified');
      });
    });
  });

  describe('Sorting', () => {
    it('sorts entries by customer name', async () => {
      const todaysMail = [
        {
          mail_item_id: '1',
          item_type: 'Letter',
          status: 'Received',
          received_date: '2025-12-06T10:00:00-05:00',
          quantity: 1,
          contacts: { contact_person: 'Zach' },
        },
        {
          mail_item_id: '2',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-12-06T11:00:00-05:00',
          quantity: 1,
          contacts: { contact_person: 'Alice' },
        },
      ];

      vi.mocked(api.mailItems.getAll).mockResolvedValue(todaysMail);

      renderIntakePage();

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Initial state: default sort by customer ascending
      // So Alice should appear before Zach
      const table = screen.getByRole('table');
      const tbody = within(table).getAllByRole('row');
      
      // Skip header row (index 0), data rows start at index 1
      const firstRow = tbody[1];
      const secondRow = tbody[2];
      
      expect(firstRow).toHaveTextContent('Alice');
      expect(secondRow).toHaveTextContent('Zach');
    });
  });
});

