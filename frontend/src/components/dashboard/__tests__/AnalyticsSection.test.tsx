import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsSection from '../AnalyticsSection';

// Mock recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockAnalyticsData = {
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
    'Picked Up': 15,
    Scanned: 5
  },
  paymentDistribution: {
    Cash: 20,
    Zelle: 15,
    Venmo: 10,
    PayPal: 5,
    Check: 3,
    Other: 2
  },
  ageDistribution: {
    '0-3': 10,
    '4-7': 15,
    '8-14': 8,
    '15-30': 5,
    '30+': 2
  },
  staffPerformance: { Merlin: 25, Madison: 30 },
  comparison: {
    thisMonth: { mail: 100, customers: 10 },
    lastMonth: { mail: 80, customers: 8 },
  },
};

describe('AnalyticsSection', () => {
  it('should show loading skeleton when loading', () => {
    const { container } = render(
      <AnalyticsSection analytics={mockAnalyticsData} loading={true} />
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display Service Tiers section with correct data', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    expect(screen.getByText('Service Tiers')).toBeInTheDocument();
    expect(screen.getByText('T1: 30')).toBeInTheDocument();
    expect(screen.getByText('T2: 40')).toBeInTheDocument();
  });

  it('should display Language section with correct data', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('English: 40')).toBeInTheDocument();
    expect(screen.getByText('Chinese: 25')).toBeInTheDocument();
    expect(screen.getByText('Both: 5')).toBeInTheDocument();
  });

  it('should display Mail Status section with correct data', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    expect(screen.getByText('Mail Status')).toBeInTheDocument();
    expect(screen.getByText('Received: 10')).toBeInTheDocument();
    expect(screen.getByText('Notified: 20')).toBeInTheDocument();
  });

  it('should display Payment section with correct data', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    expect(screen.getByText('Payment')).toBeInTheDocument();
    // Payment methods are sorted by custom order: cash, check, zelle, paypal
    expect(screen.getByText('Cash: 20')).toBeInTheDocument();
    expect(screen.getByText('Check: 3')).toBeInTheDocument();
    expect(screen.getByText('Zelle: 15')).toBeInTheDocument();
    expect(screen.getByText('PayPal: 5')).toBeInTheDocument();
  });

  it('should hide Language section when all values are zero', () => {
    const dataWithNoLanguage = {
      ...mockAnalyticsData,
      languageDistribution: { English: 0, Chinese: 0, Both: 0 },
    };

    render(<AnalyticsSection analytics={dataWithNoLanguage} loading={false} />);

    expect(screen.queryByText('Language')).not.toBeInTheDocument();
  });

  it('should hide Mail Status section when all values are zero', () => {
    const dataWithNoStatus = {
      ...mockAnalyticsData,
      statusDistribution: {},
    };

    render(<AnalyticsSection analytics={dataWithNoStatus} loading={false} />);

    expect(screen.queryByText('Mail Status')).not.toBeInTheDocument();
  });

  it('should hide Payment section when all values are zero', () => {
    const dataWithNoPayment = {
      ...mockAnalyticsData,
      paymentDistribution: { Cash: 0, Zelle: 0, Venmo: 0, PayPal: 0, Check: 0, Other: 0 },
    };

    render(<AnalyticsSection analytics={dataWithNoPayment} loading={false} />);

    expect(screen.queryByText('Payment')).not.toBeInTheDocument();
  });

  it('should render pie charts', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    const pieCharts = screen.getAllByTestId('pie-chart');
    expect(pieCharts.length).toBeGreaterThan(0);
  });

  it('should limit status items to 4 in legend', () => {
    const dataWithManyStatuses = {
      ...mockAnalyticsData,
      statusDistribution: {
        Received: 10,
        Notified: 20,
        'Picked Up': 15,
        Scanned: 5,
        Forward: 3,
        Abandoned: 2,
      },
    };

    render(<AnalyticsSection analytics={dataWithManyStatuses} loading={false} />);

    // Should show first 4 statuses
    expect(screen.getByText('Received: 10')).toBeInTheDocument();
    expect(screen.getByText('Notified: 20')).toBeInTheDocument();
    expect(screen.getByText('Picked Up: 15')).toBeInTheDocument();
    expect(screen.getByText('Scanned: 5')).toBeInTheDocument();
    // Should not show 5th and 6th
    expect(screen.queryByText('Forward: 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Abandoned: 2')).not.toBeInTheDocument();
  });

  it('should limit payment items to 4 in legend', () => {
    render(<AnalyticsSection analytics={mockAnalyticsData} loading={false} />);

    // Should show first 4 payment methods in custom order (cash, check, zelle, paypal)
    expect(screen.getByText('Cash: 20')).toBeInTheDocument();
    expect(screen.getByText('Check: 3')).toBeInTheDocument();
    expect(screen.getByText('Zelle: 15')).toBeInTheDocument();
    expect(screen.getByText('PayPal: 5')).toBeInTheDocument();
    // Should not show 5th onwards (venmo, other)
    expect(screen.queryByText('Venmo: 10')).not.toBeInTheDocument();
    expect(screen.queryByText('Other: 2')).not.toBeInTheDocument();
  });

  describe('Color Mapping', () => {
    it('should display Abandoned Package status when present', () => {
      const dataWithAbandoned = {
        ...mockAnalyticsData,
        statusDistribution: {
          Received: 10,
          Notified: 20,
          'Abandoned Package': 5,
        },
      };

      render(<AnalyticsSection analytics={dataWithAbandoned} loading={false} />);

      expect(screen.getByText('Abandoned Package: 5')).toBeInTheDocument();
    });

    it('should handle both Abandoned and Abandoned Package statuses', () => {
      const dataWithBothAbandoned = {
        ...mockAnalyticsData,
        statusDistribution: {
          Received: 10,
          Abandoned: 3,
        },
      };

      render(<AnalyticsSection analytics={dataWithBothAbandoned} loading={false} />);

      expect(screen.getByText('Abandoned: 3')).toBeInTheDocument();
    });

    it('should include PayPal in payment distribution when present', () => {
      const dataWithPayPal = {
        ...mockAnalyticsData,
        paymentDistribution: {
          PayPal: 25,
          Cash: 10,
          Zelle: 5,
          Venmo: 0,
          Check: 0,
          Other: 0,
        },
      };

      render(<AnalyticsSection analytics={dataWithPayPal} loading={false} />);

      // PayPal should appear in custom sort order (after cash, check, zelle)
      expect(screen.getByText('PayPal: 25')).toBeInTheDocument();
      expect(screen.getByText('Cash: 10')).toBeInTheDocument();
      expect(screen.getByText('Zelle: 5')).toBeInTheDocument();
    });
  });
});
