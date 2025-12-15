import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RevenueWidget from '../RevenueWidget';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('RevenueWidget', () => {
  it('should display all revenue metrics', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={125}
        outstandingFees={75}
        totalRevenue={500}
        loading={false}
      />
    );

    expect(screen.getByText('Package Storage Revenue')).toBeInTheDocument();
    expect(screen.getByText('$125')).toBeInTheDocument();
    expect(screen.getByText('$75')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('should display $0 when values are zero', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={0}
        outstandingFees={0}
        totalRevenue={0}
        loading={false}
      />
    );

    const zeroValues = screen.getAllByText('$0');
    expect(zeroValues.length).toBe(3);
  });

  it('should show loading skeleton when loading', () => {
    const { container } = renderWithRouter(
      <RevenueWidget
        monthlyRevenue={100}
        outstandingFees={50}
        totalRevenue={300}
        loading={true}
      />
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Should not display actual values while loading
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={1234}
        outstandingFees={988}
        totalRevenue={5432}
        loading={false}
      />
    );

    expect(screen.getByText('$1234')).toBeInTheDocument();
    expect(screen.getByText('$988')).toBeInTheDocument();
    expect(screen.getByText('$5432')).toBeInTheDocument();
  });

  it('should display section labels correctly', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={100}
        outstandingFees={50}
        totalRevenue={300}
        loading={false}
      />
    );

    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Total (All Time)')).toBeInTheDocument();
  });

  it('should handle undefined values gracefully', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={undefined as any}
        outstandingFees={undefined as any}
        totalRevenue={undefined as any}
        loading={false}
      />
    );

    const zeroValues = screen.getAllByText('$0');
    expect(zeroValues.length).toBe(3);
  });

  it('should round to nearest integer', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={99.6}
        outstandingFees={50.4}
        totalRevenue={250.5}
        loading={false}
      />
    );

    // Component uses Math.round() so values are rounded to integers
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('$251')).toBeInTheDocument();
  });

  it('should have clickable Outstanding section with correct title', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={100}
        outstandingFees={70}
        totalRevenue={300}
        loading={false}
      />
    );

    const outstandingSection = screen.getByTitle('View and collect outstanding fees');
    expect(outstandingSection).toBeInTheDocument();
    expect(outstandingSection).toHaveClass('cursor-pointer');
  });

  it('should display click hint text on Outstanding section', () => {
    renderWithRouter(
      <RevenueWidget
        monthlyRevenue={100}
        outstandingFees={70}
        totalRevenue={300}
        loading={false}
      />
    );

    expect(screen.getByText('Owed - Click to collect')).toBeInTheDocument();
  });
});
