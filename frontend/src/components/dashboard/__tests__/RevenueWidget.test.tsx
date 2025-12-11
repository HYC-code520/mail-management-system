import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RevenueWidget from '../RevenueWidget';

describe('RevenueWidget', () => {
  it('should display all revenue metrics', () => {
    render(
      <RevenueWidget
        monthlyRevenue={125.50}
        outstandingFees={75.00}
        totalRevenue={500.25}
        loading={false}
      />
    );

    expect(screen.getByText('Package Storage Revenue')).toBeInTheDocument();
    expect(screen.getByText('$125.50')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.getByText('$500.25')).toBeInTheDocument();
  });

  it('should display $0.00 when values are zero', () => {
    render(
      <RevenueWidget
        monthlyRevenue={0}
        outstandingFees={0}
        totalRevenue={0}
        loading={false}
      />
    );

    const zeroValues = screen.getAllByText('$0.00');
    expect(zeroValues.length).toBe(3);
  });

  it('should show loading skeleton when loading', () => {
    const { container } = render(
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
    render(
      <RevenueWidget
        monthlyRevenue={1234.56}
        outstandingFees={987.65}
        totalRevenue={5432.10}
        loading={false}
      />
    );

    expect(screen.getByText('$1234.56')).toBeInTheDocument();
    expect(screen.getByText('$987.65')).toBeInTheDocument();
    expect(screen.getByText('$5432.10')).toBeInTheDocument();
  });

  it('should display section labels correctly', () => {
    render(
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
    render(
      <RevenueWidget
        monthlyRevenue={undefined as any}
        outstandingFees={undefined as any}
        totalRevenue={undefined as any}
        loading={false}
      />
    );

    const zeroValues = screen.getAllByText('$0.00');
    expect(zeroValues.length).toBe(3);
  });

  it('should round to 2 decimal places', () => {
    render(
      <RevenueWidget
        monthlyRevenue={99.999}
        outstandingFees={50.001}
        totalRevenue={250.5}
        loading={false}
      />
    );

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$250.50')).toBeInTheDocument();
  });
});


