import { groupMailItems, groupMailItemsSimple, MailItemForGrouping } from '../mailItemGrouping';

describe('groupMailItems', () => {
  const createMailItem = (overrides: Partial<MailItemForGrouping> = {}): MailItemForGrouping => ({
    mail_item_id: 'mail-1',
    contact_id: 'contact-1',
    item_type: 'Letter',
    status: 'Received',
    received_date: '2024-12-11T10:00:00Z',
    quantity: 1,
    contacts: {
      contact_id: 'contact-1',
      contact_person: 'John Doe',
      company_name: 'ACME Corp',
      mailbox_number: '101',
    },
    ...overrides,
  });

  describe('basic grouping', () => {
    it('should group items by contact, date, and type', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-11T10:00:00Z' }),
        createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-11T14:00:00Z' }),
        createMailItem({ mail_item_id: 'mail-3', received_date: '2024-12-11T16:00:00Z' }),
      ];

      const result = groupMailItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].groupKey).toBe('contact-1|2024-12-11|Letter');
      expect(result[0].items).toHaveLength(3);
      expect(result[0].totalQuantity).toBe(3);
    });

    it('should create separate groups for different dates', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-11T10:00:00Z' }),
        createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-12T10:00:00Z' }),
      ];

      const result = groupMailItems(items);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-12-11');
      expect(result[1].date).toBe('2024-12-12');
    });

    it('should create separate groups for different item types', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', item_type: 'Letter' }),
        createMailItem({ mail_item_id: 'mail-2', item_type: 'Package' }),
      ];

      const result = groupMailItems(items);

      expect(result).toHaveLength(2);
      expect(result.find(g => g.itemType === 'Letter')).toBeDefined();
      expect(result.find(g => g.itemType === 'Package')).toBeDefined();
    });

    it('should create separate groups for different contacts', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', contact_id: 'contact-1' }),
        createMailItem({ mail_item_id: 'mail-2', contact_id: 'contact-2' }),
      ];

      const result = groupMailItems(items);

      expect(result).toHaveLength(2);
      expect(result.find(g => g.contactId === 'contact-1')).toBeDefined();
      expect(result.find(g => g.contactId === 'contact-2')).toBeDefined();
    });
  });

  describe('quantity calculation', () => {
    it('should sum quantities across items in a group', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', quantity: 3 }),
        createMailItem({ mail_item_id: 'mail-2', quantity: 5 }),
        createMailItem({ mail_item_id: 'mail-3', quantity: 2 }),
      ];

      const result = groupMailItems(items);

      expect(result[0].totalQuantity).toBe(10);
    });

    it('should treat undefined quantity as 1', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', quantity: undefined }),
        createMailItem({ mail_item_id: 'mail-2', quantity: undefined }),
      ];

      const result = groupMailItems(items);

      expect(result[0].totalQuantity).toBe(2);
    });
  });

  describe('status handling', () => {
    it('should show single status when all items have same status', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', status: 'Received' }),
        createMailItem({ mail_item_id: 'mail-2', status: 'Received' }),
      ];

      const result = groupMailItems(items);

      expect(result[0].displayStatus).toBe('Received');
      expect(result[0].statuses).toEqual(['Received']);
    });

    it('should show Mixed status when items have different statuses', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', status: 'Received' }),
        createMailItem({ mail_item_id: 'mail-2', status: 'Notified' }),
      ];

      const result = groupMailItems(items);

      expect(result[0].displayStatus).toContain('Mixed');
      expect(result[0].statuses).toContain('Received');
      expect(result[0].statuses).toContain('Notified');
    });
  });

  describe('description tracking', () => {
    it('should set hasDescription to true when any item has description', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', description: undefined }),
        createMailItem({ mail_item_id: 'mail-2', description: 'Important package' }),
      ];

      const result = groupMailItems(items);

      expect(result[0].hasDescription).toBe(true);
    });

    it('should set hasDescription to false when no items have description', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', description: undefined }),
        createMailItem({ mail_item_id: 'mail-2', description: undefined }),
      ];

      const result = groupMailItems(items);

      expect(result[0].hasDescription).toBe(false);
    });
  });

  describe('latest received date tracking', () => {
    it('should track the latest received date in a group', () => {
      const items = [
        createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-11T10:00:00Z' }),
        createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-11T16:00:00Z' }),
        createMailItem({ mail_item_id: 'mail-3', received_date: '2024-12-11T12:00:00Z' }),
      ];

      const result = groupMailItems(items);

      expect(result[0].latestReceivedDate).toBe('2024-12-11T16:00:00Z');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty input', () => {
      const result = groupMailItems([]);

      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const items = [createMailItem()];

      const result = groupMailItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(1);
    });
  });
});

describe('groupMailItemsSimple', () => {
  const createMailItem = (overrides: Partial<MailItemForGrouping> = {}): MailItemForGrouping => ({
    mail_item_id: 'mail-1',
    contact_id: 'contact-1',
    item_type: 'Letter',
    status: 'Received',
    received_date: '2024-12-11T15:00:00Z', // 10 AM EST
    quantity: 1,
    ...overrides,
  });

  it('should group items by date and type (ignoring contact)', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-1' }),
      createMailItem({ mail_item_id: 'mail-2' }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
  });

  it('should separate groups by item type', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-1', item_type: 'Letter' }),
      createMailItem({ mail_item_id: 'mail-2', item_type: 'Package' }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result).toHaveLength(2);
  });

  it('should sort groups by date descending (most recent first)', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-10T15:00:00Z' }),
      createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-12T15:00:00Z' }),
      createMailItem({ mail_item_id: 'mail-3', received_date: '2024-12-11T15:00:00Z' }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result).toHaveLength(3);
    expect(result[0].receivedDate).toBe('2024-12-12');
    expect(result[1].receivedDate).toBe('2024-12-11');
    expect(result[2].receivedDate).toBe('2024-12-10');
  });

  it('should sort items within group by received_date ascending', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-3', received_date: '2024-12-11T20:00:00Z' }),
      createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-11T10:00:00Z' }),
      createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-11T15:00:00Z' }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result[0].items[0].mail_item_id).toBe('mail-1');
    expect(result[0].items[1].mail_item_id).toBe('mail-2');
    expect(result[0].items[2].mail_item_id).toBe('mail-3');
  });

  it('should calculate total quantity correctly', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-1', quantity: 2 }),
      createMailItem({ mail_item_id: 'mail-2', quantity: 3 }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result[0].totalQuantity).toBe(5);
  });

  it('should use latest item status', () => {
    const items = [
      createMailItem({ mail_item_id: 'mail-1', received_date: '2024-12-11T10:00:00Z', status: 'Received' }),
      createMailItem({ mail_item_id: 'mail-2', received_date: '2024-12-11T16:00:00Z', status: 'Picked Up' }),
    ];

    const result = groupMailItemsSimple(items);

    expect(result[0].latestStatus).toBe('Picked Up');
  });
});

