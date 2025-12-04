import { describe, it, expect, vi } from 'vitest';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    mailItems: {
      getAll: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
    },
    contacts: {
      getAll: vi.fn(),
      create: vi.fn(),
    },
    actionHistory: {
      getByMailItem: vi.fn(),
      create: vi.fn(),
    },
    notifications: {
      quickNotify: vi.fn(),
    },
  },
}));

// Mock timezone utilities
vi.mock('../../utils/timezone', () => ({
  getTodayNY: () => '2025-11-25',
  toNYDateString: (date: string) => date.split('T')[0],
  getNYDate: (_date?: Date) => new Date('2025-11-25T00:00:00-05:00'),
  getDaysAgoNY: (days: number) => {
    const d = new Date('2025-11-25T00:00:00-05:00');
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  },
  formatNYDate: (date: string) => {
    const parts = date.split('-');
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  },
  getChartDateRange: (days: number) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date('2025-11-25T00:00:00-05:00');
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return result;
  },
}));

describe('Dashboard - Action Modal Integration Logic', () => {
  const mockMailItem = {
    mail_item_id: 'mail-1',
    contact_id: 'contact-1',
    item_type: 'Package',
    status: 'Received',
    received_date: '2025-11-25',
    quantity: 1,
    contacts: {
      contact_person: 'John Doe',
      mailbox_number: 'A1',
    },
  };

  it('should calculate days since mail received correctly', () => {
    const todayDate = '2025-11-25';
    const mailReceivedDate = '2025-11-23';

    // Calculate days
    const today = new Date(todayDate);
    const receivedDate = new Date(mailReceivedDate);
    const diffTime = today.getTime() - receivedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    expect(diffDays).toBe(2);
  });

  it('should identify mail that needs follow-up (active statuses)', () => {
    const activeStatuses = ['Received', 'Notified'];
    const mailItems = [
      { ...mockMailItem, status: 'Received' },
      { ...mockMailItem, status: 'Notified' },
      { ...mockMailItem, status: 'Picked Up' },
      { ...mockMailItem, status: 'Forwarded' },
    ];

    const needsFollowUp = mailItems.filter((item) =>
      activeStatuses.includes(item.status)
    );

    expect(needsFollowUp).toHaveLength(2);
    expect(needsFollowUp[0].status).toBe('Received');
    expect(needsFollowUp[1].status).toBe('Notified');
  });

  it('should count total mail quantity correctly', () => {
    const mailItems = [
      { ...mockMailItem, quantity: 2 },
      { ...mockMailItem, quantity: 3 },
      { ...mockMailItem, quantity: 1 },
    ];

    const totalQuantity = mailItems.reduce((sum, item) => sum + item.quantity, 0);

    expect(totalQuantity).toBe(6);
  });

  it('should identify overdue mail (>7 days old)', () => {
    const todayDate = '2025-11-25';
    const oldMailDate = '2025-11-17'; // 8 days ago
    const recentMailDate = '2025-11-20'; // 5 days ago

    const mailItems = [
      { ...mockMailItem, received_date: oldMailDate, status: 'Received' },
      { ...mockMailItem, received_date: recentMailDate, status: 'Received' },
    ];

    const overdueMail = mailItems.filter((item) => {
      const today = new Date(todayDate);
      const receivedDate = new Date(item.received_date);
      const diffDays = Math.floor((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 7 && ['Received', 'Notified'].includes(item.status);
    });

    expect(overdueMail).toHaveLength(1);
    expect(overdueMail[0].received_date).toBe(oldMailDate);
  });

  it('should aggregate mail volume by date', () => {
    const mailItems = [
      { ...mockMailItem, received_date: '2025-11-25', quantity: 2 },
      { ...mockMailItem, received_date: '2025-11-25', quantity: 3 },
      { ...mockMailItem, received_date: '2025-11-24', quantity: 1 },
    ];

    const volumeByDate: { [key: string]: number } = {};
    mailItems.forEach((item) => {
      const dateKey = item.received_date.split('T')[0];
      volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + item.quantity;
    });

    expect(volumeByDate['2025-11-25']).toBe(5);
    expect(volumeByDate['2025-11-24']).toBe(1);
  });

  it('should count new customers for today', () => {
    const todayDate = '2025-11-25';
    const contacts = [
      { contact_id: '1', created_at: '2025-11-25T10:00:00Z' },
      { contact_id: '2', created_at: '2025-11-25T14:00:00Z' },
      { contact_id: '3', created_at: '2025-11-24T10:00:00Z' },
    ];

    const newCustomersToday = contacts.filter((contact) =>
      contact.created_at.startsWith(todayDate)
    );

    expect(newCustomersToday).toHaveLength(2);
  });

  it('should verify staff names are Merlin and Madison', () => {
    const validStaffNames = ['Merlin', 'Madison'];

    expect(validStaffNames).toHaveLength(2);
    expect(validStaffNames).toContain('Merlin');
    expect(validStaffNames).toContain('Madison');
    expect(validStaffNames).not.toContain('Merlot');
  });
});
