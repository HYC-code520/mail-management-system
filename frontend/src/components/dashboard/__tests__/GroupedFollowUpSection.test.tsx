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
  const mockGetDaysSince = vi.fn((date) => {
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render follow-up section with groups', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Need Follow-up')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display package fees correctly', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    // Fees are displayed with emoji prefix: 💰 $12.00
    expect(screen.getByText(/💰 \$12\.00/)).toBeInTheDocument();
  });

  it('should expand/collapse card when clicked', async () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    const card = screen.getByText('John Doe').closest('div').parentElement;
    
    // Initially collapsed (should not show package details)
    expect(screen.queryByText(/Received/i)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(card!);
    
    await waitFor(() => {
      expect(screen.getByText(/Received/i)).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(card!);
    
    await waitFor(() => {
      expect(screen.queryByText(/Received/i)).not.toBeInTheDocument();
    });
  });

  it('should call onSendEmail when send email button is clicked', async () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    const sendButton = screen.getAllByText(/Package Fee Reminder|Send Reminder/i)[0];
    fireEvent.click(sendButton);

    expect(mockOnSendEmail).toHaveBeenCalledWith(mockGroups[0]);
  });

  it('should call onWaiveFee when waive fee button is clicked', async () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    const waiveButton = screen.getByText(/Waive Fees/i);
    fireEvent.click(waiveButton);

    expect(mockOnWaiveFee).toHaveBeenCalledWith(mockGroups[0]);
  });

  it('should show "Final Notice" button for abandoned packages', () => {
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

    mockGetDaysSince.mockReturnValue(30);

    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={abandonedGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Final Notice/i)).toBeInTheDocument();
  });

  it('should display waived fees with strikethrough', () => {
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

    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={waivedGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    // Expand the card to see fee details
    const card = screen.getByText('Waived Customer').closest('div').parentElement;
    fireEvent.click(card!);

    waitFor(() => {
      expect(screen.getByText(/fee waived/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={[]}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
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
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/No customers need follow-up/i)).toBeInTheDocument();
  });

  it('should render customer information correctly', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={mockGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    // Verify all customer names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Verify mailbox numbers are displayed
    expect(screen.getByText(/📮 Z1/)).toBeInTheDocument();
    expect(screen.getByText(/📮 D2/)).toBeInTheDocument();
    
    // Verify the section header shows correct count
    expect(screen.getByText(/2 people/)).toBeInTheDocument();
  });

  it('should display correct fee amount for high fees', () => {
    // Use a getDaysSince that returns less than 30 to avoid "abandoned" state
    const mockGetDaysSinceNotAbandoned = vi.fn(() => 25);
    
    const highFeeGroups = [
      {
        contact: {
          contact_id: 'contact-5',
          contact_person: 'High Fee Customer',
          mailbox_number: 'H1',
        },
        packages: [
          {
            mail_item_id: 'mail-5',
            item_type: 'Package',
            status: 'Received',
            received_date: '2025-11-15T10:00:00Z',
            contact_id: 'contact-5',
            packageFee: {
              fee_id: 'fee-5',
              fee_amount: 60.00,
              days_charged: 25,
              fee_status: 'pending',
            },
          },
        ],
        letters: [],
        totalFees: 60.00,
        urgencyScore: 150,
      },
    ];

    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={highFeeGroups}
          onWaiveFee={mockOnWaiveFee}
          onSendEmail={mockOnSendEmail}
          getDaysSince={mockGetDaysSinceNotAbandoned}
          loading={false}
        />
      </BrowserRouter>
    );

    // Fee is displayed with emoji: 💰 $60.00
    expect(screen.getByText(/💰 \$60\.00/)).toBeInTheDocument();
    // Button shows with emoji: 📧 Fee Reminder ($60)
    expect(screen.getByText(/📧 Fee Reminder \(\$60\)/i)).toBeInTheDocument();
  });
});


