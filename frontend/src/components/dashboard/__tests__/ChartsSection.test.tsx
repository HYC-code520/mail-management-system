import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartsSection from '../ChartsSection';

// Mock recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockMailVolumeData = [
  { date: '2025-01-01', count: 5 },
  { date: '2025-01-02', count: 10 },
  { date: '2025-01-03', count: 8 },
  { date: '2025-01-04', count: 12 },
  { date: '2025-01-05', count: 7 },
  { date: '2025-01-06', count: 15 },
  { date: '2025-01-07', count: 9 },
];

const mockCustomerGrowthData = [
  { date: '2025-01-01', customers: 2 },
  { date: '2025-01-02', customers: 1 },
  { date: '2025-01-03', customers: 3 },
  { date: '2025-01-04', customers: 0 },
  { date: '2025-01-05', customers: 2 },
  { date: '2025-01-06', customers: 1 },
  { date: '2025-01-07', customers: 4 },
];

describe('ChartsSection', () => {
  it('should render time range buttons', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('14 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
  });

  it('should display Mail Volume chart title', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getByText('Mail Volume')).toBeInTheDocument();
    // Both charts show "Last X days" so use getAllByText
    expect(screen.getAllByText('Last 7 days').length).toBe(2);
  });

  it('should display New Customers chart title', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getByText('New Customers')).toBeInTheDocument();
  });

  it('should call onTimeRangeChange when clicking time range buttons', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText('14 Days'));
    expect(onTimeRangeChange).toHaveBeenCalledWith(14);

    fireEvent.click(screen.getByText('30 Days'));
    expect(onTimeRangeChange).toHaveBeenCalledWith(30);
  });

  it('should not call onTimeRangeChange when loading', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={true}
      />
    );

    fireEvent.click(screen.getByText('14 Days'));
    expect(onTimeRangeChange).not.toHaveBeenCalled();
  });

  it('should highlight selected time range button', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={14}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    const button14 = screen.getByText('14 Days');
    expect(button14).toHaveClass('bg-white', 'text-blue-700');
  });

  it('should update subtitle based on time range', () => {
    const onTimeRangeChange = vi.fn();

    const { rerender } = render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getAllByText('Last 7 days').length).toBe(2);

    rerender(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={30}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getAllByText('Last 30 days').length).toBe(2);
  });

  it('should render bar chart for mail volume', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render area chart for customer growth', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('should disable buttons and show reduced opacity when loading', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={mockMailVolumeData}
        customerGrowthData={mockCustomerGrowthData}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  it('should handle empty data gracefully', () => {
    const onTimeRangeChange = vi.fn();

    render(
      <ChartsSection
        mailVolumeData={[]}
        customerGrowthData={[]}
        chartTimeRange={7}
        onTimeRangeChange={onTimeRangeChange}
        loading={false}
      />
    );

    // Should still render the component without errors
    expect(screen.getByText('Mail Volume')).toBeInTheDocument();
    expect(screen.getByText('New Customers')).toBeInTheDocument();
  });
});
