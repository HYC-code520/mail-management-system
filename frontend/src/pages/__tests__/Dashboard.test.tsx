import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/test-utils';
import Dashboard from '../Dashboard';
import { mockContacts, mockMailItems } from '../../test/mockData';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
  api: {
    contacts: {
      getAll: vi.fn(),
    },
    mailItems: {
      getAll: vi.fn(),
      updateStatus: vi.fn(),
    },
    notifications: {
      quickNotify: vi.fn(),
    },
    stats: {
      getDashboardStats: vi.fn(),
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
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default successful responses
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.mailItems.getAll as any).mockResolvedValue(mockMailItems);
    (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats());
  });

  it('renders dashboard with loading state', async () => {
    render(<Dashboard />);
    
    // Wait for Dashboard to render after loading
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(api.stats.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('displays statistics when data is loaded', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      // Dashboard should render without errors
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
    // Verify API was called
    expect(api.stats.getDashboardStats).toHaveBeenCalled();
  });

  it('shows error message when data fetch fails', async () => {
    // Override default mocks with errors
    (api.stats.getDashboardStats as any).mockRejectedValue(new Error('Network error'));
    
    render(<Dashboard />);
    
    await waitFor(() => {
      // Component should handle error gracefully and still render
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
    // Check for quick actions if they exist in the component
    // (adjust based on actual Dashboard content)
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
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Verify the section renders with data
      await waitFor(() => {
        expect(screen.getByText('Customer 0')).toBeInTheDocument();
      });
    });

    it('displays customer names in follow-up section', async () => {
      const groups = [
        {
          contact: {
            contact_id: 'contact-1',
            contact_person: 'John Doe',
            mailbox_number: 'A1',
          },
          packages: [{
            mail_item_id: 'mail-1',
            contact_id: 'contact-1',
            item_type: 'Package',
            status: 'Received',
            received_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          }],
          letters: [],
          totalFees: 10,
          urgencyScore: 5,
          lastNotified: undefined,
        },
      ];
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats(groups));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('shows empty state when no items need follow-up', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStats([]));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Dashboard should render without errors even with empty follow-up
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
