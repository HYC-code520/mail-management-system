# Comprehensive Implementation Plan: Grouped "Needs Follow-Up" Feature

**Date Created**: December 3, 2025  
**Status**: Planned (Not Yet Implemented)  
**Priority**: Medium (Coach feedback - UI looks duplicated)  
**Complexity**: High (Major refactoring required)

---

## 📋 Table of Contents
1. [Problem Statement](#problem-statement)
2. [User Workflow Context](#user-workflow-context)
3. [Proposed Solution](#proposed-solution)
4. [Technical Implementation Plan](#technical-implementation-plan)
5. [UI/UX Design](#uiux-design)
6. [Email Template Changes](#email-template-changes)
7. [Partial Pickup Feature](#partial-pickup-feature)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Phases](#implementation-phases)
10. [Risks & Mitigation](#risks--mitigation)

---

## Problem Statement

### Current Issue
The Dashboard's "Needs Follow-Up" section shows **duplicate-looking entries** when a customer has multiple mail items received on the same day.

**Example of Current Display:**
```
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
📦 John Doe - Package - MB-101 - 5 days old  [Send Notification]
```

### Problems This Causes:
1. ❌ **Looks unprofessional** - Appears like a bug or data duplication
2. ❌ **User confusion** - Staff might send 3 separate emails (annoying customer!)
3. ❌ **Cluttered dashboard** - Hard to see the actual number of customers needing follow-up
4. ❌ **Inefficiency** - Staff wastes time clicking multiple times for same customer
5. ❌ **Coach feedback** - Demo reviewers pointed this out as a UX issue

### Why This Happens:
The current code displays **each mail_item as a separate row**, even when they belong to the same customer and were received on the same day. Staff logs items with quantities:
- Entry 1: `Package, quantity: 3` → Shows as 1 row
- Entry 2: `Letter, quantity: 1` → Shows as another row

But it still looks like duplicates because it's the same customer, same mailbox, same date.

---

## User Workflow Context

### How Mail is Logged:
1. **Morning arrivals**: UPS/FedEx drops off packages in the morning
2. **Staff logs mail**: Around 9-10 AM, staff logs all new mail
3. **Quantity tracking**: 
   - If 3 identical packages for John → Log as `Package, qty: 3`
   - If 2 packages + 1 letter for John → Log as 2 separate entries
4. **Different types = separate entries**: Necessary for billing (packages have fees, letters don't)

### Current System Logic:
- ✅ Uses `quantity` field to avoid creating 100 rows for 100 packages
- ✅ Separates by `item_type` (Package vs Letter) for fee calculation
- ❌ But dashboard shows each entry as a separate line item

### Business Rules:
1. **Packages have storage fees** - Must track quantity accurately
2. **Letters have no fees** - Still need to track for customer notification
3. **Partial pickups are rare but possible** - Customer might pick up 2 of 3 packages
4. **One email per customer** - Don't spam customers with multiple emails for same-day mail

---

## Proposed Solution

### Core Concept: **Group by Customer + Received Date**

**Why this grouping?**
- ✅ Same customer + same day = should be one notification
- ✅ Same customer + different days = separate notifications (different urgency levels)
- ✅ Respects the fact that different days might have different notification states

### Visual Example:

**BEFORE (Current - looks like duplicates):**
```
┌─────────────────────────────────────────────────────┐
│ 🔔 Needs Follow-Up (5 items)                       │
├─────────────────────────────────────────────────────┤
│ 📦 John Doe - MB-101 - Package - 5 days old        │
│    [Send Notification] [•••]                        │
│                                                     │
│ 📦 John Doe - MB-101 - Package - 5 days old        │
│    [Send Notification] [•••]                        │
│                                                     │
│ 📮 John Doe - MB-101 - Letter - 5 days old         │
│    [Send Notification] [•••]                        │
│                                                     │
│ 📦 John Doe - MB-101 - Package - 8 days old        │
│    [Send Reminder] [•••]                            │
│                                                     │
│ 📦 Jane Smith - MB-202 - Package - 5 days old      │
│    [Send Notification] [•••]                        │
└─────────────────────────────────────────────────────┘
```

**AFTER (Proposed - grouped & clean):**
```
┌─────────────────────────────────────────────────────┐
│ 🔔 Needs Follow-Up (2 customers, 5 items)          │
├─────────────────────────────────────────────────────┤
│ 🟦 John Doe - MB-101 • 5 days old                  │
│    📦 2 Packages + 1 Letter (3 items)              │
│    [🔽 View Details] [Send Notification for All]   │
│                                                     │
│ 🟨 John Doe - MB-101 • 8 days old                  │
│    📦 1 Package (1 item) • Notified 1 time         │
│    [🔽 View Details] [Send Reminder] [•••]         │
│                                                     │
│ 🟦 Jane Smith - MB-202 • 5 days old                │
│    📦 1 Package (1 item)                            │
│    [🔽 View Details] [Send Notification] [•••]     │
└─────────────────────────────────────────────────────┘
```

**When "View Details" is clicked (EXPANDED VIEW):**
```
┌─────────────────────────────────────────────────────┐
│ 🟦 John Doe - MB-101 • 5 days old                  │
│    📦 2 Packages + 1 Letter (3 items)              │
│    [🔼 Hide Details] [Send Notification for All]   │
│                                                     │
│    └─ 📦 Package (Qty: 2)                          │
│       Tracking: ABC123, DEF456                     │
│       [Notify] [Mark Picked Up] [Partial Pickup]   │
│                                                     │
│    └─ 📮 Letter (Qty: 1)                           │
│       Desc: USPS Priority                          │
│       [Notify] [Mark Picked Up] [•••]              │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation Plan

### Phase 1: Create Grouping Utility

**File**: `frontend/src/utils/groupMailItems.ts`

#### Key Functions:

##### 1. `groupMailItemsByCustomerAndDate(mailItems: MailItem[]): GroupedMailItem[]`
```typescript
interface GroupedMailItem {
  groupKey: string; // "contactId-receivedDate" (e.g., "C123-2025-12-01")
  contact_id: string;
  contact_name: string;
  company_name?: string;
  mailbox_number: string;
  received_date: string; // YYYY-MM-DD (date only, no time)
  
  // Array of all mail items in this group
  items: MailItem[];
  
  // Aggregated data
  totalCount: number; // Sum of all quantities (e.g., 3 packages + 1 letter = 4)
  itemsSummary: string; // "3 Packages + 1 Letter"
  itemTypes: Array<{ type: string; count: number }>; // [{ type: 'Package', count: 3 }, { type: 'Letter', count: 1 }]
  
  // Notification state (use most urgent item in group)
  oldestNotification: number; // Highest notification_count in group
  lastNotifiedDate: string | null; // Most recent last_notified
  
  // Urgency flags (calculated by Dashboard using timezone utils)
  isAbandoned: boolean; // 30+ days old
  isUrgent: boolean; // Notified but no action taken in 2+ days
  daysSinceReceived: number;
  daysSinceLastNotified: number | null;
}
```

**Grouping Logic:**
1. Create a Map with key = `${contact_id}-${received_date_only}`
2. For each mail item, add to the appropriate group
3. Calculate aggregated data for each group:
   - Sum quantities for `totalCount`
   - Group by `item_type` to create `itemTypes` array
   - Generate `itemsSummary` string (e.g., "3 Packages + 1 Letter")
   - Find highest `notification_count` in group
   - Find most recent `last_notified` date
4. Sort groups by urgency:
   - Abandoned (30+ days) first
   - Urgent (notified but no action) second
   - Oldest received date third

##### 2. `getGroupNotificationContext(group: GroupedMailItem)`
```typescript
// Returns button text, color, and suggested template based on notification state
// Examples:
// - 0 notifications → "Send Notification for 3 Items", blue, "Initial"
// - 1 notification → "Send Reminder for 3 Items", gray, "Reminder"
// - 2+ notifications → "Send Final Notice for 3 Items", dark gray, "Final Notice"
```

##### 3. `getGroupTooltip(group, formatDateForTooltip, getDaysSince)`
```typescript
// Generates tooltip text showing:
// - Received date and days ago
// - List of items (e.g., "3 Packages + 1 Letter")
// - Notification history
// - Suggested action
```

---

### Phase 2: Update Dashboard UI

**File**: `frontend/src/pages/Dashboard.tsx`

#### Changes Required:

##### 1. **Add State Management**
```typescript
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

const toggleGroupExpansion = (groupKey: string) => {
  setExpandedGroups(prev => {
    const newSet = new Set(prev);
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey);
    } else {
      newSet.add(groupKey);
    }
    return newSet;
  });
};
```

##### 2. **Update Imports**
```typescript
import { 
  groupMailItemsByCustomerAndDate, 
  getGroupNotificationContext, 
  getGroupTooltip, 
  GroupedMailItem 
} from '../utils/groupMailItems.ts';
```

##### 3. **Modify Rendering Logic**
In the "Needs Follow-Up" section (around line 630), replace:
```typescript
{stats.needsFollowUp.slice(0, followUpDisplayCount).map((item) => {
  // OLD: Render individual items
})}
```

With:
```typescript
{(() => {
  // Group mail items
  const groupedItems = groupMailItemsByCustomerAndDate(stats.needsFollowUp);
  
  // Calculate urgency for each group
  groupedItems.forEach(group => {
    group.daysSinceReceived = getDaysSince(group.received_date);
    group.isAbandoned = group.daysSinceReceived >= 30;
    
    if (group.lastNotifiedDate) {
      group.daysSinceLastNotified = getDaysSince(group.lastNotifiedDate);
      group.isUrgent = group.daysSinceLastNotified !== null && group.daysSinceLastNotified > 2;
    } else {
      group.isUrgent = false;
    }
  });
  
  const totalItemCount = groupedItems.reduce((sum, g) => sum + g.totalCount, 0);
  
  return (
    <>
      {/* Update header to show customer count */}
      <p className="text-sm text-gray-600">
        {groupedItems.length} customer{groupedItems.length !== 1 ? 's' : ''} 
        ({totalItemCount} item{totalItemCount !== 1 ? 's' : ''})
      </p>
      
      {/* Render groups */}
      {groupedItems.slice(0, followUpDisplayCount).map((group) => {
        const isExpanded = expandedGroups.has(group.groupKey);
        const notificationCtx = getGroupNotificationContext(group);
        const tooltipText = getGroupTooltip(group, formatDateForTooltip, getDaysSince);
        
        return (
          <div key={group.groupKey} className="space-y-2">
            {/* COLLAPSED VIEW */}
            <div className={`p-4 bg-white rounded-lg border-2 ${
              group.isAbandoned ? 'border-red-300' : 
              group.isUrgent ? 'border-gray-400' : 'border-gray-300'
            }`}>
              <div className="flex items-center justify-between">
                {/* Customer info & item summary */}
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    group.isAbandoned ? 'bg-red-600' : 
                    group.isUrgent ? 'bg-gray-900' : 'bg-gray-600'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{group.contact_name}</p>
                    <p className="text-sm text-gray-600">
                      📮 {group.mailbox_number} • {group.itemsSummary} • 
                      {group.daysSinceReceived} days old
                      {group.isAbandoned && <span className="font-semibold text-gray-900"> • ⚠️ ABANDONED</span>}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Expand/Collapse button */}
                  <button
                    onClick={() => toggleGroupExpansion(group.groupKey)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View Details
                      </>
                    )}
                  </button>
                  
                  {/* Send notification button */}
                  <button
                    onClick={() => openSendEmailModalForGroup(group)}
                    className={`px-4 py-2 ${notificationCtx.buttonColor} text-sm rounded-lg transition-colors flex items-center gap-2 relative group-hover`}
                    title={tooltipText}
                  >
                    <Send className="w-4 h-4" />
                    {notificationCtx.buttonText}
                  </button>
                  
                  {/* More actions dropdown */}
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* EXPANDED VIEW - Individual Items */}
            {isExpanded && (
              <div className="ml-8 space-y-2">
                {group.items.map((item) => (
                  <div key={item.mail_item_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.item_type} (Qty: {item.quantity || 1})
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openSendEmailModal(item)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Notify
                        </button>
                        <button
                          onClick={() => {
                            setActionMailItem(item);
                            setActionModalType('picked_up');
                            setIsActionModalOpen(true);
                          }}
                          className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                        >
                          Mark Picked Up
                        </button>
                        {(item.quantity || 1) > 1 && (
                          <button
                            onClick={() => openPartialPickupModal(item)}
                            className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded"
                          >
                            Partial Pickup
                          </button>
                        )}
                        <button className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
})()}
```

##### 4. **Add Helper Function**
```typescript
const openSendEmailModalForGroup = (group: GroupedMailItem) => {
  // For now, use the first item as representative
  // Later, update SendEmailModal to handle multiple items
  if (group.items.length > 0) {
    setEmailingMailItem(group.items[0]);
    // TODO: Pass entire group to modal for multi-item email
    setIsSendEmailModalOpen(true);
  }
};
```

---

### Phase 3: Update SendEmailModal for Multiple Items

**File**: `frontend/src/components/SendEmailModal.tsx`

#### Changes Required:

##### 1. **Update Props Interface**
```typescript
interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItem: MailItem; // Keep for backward compatibility
  mailItems?: MailItem[]; // NEW: Optional array for grouped items
  onSuccess: () => void;
  suggestedTemplateType?: string;
}
```

##### 2. **Detect Multiple Items**
```typescript
export default function SendEmailModal({ 
  isOpen, 
  onClose, 
  mailItem, 
  mailItems, // NEW
  onSuccess, 
  suggestedTemplateType 
}: SendEmailModalProps) {
  // Determine if we're sending to multiple items
  const items = mailItems && mailItems.length > 0 ? mailItems : [mailItem];
  const isMultipleItems = items.length > 1;
  
  // Calculate total quantities
  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  // Group by item type for display
  const itemTypeMap = new Map<string, number>();
  items.forEach(item => {
    const type = item.item_type || 'Mail';
    const qty = item.quantity || 1;
    itemTypeMap.set(type, (itemTypeMap.get(type) || 0) + qty);
  });
```

##### 3. **Update Header Display**
```typescript
<div className="px-6 py-4 border-b border-gray-200">
  <h2 className="text-xl font-bold text-gray-900">Send Email Notification</h2>
  {isMultipleItems ? (
    <p className="text-sm text-gray-600">
      To: {currentEmail} • {totalCount} items
    </p>
  ) : (
    <p className="text-sm text-gray-600">
      To: {currentEmail}
    </p>
  )}
</div>
```

##### 4. **Show Item Summary**
```typescript
{isMultipleItems && (
  <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
    <p className="text-sm font-medium text-blue-900 mb-2">
      Sending notification for {totalCount} items:
    </p>
    <ul className="text-sm text-blue-800 space-y-1">
      {Array.from(itemTypeMap.entries()).map(([type, count]) => (
        <li key={type}>• {count} {type}{count > 1 ? 's' : ''}</li>
      ))}
    </ul>
  </div>
)}
```

##### 5. **Update Email Sending Logic**
```typescript
const handleSend = async () => {
  try {
    setSending(true);
    
    if (isMultipleItems) {
      // Send one email mentioning all items
      // Pass all mail_item_ids to backend
      await api.emails.send({
        contact_id: mailItem.contact_id,
        template_id: selectedTemplateId,
        mail_item_ids: items.map(i => i.mail_item_id), // NEW: Array of IDs
        message_type: messageType
      });
    } else {
      // Original single-item logic
      await api.emails.send({
        contact_id: mailItem.contact_id,
        template_id: selectedTemplateId,
        mail_item_id: mailItem.mail_item_id,
        message_type: messageType
      });
    }
    
    toast.success(`Email sent successfully to ${customerName}!`);
    onSuccess();
    onClose();
  } catch (error) {
    // Error handling...
  }
};
```

---

### Phase 4: Update Backend Email Controller

**File**: `backend/src/controllers/email.controller.js`

#### Changes Required:

##### 1. **Accept Multiple Mail Item IDs**
```javascript
async function sendNotificationEmail(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { 
      contact_id, 
      template_id, 
      mail_item_id,      // Keep for backward compatibility
      mail_item_ids,     // NEW: Array of IDs for grouped sending
      message_type 
    } = req.body;
    
    // Determine if sending to multiple items
    const itemIds = mail_item_ids && mail_item_ids.length > 0 
      ? mail_item_ids 
      : [mail_item_id];
    const isMultiple = itemIds.length > 1;
```

##### 2. **Fetch All Mail Items**
```javascript
    // Fetch all mail items
    const { data: mailItems, error: mailItemsError } = await supabase
      .from('mail_items')
      .select('*, contacts(*)')
      .in('mail_item_id', itemIds);
    
    if (mailItemsError || !mailItems || mailItems.length === 0) {
      return res.status(404).json({ error: 'Mail items not found' });
    }
```

##### 3. **Generate Item List for Email**
```javascript
    // Create item list for email template
    const itemsList = mailItems.map(item => ({
      type: item.item_type,
      quantity: item.quantity || 1,
      description: item.description,
      received_date: item.received_date
    }));
```

##### 4. **Update All Items After Send**
```javascript
    // After successful email send, update all items
    for (const itemId of itemIds) {
      // Update mail item status
      await supabase
        .from('mail_items')
        .update({
          status: 'Notified',
          last_notified: new Date().toISOString()
        })
        .eq('mail_item_id', itemId);
      
      // Add to notification history
      await supabase
        .from('notification_history')
        .insert({
          mail_item_id: itemId,
          contact_id: contact_id,
          notified_by: req.user.email || 'System',
          notification_method: 'Email',
          notified_at: new Date().toISOString(),
          notes: `Email sent: ${template.template_name} (group notification)`
        });
      
      // Add to action history
      await supabase
        .from('action_history')
        .insert({
          mail_item_id: itemId,
          contact_id: contact_id,
          action_type: 'notified',
          action_description: `Email notification sent via ${template.template_name}${isMultiple ? ' (grouped)' : ''}`,
          performed_by: req.user.email || 'System',
          action_timestamp: new Date().toISOString(),
          notes: `Template: ${template.template_name}, Subject: ${template.subject_line}`
        });
    }
```

---

### Phase 5: Update Email Templates

**File**: `backend/src/services/email.service.js` (or template files if using external templates)

#### New Email Template Structure:

```html
Subject: You have {{ITEM_COUNT}} items ready for pickup

Hi {{CUSTOMER_NAME}},

You have the following items waiting at mailbox {{MAILBOX_NUMBER}}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{#PACKAGES}}
📦 PACKAGES ({{PACKAGE_COUNT}} items) - Storage fee applies
   Received: {{RECEIVED_DATE}}
   {{#TRACKING_NUMBERS}}
   Tracking: {{TRACKING_LIST}}
   {{/TRACKING_NUMBERS}}
{{/PACKAGES}}

{{#LETTERS}}
📮 LETTERS ({{LETTER_COUNT}} items) - No fee
   Received: {{RECEIVED_DATE}}
{{/LETTERS}}

{{#OTHER_ITEMS}}
📋 {{ITEM_TYPE}} ({{ITEM_COUNT}} items)
   Received: {{RECEIVED_DATE}}
{{/OTHER_ITEMS}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Items: {{TOTAL_ITEM_COUNT}}
{{#HAS_PACKAGES}}
Package Storage Fee: ${{STORAGE_FEE}} per day ({{PACKAGE_COUNT}} packages)
{{/HAS_PACKAGES}}

⏰ Please pickup at your earliest convenience to avoid additional storage fees.

Hours: Monday-Friday, 9 AM - 6 PM
Location: 123 Main St, Suite 100

Questions? Reply to this email or call (555) 123-4567.

Thank you!
MeiWay Mail Plus LLC
```

#### Template Rendering Function:
```javascript
function renderGroupedEmailTemplate(template, contact, mailItems) {
  // Group items by type
  const itemsByType = {};
  let totalCount = 0;
  let packageCount = 0;
  
  mailItems.forEach(item => {
    const type = item.item_type || 'Mail';
    const qty = item.quantity || 1;
    
    if (!itemsByType[type]) {
      itemsByType[type] = [];
    }
    
    itemsByType[type].push({
      ...item,
      quantity: qty
    });
    
    totalCount += qty;
    if (type === 'Package') {
      packageCount += qty;
    }
  });
  
  // Calculate storage fee (example: $2 per package per day)
  const storageFee = (packageCount * 2).toFixed(2);
  
  // Replace placeholders
  let emailBody = template.message_body;
  emailBody = emailBody.replace(/{{CUSTOMER_NAME}}/g, contact.contact_person || contact.company_name);
  emailBody = emailBody.replace(/{{MAILBOX_NUMBER}}/g, contact.mailbox_number);
  emailBody = emailBody.replace(/{{ITEM_COUNT}}/g, totalCount.toString());
  emailBody = emailBody.replace(/{{TOTAL_ITEM_COUNT}}/g, totalCount.toString());
  emailBody = emailBody.replace(/{{PACKAGE_COUNT}}/g, packageCount.toString());
  emailBody = emailBody.replace(/{{STORAGE_FEE}}/g, storageFee);
  
  // Handle conditional sections
  if (packageCount > 0) {
    emailBody = emailBody.replace(/{{#PACKAGES}}([\s\S]*?){{\/PACKAGES}}/g, '$1');
    emailBody = emailBody.replace(/{{#HAS_PACKAGES}}([\s\S]*?){{\/HAS_PACKAGES}}/g, '$1');
  } else {
    emailBody = emailBody.replace(/{{#PACKAGES}}[\s\S]*?{{\/PACKAGES}}/g, '');
    emailBody = emailBody.replace(/{{#HAS_PACKAGES}}[\s\S]*?{{\/HAS_PACKAGES}}/g, '');
  }
  
  // Repeat for letters and other item types...
  
  return emailBody;
}
```

---

## Partial Pickup Feature

### User Story:
"As staff, I need to record when a customer picks up only some of their items (e.g., 2 out of 3 packages), so the remaining items still show in the system."

### Solution Approach: **Reduce Quantity** (Simpler & Cleaner)

**Why this approach:**
- ✅ No duplicate entries
- ✅ Easy to understand
- ✅ Keeps action history for audit trail
- ✅ Remaining items stay in "Needs Follow-Up"

### Implementation:

#### 1. **Add Partial Pickup Modal**

**File**: `frontend/src/components/PartialPickupModal.tsx`

```typescript
interface PartialPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItem: MailItem;
  onSuccess: () => void;
}

export default function PartialPickupModal({ 
  isOpen, 
  onClose, 
  mailItem, 
  onSuccess 
}: PartialPickupModalProps) {
  const originalQty = mailItem.quantity || 1;
  const [pickedUpQty, setPickedUpQty] = useState(1);
  const remainingQty = originalQty - pickedUpQty;
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pickedUpQty < 1 || pickedUpQty >= originalQty) {
      toast.error('Picked up quantity must be between 1 and ' + (originalQty - 1));
      return;
    }
    
    setSaving(true);
    
    try {
      await api.mailItems.partialPickup(mailItem.mail_item_id, {
        picked_up_quantity: pickedUpQty
      });
      
      toast.success(`Recorded partial pickup: ${pickedUpQty} of ${originalQty} picked up`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Partial pickup error:', error);
      toast.error('Failed to record partial pickup');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Partial Pickup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {mailItem.item_type} - Original Quantity: <strong>{originalQty}</strong>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              How many were picked up?
            </label>
            <input
              type="number"
              min="1"
              max={originalQty - 1}
              value={pickedUpQty}
              onChange={(e) => setPickedUpQty(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Picked Up:</strong> {pickedUpQty}<br />
              <strong>Remaining:</strong> {remainingQty}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Confirm Partial Pickup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

#### 2. **Add Backend Endpoint**

**File**: `backend/src/routes/mailItems.routes.js`
```javascript
router.post('/:id/partial-pickup', authenticateUser, mailItemsController.partialPickup);
```

**File**: `backend/src/controllers/mailItems.controller.js`
```javascript
exports.partialPickup = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    const { picked_up_quantity } = req.body;
    
    // Fetch current mail item
    const { data: mailItem, error: fetchError } = await supabase
      .from('mail_items')
      .select('*')
      .eq('mail_item_id', id)
      .single();
    
    if (fetchError || !mailItem) {
      return res.status(404).json({ error: 'Mail item not found' });
    }
    
    const originalQty = mailItem.quantity || 1;
    const remainingQty = originalQty - picked_up_quantity;
    
    // Validate
    if (picked_up_quantity < 1 || picked_up_quantity >= originalQty) {
      return res.status(400).json({ 
        error: 'Invalid quantity. Must be between 1 and ' + (originalQty - 1) 
      });
    }
    
    // Update quantity
    const { error: updateError } = await supabase
      .from('mail_items')
      .update({ 
        quantity: remainingQty,
        // Keep status as 'Received' since items remain
      })
      .eq('mail_item_id', id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Log action history
    await supabase
      .from('action_history')
      .insert({
        mail_item_id: id,
        contact_id: mailItem.contact_id,
        action_type: 'partial_pickup',
        action_description: `Partial pickup: ${picked_up_quantity} of ${originalQty} picked up`,
        performed_by: req.user.email || 'System',
        action_timestamp: new Date().toISOString(),
        notes: `Remaining quantity: ${remainingQty}`
      });
    
    res.json({
      success: true,
      picked_up: picked_up_quantity,
      remaining: remainingQty,
      message: `Partial pickup recorded successfully`
    });
  } catch (error) {
    next(error);
  }
};
```

#### 3. **Add API Client Method**

**File**: `frontend/src/lib/api-client.ts`
```typescript
mailItems: {
  // ... existing methods
  partialPickup: (id: string, data: { picked_up_quantity: number }) => 
    apiClient.post(`/mail-items/${id}/partial-pickup`, data),
}
```

---

## Testing Strategy

### Unit Tests

#### 1. **Grouping Utility Tests**
**File**: `frontend/src/utils/__tests__/groupMailItems.test.ts`

```typescript
import { groupMailItemsByCustomerAndDate } from '../groupMailItems';

describe('groupMailItemsByCustomerAndDate', () => {
  it('should group items by customer and date', () => {
    const items = [
      { contact_id: 'C1', received_date: '2025-12-01', item_type: 'Package', quantity: 2 },
      { contact_id: 'C1', received_date: '2025-12-01', item_type: 'Letter', quantity: 1 },
      { contact_id: 'C1', received_date: '2025-11-28', item_type: 'Package', quantity: 1 },
      { contact_id: 'C2', received_date: '2025-12-01', item_type: 'Package', quantity: 1 },
    ];
    
    const grouped = groupMailItemsByCustomerAndDate(items);
    
    expect(grouped.length).toBe(3); // 3 groups
    expect(grouped[0].totalCount).toBe(3); // C1, Dec 1: 2 packages + 1 letter
    expect(grouped[0].itemsSummary).toBe('2 Packages + 1 Letter');
  });
  
  it('should calculate correct notification state', () => {
    // Test notification counting logic
  });
  
  it('should sort by urgency correctly', () => {
    // Test abandoned > urgent > oldest
  });
});
```

#### 2. **Backend Partial Pickup Tests**
**File**: `backend/src/__tests__/mailItems.test.js`

```javascript
describe('POST /api/mail-items/:id/partial-pickup', () => {
  it('should reduce quantity for partial pickup', async () => {
    // Setup: Create mail item with qty 3
    // Action: Partial pickup of 2
    // Assert: Quantity should be 1, action_history created
  });
  
  it('should reject invalid quantities', async () => {
    // Test: Cannot pickup 0, negative, or >= original quantity
  });
  
  it('should create action history entry', async () => {
    // Verify action_history contains partial pickup record
  });
});
```

### Integration Tests

#### 3. **Email Sending with Groups**
```javascript
describe('Email sending for grouped items', () => {
  it('should send one email for multiple items', async () => {
    // Test: Pass array of mail_item_ids
    // Assert: One email sent, all items marked as notified
  });
  
  it('should update all items in group', async () => {
    // Verify: All items get status='Notified', last_notified updated
  });
  
  it('should create notification_history for each item', async () => {
    // Verify: One entry per item in group
  });
});
```

### Manual Testing Checklist

- [ ] Groups display correctly on Dashboard
- [ ] Expand/collapse works smoothly
- [ ] Notification buttons show correct text based on history
- [ ] Clicking "Send Notification for All" opens modal
- [ ] Email lists all items with quantities
- [ ] All items in group marked as notified after send
- [ ] Partial pickup reduces quantity correctly
- [ ] Remaining items stay in "Needs Follow-Up"
- [ ] Action history shows partial pickup details
- [ ] Tooltips show correct information
- [ ] Groups sort by urgency (abandoned first)
- [ ] Performance is good with 50+ groups

---

## Implementation Phases

### Phase 1: Foundation (1-2 hours)
**Goal**: Create basic grouping without breaking existing functionality

**Tasks**:
1. ✅ Create `groupMailItems.ts` utility
2. ✅ Write unit tests for grouping logic
3. ✅ Test grouping with sample data
4. ⚠️ **DO NOT** touch Dashboard yet

**Success Criteria**:
- Grouping function works correctly
- All edge cases covered
- Tests pass

---

### Phase 2: Dashboard UI (2-3 hours)
**Goal**: Update Dashboard to use grouped display

**Tasks**:
1. Create a **new Git branch**: `feature/grouped-followup`
2. Add state management for expanded groups
3. Update rendering logic incrementally:
   - First: Just show grouped header (collapsed view only)
   - Test it works
   - Then: Add expand/collapse
   - Test it works
   - Finally: Add action buttons
4. Test thoroughly before moving on

**Success Criteria**:
- Dashboard shows groups instead of individual items
- Expand/collapse works
- No console errors
- App doesn't crash

**⚠️ IMPORTANT**: Test after each small change!

---

### Phase 3: Email Handling (1-2 hours)
**Goal**: Make email sending work with groups

**Tasks**:
1. Update SendEmailModal to accept multiple items
2. Show item summary in modal
3. Update backend to accept array of IDs
4. Update all database operations
5. Update email templates

**Success Criteria**:
- Sending email to group works
- All items get updated
- Email content lists all items

---

### Phase 4: Partial Pickup (1 hour)
**Goal**: Add partial pickup feature

**Tasks**:
1. Create PartialPickupModal component
2. Add backend endpoint
3. Update API client
4. Wire up in Dashboard expanded view

**Success Criteria**:
- Staff can record partial pickups
- Quantity reduces correctly
- Action history logs it

---

### Phase 5: Testing & Polish (1 hour)
**Goal**: Ensure quality and fix bugs

**Tasks**:
1. Run all tests
2. Fix any failing tests
3. Manual testing with real data
4. Performance testing
5. Polish UI/UX

**Success Criteria**:
- All tests pass
- No bugs found in manual testing
- Performance is acceptable

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Probability**: High  
**Impact**: Critical  

**Mitigation**:
- ✅ Work in a separate Git branch
- ✅ Implement in small, testable chunks
- ✅ Test after each change
- ✅ Keep original code as reference
- ✅ Have a rollback plan (git revert)

### Risk 2: Performance Issues with Many Groups
**Probability**: Medium  
**Impact**: Medium  

**Mitigation**:
- ✅ Test with 50+ groups
- ✅ Use React.memo for group components
- ✅ Implement virtualization if needed
- ✅ Monitor render performance

### Risk 3: Complex State Management
**Probability**: Medium  
**Impact**: Medium  

**Mitigation**:
- ✅ Use simple Set for expanded groups
- ✅ Keep grouping logic pure (no side effects)
- ✅ Calculate urgency on render (don't store)
- ✅ Document state flow clearly

### Risk 4: Email Template Complexity
**Probability**: Low  
**Impact**: Medium  

**Mitigation**:
- ✅ Start with simple text template
- ✅ Test with different item combinations
- ✅ Add HTML version later
- ✅ Validate email rendering in multiple clients

---

## Rollback Plan

If implementation fails or causes issues:

1. **Immediate**: `git checkout develop` (discard all changes)
2. **If partially committed**: `git revert <commit-hash>`
3. **Emergency**: Restore from last known good commit
4. **Always have**: The proposal document (this file) to restart later

---

## Questions to Answer Before Starting

Before implementing, answer these questions:

1. **Timing**: When is the best time to implement this? (Not during busy periods)
2. **Testing Data**: Do you have test data with multiple items per customer?
3. **User Training**: Will staff need training on the new grouped view?
4. **Rollout**: Deploy to staging first, or go straight to production?
5. **Monitoring**: How will we monitor for issues after deployment?

---

## Success Metrics

After implementation, measure:

1. **User Satisfaction**:
   - Staff feedback on new grouped view
   - Number of "duplicate" complaints (should be zero)
   
2. **Efficiency**:
   - Time to process "Needs Follow-Up" section
   - Number of clicks to send notifications
   - Should be reduced by ~50%
   
3. **Technical**:
   - Page load time (should not increase)
   - Number of bugs reported (target: 0)
   - Test coverage (target: >80%)

---

## Conclusion

This is a **complex but valuable feature** that will:
- ✅ Improve UX significantly
- ✅ Make staff more efficient
- ✅ Address coach's feedback
- ✅ Look more professional

**Estimated Total Time**: 8-10 hours (including testing)

**Recommendation**: Implement in a **separate sprint/session** when you have dedicated time, not rushed.

---

## Contact & Support

When implementing, if you encounter issues:

1. Refer back to this document
2. Check the original conversation (December 3, 2025)
3. Test in small increments
4. Don't hesitate to rollback if needed

**Remember**: It's better to have a working app than a broken "improved" app. Quality > Speed.

---

**Document Version**: 1.0  
**Last Updated**: December 3, 2025  
**Status**: Ready for Implementation  
**Next Review**: Before starting implementation


