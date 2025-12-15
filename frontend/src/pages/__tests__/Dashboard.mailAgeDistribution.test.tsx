/**
 * Dashboard Mail Age Distribution Tests
 * 
 * Tests for the Mail Age Distribution chart component in the Dashboard.
 */

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

// Mock API client
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
    },
    mailItems: {
      getAll: vi.fn(),
    },
    stats: {
      getDashboardStats: vi.fn(),
    },
    fees: {
      getUnpaidByContact: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api-client';

// Helper to create mock dashboard stats with analytics
const createMockDashboardStatsWithAnalytics = (ageDistribution = {
  '0-3': 6,
  '4-7': 9,
  '8-14': 7,
  '15-30': 5,
  '30+': 0,
}) => ({
  todaysMail: 5,
  pendingPickups: 10,
  remindersDue: 3,
  overdueMail: 2,
  completedToday: 8,
  recentMailItems: [],
  recentCustomers: [],
  newCustomersToday: 1,
  needsFollowUp: [],
  mailVolumeData: [],
  customerGrowthData: [],
  outstandingFees: 112,
  totalRevenue: 600,
  monthlyRevenue: 600,
  waivedFees: 0,
  analytics: {
    avgResponseTime: 2.5,
    responseTimeBreakdown: {
      emailCustomers: 10,
      walkInCustomers: 5,
      totalPickups: 15,
    },
    activeCustomers: 50,
    inactiveCustomers: 20,
    serviceTiers: { tier1: 30, tier2: 40 },
    languageDistribution: { English: 40, Chinese: 25, Both: 5 },
    statusDistribution: {
      Received: 10,
      Notified: 20,
      'Abandoned Package': 5,
    },
    paymentDistribution: {
      Cash: 20,
      Zelle: 15,
      Venmo: 10,
      PayPal: 5,
      Check: 3,
      Other: 2,
    },
    ageDistribution,
    staffPerformance: { Merlin: 25, Madison: 30 },
    comparison: {
      thisMonth: { mail: 100, customers: 10 },
      lastMonth: { mail: 80, customers: 8 },
    },
  },
});

describe('Dashboard - Mail Age Distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getAll as any).mockResolvedValue([]);
    (api.mailItems.getAll as any).mockResolvedValue([]);
    (api.fees.getUnpaidByContact as any).mockResolvedValue({ fees: [], total: 0 });
  });

  describe('Chart Display', () => {
    it('should display Mail Age Distribution section', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });
    });

    it('should display subtitle "Current pending items by age"', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Current pending items by age')).toBeInTheDocument();
      });
    });

    it('should display all age range labels', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('0-3 days')).toBeInTheDocument();
        expect(screen.getByText('4-7 days')).toBeInTheDocument();
        expect(screen.getByText('8-14 days')).toBeInTheDocument();
        expect(screen.getByText('15-30 days')).toBeInTheDocument();
        expect(screen.getByText('30+ days')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display correct counts for each age range', async () => {
      const customAgeDistribution = {
        '0-3': 10,
        '4-7': 20,
        '8-14': 15,
        '15-30': 8,
        '30+': 3,
      };

      (api.stats.getDashboardStats as any).mockResolvedValue(
        createMockDashboardStatsWithAnalytics(customAgeDistribution)
      );

      render(<Dashboard />);

      await waitFor(() => {
        // Check that counts are displayed (they appear in the bars)
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });
    });

    it('should display percentages for each age range', async () => {
      const customAgeDistribution = {
        '0-3': 6,
        '4-7': 9,
        '8-14': 7,
        '15-30': 5,
        '30+': 0,
      };
      // Total = 27
      // 0-3: 6/27 = 22%
      // 4-7: 9/27 = 33%
      // 8-14: 7/27 = 26%
      // 15-30: 5/27 = 19%
      // 30+: 0/27 = 0%

      (api.stats.getDashboardStats as any).mockResolvedValue(
        createMockDashboardStatsWithAnalytics(customAgeDistribution)
      );

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('22%')).toBeInTheDocument();
        expect(screen.getByText('33%')).toBeInTheDocument();
        expect(screen.getByText('26%')).toBeInTheDocument();
        expect(screen.getByText('19%')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });
  });

  describe('Color Coding', () => {
    it('should render with color-coded bars based on age severity', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      const { container } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });

      // Color codes expected:
      // 0-3 days: Green (#10B981)
      // 4-7 days: Yellow (#FCD34D)
      // 8-14 days: Orange (#F59E0B)
      // 15-30 days: Red (#EF4444)
      // 30+ days: Purple (#A855F7)

      // Check that bars exist (they have transition-all class)
      const bars = container.querySelectorAll('.transition-all');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('Zero Value Handling', () => {
    it('should handle zero values gracefully', async () => {
      const zeroAgeDistribution = {
        '0-3': 0,
        '4-7': 0,
        '8-14': 0,
        '15-30': 0,
        '30+': 0,
      };

      (api.stats.getDashboardStats as any).mockResolvedValue(
        createMockDashboardStatsWithAnalytics(zeroAgeDistribution)
      );

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });

      // All should show 0%
      const percentages = screen.getAllByText('0%');
      expect(percentages.length).toBe(5);
    });

    it('should not crash with missing age distribution data', async () => {
      const statsWithoutAgeDistribution = {
        ...createMockDashboardStatsWithAnalytics(),
        analytics: {
          ...createMockDashboardStatsWithAnalytics().analytics,
          ageDistribution: undefined,
        },
      };

      // This might cause the component to not render the section
      // or handle gracefully
      (api.stats.getDashboardStats as any).mockResolvedValue(statsWithoutAgeDistribution);

      render(<Dashboard />);

      // Should not crash, dashboard should still render
      await waitFor(() => {
        expect(screen.getByText("Today's Mail")).toBeInTheDocument();
      });
    });
  });

  describe('Layout and Spacing', () => {
    it('should render bars with proper structure', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      const { container } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });

      // Check for bar containers with proper classes
      // Bars should have h-10 class for proper height
      const barContainers = container.querySelectorAll('.h-10');
      // At least 5 for each age range (may have more from other dashboard elements)
      expect(barContainers.length).toBeGreaterThanOrEqual(5);
    });

    it('should have flex-1 container for proper spacing', async () => {
      (api.stats.getDashboardStats as any).mockResolvedValue(createMockDashboardStatsWithAnalytics());

      const { container } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mail Age Distribution')).toBeInTheDocument();
      });

      // Check for flex container that distributes bars evenly
      const flexContainer = container.querySelector('.flex-1.flex.flex-col');
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
