import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GroupedFollowUpSection from '../GroupedFollowUp';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GroupedFollowUpSection', () => {
  const mockGroups = [
    {
      contact: {
        contact_id: 'contact-1',
        contact_person: 'John Doe',
        mailbox_number: 'Z1',
      },
      packages: [
        {
          mail_item_id: 'mail-1',
          item_type: 'Package',
          status: 'Received',
          received_date: '2025-12-03T10:00:00Z',
          contact_id: 'contact-1',
          packageFee: {
            fee_id: 'fee-1',
            fee_amount: 12.00,
            days_charged: 7,
            fee_status: 'pending',
          },
        },
      ],
      letters: [],
      totalFees: 12.00,
      urgencyScore: 50,
      lastNotified: '2025-12-05T10:00:00Z',
    },
    {
      contact: {
        contact_id: 'contact-2',
        contact_person: 'Jane Smith',
        mailbox_number: 'D2',
      },
      packages: [],
      letters: [
        {
          mail_item_id: 'mail-2',
          item_type: 'Letter',
          status: 'Received',
          received_date: '2025-11-10T10:00:00Z',
          contact_id: 'contact-2',
        },
      ],
      totalFees: 0,
      urgencyScore: 100,
    },
  ];

  const mockOnWaiveFee = vi.fn();
  const mockOnSendEmail = vi.fn();
  const mockOnMarkAbandoned = vi.fn();
  const mockOnCollectFee = vi.fn();
  const mockGetDaysSince = vi.fn((date) => {
    const diff = new Date().getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (groups = mockGroups, getDaysSince = mockGetDaysSince) => {
    return render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={groups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          onCollectFee={mockOnCollectFee}
          getDaysSince={getDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );
  };

  it('should render follow-up section with groups', () => {
    renderComponent();

    expect(screen.getByText('Need Follow-up')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display package fees in header', () => {
    renderComponent();

    // Fees are displayed in header as: $12.00 storage fees
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('storage fees')).toBeInTheDocument();
  });

  it('should expand/collapse card when clicked', async () => {
    renderComponent();

    // Find the card by looking for the element with cursor-pointer class that contains "John Doe"
    const card = screen.getByText('John Doe').closest('div[class*="rounded-xl"]');

    // Click to expand
    fireEvent.click(card!);

    await waitFor(() => {
      // John Doe has 1 package, so it shows "1 package waiting"
      expect(screen.getByText(/1 package waiting/i)).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.queryByText(/1 package waiting/i)).not.toBeInTheDocument();
    });
  });

  it('should call onCollectFee when collect button is clicked', async () => {
    renderComponent();

    // Find the Collect button (for customer with fees)
    const collectButton = screen.getByRole('button', { name: /Collect \$12/i });
    fireEvent.click(collectButton);

    expect(mockOnCollectFee).toHaveBeenCalledWith(mockGroups[0]);
  });

  it('should call onSendEmail when remind button is clicked', async () => {
    renderComponent();

    // Find the Remind button (for customer with fees but not abandoned)
    const remindButton = screen.getByText(/Remind/i);
    fireEvent.click(remindButton);

    expect(mockOnSendEmail).toHaveBeenCalledWith(mockGroups[0]);
  });

  it('should call onWaiveFee when waive button is clicked', async () => {
    renderComponent();

    // Find the Waive button
    const waiveButton = screen.getByText(/Waive/i);
    fireEvent.click(waiveButton);

    expect(mockOnWaiveFee).toHaveBeenCalledWith(mockGroups[0]);
  });

  it('should show Notice button and Abandon button for abandoned packages with fees', () => {
    const abandonedGroups = [
      {
        contact: {
          contact_id: 'contact-3',
          contact_person: 'Old Package',
          mailbox_number: 'A1',
        },
        packages: [
          {
            mail_item_id: 'mail-3',
            item_type: 'Package',
            status: 'Received',
            received_date: '2025-10-10T10:00:00Z',
            contact_id: 'contact-3',
            packageFee: {
              fee_id: 'fee-3',
              fee_amount: 58.00,
              days_charged: 30,
              fee_status: 'pending',
            },
          },
        ],
        letters: [],
        totalFees: 58.00,
        urgencyScore: 200,
      },
    ];

    const mockGetDaysSinceAbandoned = vi.fn(() => 35);

    renderComponent(abandonedGroups, mockGetDaysSinceAbandoned);

    // Should show Notice button (not Final Notice, but Notice for fees + abandoned)
    expect(screen.getByRole('button', { name: /Notice/i })).toBeInTheDocument();
    // Should show Abandon button
    expect(screen.getByRole('button', { name: /Abandon/i })).toBeInTheDocument();
  });

  it('should show Final Notice and Mark Abandoned for abandoned items without fees', () => {
    const abandonedLettersGroup = [
      {
        contact: {
          contact_id: 'contact-6',
          contact_person: 'Abandoned Letters',
          mailbox_number: 'B1',
        },
        packages: [],
        letters: [
          {
            mail_item_id: 'mail-6',
            item_type: 'Letter',
            status: 'Received',
            received_date: '2025-10-10T10:00:00Z',
            contact_id: 'contact-6',
          },
        ],
        totalFees: 0,
        urgencyScore: 200,
      },
    ];

    const mockGetDaysSinceAbandoned = vi.fn(() => 35);

    renderComponent(abandonedLettersGroup, mockGetDaysSinceAbandoned);

    // Should show Final Notice button
    expect(screen.getByText(/Final Notice/i)).toBeInTheDocument();
    // Should show Mark Abandoned button
    expect(screen.getByText(/Mark Abandoned/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={[]}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          onCollectFee={mockOnCollectFee}
          getDaysSince={mockGetDaysSince}
          loading={true}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Need Follow-up')).toBeInTheDocument();
    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show empty state when no groups', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={[]}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          onCollectFee={mockOnCollectFee}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/No customers need follow-up/i)).toBeInTheDocument();
  });

  it('should render customer information correctly', () => {
    renderComponent();

    // Verify all customer names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Verify mailbox numbers are displayed
    expect(screen.getByText(/📮 Z1/)).toBeInTheDocument();
    expect(screen.getByText(/📮 D2/)).toBeInTheDocument();
    
    // Verify the section header shows correct count
    expect(screen.getByText(/2 people/)).toBeInTheDocument();
  });

  it('should call onSendEmail for Send Reminder button on letters', async () => {
    // Customer with only letters (no fees, not abandoned)
    const letterOnlyGroups = [
      {
        contact: {
          contact_id: 'contact-7',
          contact_person: 'Letter Customer',
          mailbox_number: 'L1',
        },
        packages: [],
        letters: [
          {
            mail_item_id: 'mail-7',
            item_type: 'Letter',
            status: 'Received',
            received_date: new Date().toISOString(), // Fresh letter
            contact_id: 'contact-7',
          },
        ],
        totalFees: 0,
        urgencyScore: 10,
      },
    ];

    const mockGetDaysSinceRecent = vi.fn(() => 2); // 2 days old

    renderComponent(letterOnlyGroups, mockGetDaysSinceRecent);

    // Find the Send Reminder button
    const sendReminderButton = screen.getByText(/Send Reminder/i);
    fireEvent.click(sendReminderButton);

    expect(mockOnSendEmail).toHaveBeenCalledWith(letterOnlyGroups[0]);
  });

  it('should display waived fees with appropriate styling', async () => {
    const waivedGroups = [
      {
        contact: {
          contact_id: 'contact-4',
          contact_person: 'Waived Customer',
          mailbox_number: 'W1',
        },
        packages: [
          {
            mail_item_id: 'mail-4',
            item_type: 'Package',
            status: 'Received',
            received_date: '2025-12-01T10:00:00Z',
            contact_id: 'contact-4',
            packageFee: {
              fee_id: 'fee-4',
              fee_amount: 10.00,
              days_charged: 6,
              fee_status: 'waived',
            },
          },
        ],
        letters: [],
        totalFees: 10.00,
        urgencyScore: 30,
      },
    ];

    renderComponent(waivedGroups);

    // Expand the card to see fee details
    const card = screen.getByText('Waived Customer').closest('div[class*="rounded-xl"]');
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText(/fee waived/i)).toBeInTheDocument();
    });
  });

  it('should show ABANDONED warning for old items', () => {
    const abandonedGroups = [
      {
        contact: {
          contact_id: 'contact-8',
          contact_person: 'Old Items Customer',
          mailbox_number: 'O1',
        },
        packages: [
          {
            mail_item_id: 'mail-8',
            item_type: 'Package',
            status: 'Received',
            received_date: '2025-10-01T10:00:00Z',
            contact_id: 'contact-8',
            packageFee: {
              fee_id: 'fee-8',
              fee_amount: 70.00,
              days_charged: 35,
              fee_status: 'pending',
            },
          },
        ],
        letters: [],
        totalFees: 70.00,
        urgencyScore: 200,
      },
    ];

    const mockGetDaysSinceAbandoned = vi.fn(() => 37);

    renderComponent(abandonedGroups, mockGetDaysSinceAbandoned);

    // Should show ABANDONED warning at the bottom of the card
    expect(screen.getByText(/ABANDONED:.*days old/i)).toBeInTheDocument();
  });
});
