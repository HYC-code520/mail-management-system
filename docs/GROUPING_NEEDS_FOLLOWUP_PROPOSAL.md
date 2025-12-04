# Needs Follow-Up Section: Grouping Proposal

## Current Problem

**Your coach is right!** The current UI shows duplicates:

```
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
```

**Why this is bad:**
- ❌ Looks unprofessional (like a bug)
- ❌ Staff might send 3 separate emails (annoying customer!)
- ❌ Clutters dashboard
- ❌ Waste of time clicking multiple times

## Proposed Solution: Smart Grouping

### Option 1: Group by Customer + Same Day (RECOMMENDED)

**Display:**
```
📦 John Doe - MB-101 - 3 Packages (received Dec 1)  [Send Notification for All]
📮 Jane Smith - MB-202 - 2 Letters + 1 Package (rec. Nov 28)  [Send Reminder]
```

**Benefits:**
- ✅ Clean, professional look
- ✅ One email sent = all items mentioned
- ✅ Customer gets ONE email listing all their mail
- ✅ Staff saves time (1 click instead of 3)

### Option 2: Group ALL Mail by Customer (Simpler, but less precise)

**Display:**
```
📦 John Doe - MB-101 - 5 items pending  [Send Notification]
   └─ 3 packages (Dec 1), 2 letters (Nov 28)
```

**Benefits:**
- ✅ Even simpler
- ✅ Shows full picture of customer's pending mail

**Drawbacks:**
- ⚠️ Might send notifications for items received on different days (less targeted)

## Recommended Implementation

### Smart Grouping Logic:

```typescript
// Group by: contact_id + received_date
interface GroupedMailItem {
  contact_id: string;
  contact_name: string;
  mailbox_number: string;
  received_date: string;
  items: MailItem[]; // All items in this group
  totalCount: number;
  itemTypes: { type: string; count: number }[]; // e.g., [{ type: 'Package', count: 3 }]
  oldestItem: MailItem; // Use for urgency/notification context
  notification_count: number; // Use oldest/most urgent item's count
  last_notified: string | null;
}
```

### Example Grouping:

**Input (from database):**
```javascript
[
  { mail_item_id: '1', contact_id: 'C1', item_type: 'Package', received_date: '2025-12-01', notification_count: 0 },
  { mail_item_id: '2', contact_id: 'C1', item_type: 'Package', received_date: '2025-12-01', notification_count: 0 },
  { mail_item_id: '3', contact_id: 'C1', item_type: 'Letter', received_date: '2025-12-01', notification_count: 0 },
  { mail_item_id: '4', contact_id: 'C1', item_type: 'Package', received_date: '2025-11-28', notification_count: 1 },
  { mail_item_id: '5', contact_id: 'C2', item_type: 'Package', received_date: '2025-12-01', notification_count: 0 },
]
```

**Output (grouped):**
```javascript
[
  {
    groupKey: 'C1-2025-12-01',
    contact_name: 'John Doe',
    mailbox_number: 'MB-101',
    received_date: '2025-12-01',
    items: [item1, item2, item3],
    totalCount: 3,
    itemTypes: [
      { type: 'Package', count: 2 },
      { type: 'Letter', count: 1 }
    ],
    displayText: '2 Packages + 1 Letter',
    notification_count: 0, // None notified yet
    buttonText: 'Send Notification for All'
  },
  {
    groupKey: 'C1-2025-11-28',
    contact_name: 'John Doe',
    mailbox_number: 'MB-101',
    received_date: '2025-11-28',
    items: [item4],
    totalCount: 1,
    itemTypes: [{ type: 'Package', count: 1 }],
    displayText: '1 Package',
    notification_count: 1, // Already notified once
    buttonText: 'Send Reminder'
  },
  {
    groupKey: 'C2-2025-12-01',
    contact_name: 'Jane Smith',
    mailbox_number: 'MB-202',
    received_date: '2025-12-01',
    items: [item5],
    totalCount: 1,
    itemTypes: [{ type: 'Package', count: 1 }],
    displayText: '1 Package',
    notification_count: 0,
    buttonText: 'Send Notification'
  }
]
```

### UI Display:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Needs Follow-Up (3 groups, 5 items total)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🟦 John Doe - MB-101                                        │
│    📦 2 Packages + 1 Letter • Received Dec 1 • 5 days old  │
│    [Send Notification for All 3 Items] [•••]               │
│                                                             │
│ 🟨 John Doe - MB-101                                        │
│    📦 1 Package • Received Nov 28 • 8 days old             │
│    Notified 1 time (5 days ago)                            │
│    [Send Reminder] [•••]                                    │
│                                                             │
│ 🟦 Jane Smith - MB-202                                      │
│    📦 1 Package • Received Dec 1 • 5 days old              │
│    [Send Notification] [•••]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### When Staff Clicks "Send Notification for All 3 Items":

**Email sent to customer:**
```
Subject: You have 3 items ready for pickup

Hi John,

You have the following items waiting at mailbox MB-101:

• 2 Packages (received December 1, 2025)
• 1 Letter (received December 1, 2025)

Please pickup at your earliest convenience.

Thank you!
```

**In database:**
- All 3 mail items marked as "Notified"
- All 3 get `last_notified` timestamp
- All 3 get `notification_count` incremented
- Notification history entry created

## Alternative: Toggle Between Views

Add a toggle to let staff choose:

```
[📋 Show Individual Items] [📦 Group by Customer & Date] ← Selected
```

This way staff can:
- Default: See grouped view (cleaner)
- Toggle: See individual items if they need to take action on specific items

## Implementation Steps

1. **Create grouping function** (`groupMailItemsByCustomerAndDate`)
2. **Update Dashboard UI** to display groups instead of individual items
3. **Update SendEmailModal** to handle multiple mail items
4. **Update email template** to list all items
5. **Update backend** to mark all items in group as notified

## Questions for You:

1. **Should we group by same day only?** Or group ALL pending mail for each customer?
2. **Should staff be able to expand groups?** To see individual items?
3. **How should "Mark as Picked Up" work?** Mark all in group, or select specific ones?

Let me know your preference and I'll implement it! 🚀


