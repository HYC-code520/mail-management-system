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

// Helper to create dates relative to today
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

describe('GroupedFollowUpSection', () => {
  // Use dynamic dates to prevent test staleness
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
          received_date: daysAgo(10), // 10 days ago - not abandoned
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
      lastNotified: daysAgo(5),
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
          received_date: daysAgo(20), // 20 days ago - not abandoned
          contact_id: 'contact-2',
        },
      ],
      totalFees: 0,
      urgencyScore: 100,
    },
  ];

  const mockOnSendEmail = vi.fn();
  const mockOnMarkAbandoned = vi.fn();
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
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={getDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );
  };

  it('should render follow-up cards with customer names', () => {
    renderComponent();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display package fees on cards', () => {
    renderComponent();

    // Fees are displayed on the card
    const feeElements = screen.getAllByText(/\$12\.00/);
    expect(feeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('storage fees')).toBeInTheDocument();
  });

  it('should expand card when clicked', async () => {
    renderComponent();

    // Find the card for John Doe and click it
    const johnDoeCard = screen.getByText('John Doe').closest('div[class*="rounded-2xl"]');
    fireEvent.click(johnDoeCard!);

    await waitFor(() => {
      // When expanded, should show table with Item, Qty, Age, Fee columns
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Fee')).toBeInTheDocument();
    });
  });

  it('should call onSendEmail when remind button is clicked', async () => {
    renderComponent();

    // First expand the card by clicking it
    const johnDoeCard = screen.getByText('John Doe').closest('div[class*="rounded-2xl"]');
    fireEvent.click(johnDoeCard!);

    await waitFor(() => {
      // Find the Remind button
      const remindButton = screen.getByRole('button', { name: /Remind/i });
      fireEvent.click(remindButton);
      expect(mockOnSendEmail).toHaveBeenCalledWith(mockGroups[0]);
    });
  });

  it('should navigate to profile when profile button is clicked', async () => {
    renderComponent();

    // First expand the card by clicking it
    const johnDoeCard = screen.getByText('John Doe').closest('div[class*="rounded-2xl"]');
    fireEvent.click(johnDoeCard!);

    await waitFor(() => {
      // Find the Profile button
      const profileButtons = screen.getAllByRole('button', { name: /Profile/i });
      fireEvent.click(profileButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/contacts/contact-1');
    });
  });

  it('should show Final Notice and Abandon buttons for abandoned packages', async () => {
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
            received_date: daysAgo(35), // 35 days ago - abandoned
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

    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={abandonedGroups}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={mockGetDaysSinceAbandoned}
          loading={false}
        />
      </BrowserRouter>
    );

    // First expand the card by clicking it
    const card = screen.getByText('Old Package').closest('div[class*="rounded-2xl"]');
    fireEvent.click(card!);

    await waitFor(() => {
      // Should show Final Notice button
      expect(screen.getByRole('button', { name: /Final Notice/i })).toBeInTheDocument();
      // Should show Abandon button
      expect(screen.getByRole('button', { name: /Abandon/i })).toBeInTheDocument();
    });
  });

  it('should show loading state with mail animation', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={[]}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={mockGetDaysSince}
          loading={true}
        />
      </BrowserRouter>
    );

    // Should show mail animation loading state
    const mailAnimation = screen.getByAltText('Loading mail animation');
    expect(mailAnimation).toBeInTheDocument();
    expect(screen.getByText('Loading follow-ups...')).toBeInTheDocument();
  });

  it('should show empty state when no groups', () => {
    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={[]}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/All Caught Up!/i)).toBeInTheDocument();
    expect(screen.getByText(/No customers need follow-up/i)).toBeInTheDocument();
  });

  it('should render customer information correctly', () => {
    renderComponent();

    // Verify all customer names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Verify mailbox numbers are displayed in the new format
    expect(screen.getByText(/Mailbox Z1/)).toBeInTheDocument();
    expect(screen.getByText(/Mailbox D2/)).toBeInTheDocument();
  });

  it('should display item count tags', () => {
    renderComponent();

    // Cards should show item counts as tags
    const itemTags = screen.getAllByText(/item/i);
    expect(itemTags.length).toBeGreaterThan(0);
  });

  it('should display days tags', () => {
    renderComponent();

    // Cards should show days as tags
    const daysTags = screen.getAllByText(/days/i);
    expect(daysTags.length).toBeGreaterThan(0);
  });

  it('should display waived fees correctly when expanded', async () => {
    const waivedGroups = [
      {
        contact: {
          contact_id: 'contact-4',
          contact_person: 'Fee Test Customer',
          mailbox_number: 'W1',
        },
        packages: [
          {
            mail_item_id: 'mail-4',
            item_type: 'Package',
            status: 'Received',
            received_date: daysAgo(10), // 10 days ago
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
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={mockGetDaysSince}
          loading={false}
        />
      </BrowserRouter>
    );

    // Expand the card by clicking it
    const card = screen.getByText('Fee Test Customer').closest('div[class*="rounded-2xl"]');
    fireEvent.click(card!);

    await waitFor(() => {
      // Check for the waived fee amount (shows as "$10.00" with line-through styling)
      // There are two $10.00 elements - one in the table (waived, with line-through) and one in the footer (total)
      const feeElements = screen.getAllByText('$10.00');
      expect(feeElements.length).toBeGreaterThanOrEqual(1);
      // Find the one with line-through class (the waived fee in the table)
      const waivedFeeElement = feeElements.find(el => el.classList.contains('line-through'));
      expect(waivedFeeElement).toBeInTheDocument();
    });
  });

  it('should show abandoned warning for old items', () => {
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

    render(
      <BrowserRouter>
        <GroupedFollowUpSection
          groups={abandonedGroups}
          onSendEmail={mockOnSendEmail}
          onMarkAbandoned={mockOnMarkAbandoned}
          getDaysSince={mockGetDaysSinceAbandoned}
          loading={false}
        />
      </BrowserRouter>
    );

    // Should show 30+ Days warning tag
    expect(screen.getByText(/30\+ Days/i)).toBeInTheDocument();
    // Should show warning at bottom
    expect(screen.getByText(/requires immediate attention/i)).toBeInTheDocument();
  });

  it('should navigate to fees page when Collect button is clicked', async () => {
    renderComponent();

    // First expand the card by clicking it
    const johnDoeCard = screen.getByText('John Doe').closest('div[class*="rounded-2xl"]');
    fireEvent.click(johnDoeCard!);

    await waitFor(() => {
      // Find the Collect button (for fee collection)
      const collectButton = screen.getByRole('button', { name: /Collect/i });
      fireEvent.click(collectButton);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/fees');
    });
  });

  it('should show expand indicator that rotates when expanded', async () => {
    renderComponent();

    // Find the card for John Doe
    const johnDoeCard = screen.getByText('John Doe').closest('div[class*="rounded-2xl"]');
    
    // Initially should show "Click for details" text
    expect(screen.getAllByText(/Click for details/i).length).toBeGreaterThan(0);
    
    // Click to expand
    fireEvent.click(johnDoeCard!);

    await waitFor(() => {
      // Should show "Click to collapse" text when expanded
      expect(screen.getByText(/Click to collapse/i)).toBeInTheDocument();
    });
  });
});
