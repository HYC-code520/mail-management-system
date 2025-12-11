/**
 * Utility functions for grouping mail items
 * Used in Mail Log and Customer Profile pages
 */

export interface MailItemForGrouping {
  mail_item_id: string;
  contact_id: string;
  item_type: string;
  status: string;
  received_date: string;
  quantity?: number;
  description?: string;
  contacts?: {
    contact_id?: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
  };
}

export interface GroupedMailItem {
  groupKey: string;           // contact_id|date|item_type
  contact: MailItemForGrouping['contacts'];
  contactId: string;
  date: string;               // YYYY-MM-DD
  itemType: string;
  items: MailItemForGrouping[];
  totalQuantity: number;
  statuses: string[];         // Unique statuses
  displayStatus: string;      // "Mixed" if different, otherwise the status
  latestReceivedDate: string; // For sorting
  hasDescription: boolean;
}

/**
 * Groups mail items by contact + day + type
 * 
 * @param items - Array of mail items to group
 * @returns Array of grouped mail items
 */
export function groupMailItems<T extends MailItemForGrouping>(items: T[]): GroupedMailItem[] {
  const groups = new Map<string, GroupedMailItem>();

  for (const item of items) {
    // Extract date (YYYY-MM-DD) from received_date
    const date = item.received_date.split('T')[0];
    const groupKey = `${item.contact_id}|${date}|${item.item_type}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        contact: item.contacts,
        contactId: item.contact_id,
        date,
        itemType: item.item_type,
        items: [],
        totalQuantity: 0,
        statuses: [],
        displayStatus: '',
        latestReceivedDate: item.received_date,
        hasDescription: false,
      });
    }

    const group = groups.get(groupKey)!;
    group.items.push(item);
    group.totalQuantity += item.quantity || 1;
    
    if (!group.statuses.includes(item.status)) {
      group.statuses.push(item.status);
    }
    
    if (item.description) {
      group.hasDescription = true;
    }

    // Track latest received date for sorting
    if (item.received_date > group.latestReceivedDate) {
      group.latestReceivedDate = item.received_date;
    }
  }

  // Calculate display status for each group
  for (const group of groups.values()) {
    if (group.statuses.length === 1) {
      group.displayStatus = group.statuses[0];
    } else {
      // Prioritize certain statuses for display
      const priorityOrder = ['Picked Up', 'Notified', 'Received', 'Forwarded', 'Scanned & Sent', 'Abandoned'];
      const sortedStatuses = group.statuses.sort((a, b) => 
        priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
      );
      group.displayStatus = `Mixed (${sortedStatuses.join(', ')})`;
    }
  }

  return Array.from(groups.values());
}

/**
 * Simplified grouping for Customer Profile page
 * Groups by date + item_type only (single contact)
 */
export interface SimpleGroupedMailItem {
  groupKey: string;           // date_itemType
  itemType: string;
  receivedDate: string;       // YYYY-MM-DD
  totalQuantity: number;
  items: MailItemForGrouping[];
  latestStatus: string;
  latestDescription?: string;
}

export function groupMailItemsSimple<T extends MailItemForGrouping>(items: T[]): SimpleGroupedMailItem[] {
  const grouped = new Map<string, SimpleGroupedMailItem>();

  items.forEach(item => {
    // Format date to YYYY-MM-DD in NY timezone
    const receivedDateDay = new Date(item.received_date).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });

    const groupKey = `${receivedDateDay}_${item.item_type}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupKey,
        itemType: item.item_type,
        receivedDate: receivedDateDay,
        totalQuantity: 0,
        items: [],
        latestStatus: '',
        latestDescription: undefined,
      });
    }

    const group = grouped.get(groupKey)!;
    group.items.push(item);
    group.totalQuantity += item.quantity || 1;

    // Use the most recent item's status and description
    const currentItemTimestamp = new Date(item.received_date).getTime();
    const existingLatestTimestamp = group.items.length > 1 
      ? new Date(group.items[group.items.length - 2].received_date).getTime() 
      : 0;

    if (currentItemTimestamp >= existingLatestTimestamp) {
      group.latestStatus = item.status;
      group.latestDescription = item.description;
    }
  });

  // Sort items within each group by received_date (oldest first)
  grouped.forEach(group => {
    group.items.sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());
  });

  // Return groups sorted by date (most recent first)
  return Array.from(grouped.values()).sort((a, b) => 
    new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
  );
}

