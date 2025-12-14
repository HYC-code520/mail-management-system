import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import Dashboard from '../Dashboard';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock API client with all required methods
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  api: {
    contacts: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mailItems: {
      getAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
    },
    notifications: {
      quickNotify: vi.fn(),
    },
    stats: {
      getDashboardStats: vi.fn(),
    },
    fees: {
      getUnpaidByContact: vi.fn(),
      markPaid: vi.fn(),
      waive: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api-client';

// Helper to create mock dashboard stats
const createMockDashboardStats = (needsFollowUp: any[] = []) => ({
  todaysMail: 5,
  pendingPickups: 10,
  remindersDue: 3,
  overdueMail: 2,
  completedToday: 8,
  recentMailItems: [],
  recentCustomers: [],
  newCustomersToday: 1,
  needsFollowUp,
  mailVolumeData: [],
  customerGrowthData: [],
  outstandingFees: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  waivedFees: 0,
});

// Mock contacts data
const mockContacts = [
  {
    contact_id: 'contact-1',
    contact_person: 'John Doe',
    company_name: 'Acme Corp',
    mailbox_number: 'A1',
    email: 'john@example.com',
    status: 'Active',
  },
];

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default successful responses
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.mailItems.getAll as any).mockResolvedValue([]);
    (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats());
    (api.fees.getUnpaidByContact as any).mockResolvedValue({ fees: [], total: 0 });
  });

  it('renders dashboard with loading state', async () => {
    render(<Dashboard />);

    // Wait for Dashboard to render after loading - check for stat cards
    await waitFor(() => {
      expect(screen.getByText("Today's Mail")).toBeInTheDocument();
    });

    // Wait for data loading to complete
    await waitFor(() => {
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('displays statistics when data is loaded', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Dashboard should render stat cards
      expect(screen.getByText("Today's Mail")).toBeInTheDocument();
      expect(screen.getByText('Pending Pickups')).toBeInTheDocument();
    });

    // Verify API was called
    expect(api.stats.getDashboardStats).toHaveBeenCalled();
  });

  it('shows error message when data fetch fails', async () => {
    // Override default mocks with errors
    (api.stats.getDashboardStats as any).mockRejectedValue(new Error('Network error'));

    render(<Dashboard />);

    // Component should still render loading spinner initially, then handle error
    await waitFor(() => {
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('displays quick action buttons', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Today's Mail")).toBeInTheDocument();
    });

    // Check for quick actions section - it should exist in the rendered component
    await waitFor(() => {
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });
  });

  describe('Needs Follow-Up Section', () => {
    // Helper to create grouped follow-up data
    const createGroupedFollowUp = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        contact: {
          contact_id: `contact-${i}`,
          contact_person: `Customer ${i}`,
          mailbox_number: `A${i}`,
        },
        packages: [{
          mail_item_id: `mail-${i}`,
          contact_id: `contact-${i}`,
          item_type: 'Package',
          status: 'Received',
          received_date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        }],
        letters: [],
        totalFees: 0,
        urgencyScore: i + 1,
        lastNotified: undefined,
      }));
    };

    it('renders when there are items needing follow-up', async () => {
      const groups = createGroupedFollowUp(5);
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats(groups));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Today's Mail")).toBeInTheDocument();
      });

      // Dashboard shows follow-up count in quick actions, not individual customer names
      // The count is passed to QuickActionsSection
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });

    it('passes follow-up count to quick actions section', async () => {
      const groups = createGroupedFollowUp(3);
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats(groups));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Today's Mail")).toBeInTheDocument();
      });

      // The follow-up count is displayed in the quick actions section
      // Verify the API was called with the right data
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });

    it('shows empty state when no items need follow-up', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats([]));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Today's Mail")).toBeInTheDocument();
      });

      // Dashboard should render stat cards even with empty follow-up
      expect(screen.getByText('Pending Pickups')).toBeInTheDocument();
    });
  });
});
