# Duplicate Action History Entry Fix

## Problem
When changing a mail item's status using the ActionModal (e.g., marking as "Forward", "Abandoned", "Picked Up", "Scanned"), **two** action history entries were being created:

1. ✅ **Correct entry** - Created by backend with staff name "Merlin" or "Madison"
2. ❌ **Duplicate entry** - Created by frontend with action_type "status_change" and performer "Staff"

### Example of Duplicate Entries
```
Merlin forwarded the item           ← Correct (from backend)
Picked Up → Forward

Staff status_change                 ← Duplicate (from frontend)
Picked Up → Forward
```

## Root Cause

The `ActionModal` component was creating action history manually **after** the backend had already created it:

1. **Line 78-80**: Calls `api.mailItems.update()` which triggers backend to create action history
2. **Line 83-91**: Manually calls `api.actionHistory.create()` to create a SECOND entry (duplicate)

The backend's `updateMailItemStatus` controller already:
- Detects status changes
- Creates appropriate action history with correct action_type
- Uses the `performed_by` parameter passed from frontend

## Solution

### Frontend Changes (`frontend/src/components/ActionModal.tsx`)

**Before:**
```typescript
// Update the mail item status
await api.mailItems.update(mailItemId, {
  status: config.statusValue
});

// Log the action in action history (DUPLICATE!)
await api.actionHistory.create({
  mail_item_id: mailItemId,
  action_type: 'status_change',
  action_description: config.description,
  previous_value: mailItemDetails.currentStatus,
  new_value: config.statusValue,
  performed_by: performedBy,
  notes: notes.trim() || null
});
```

**After:**
```typescript
// Update the mail item status (backend automatically creates action history)
await api.mailItems.update(mailItemId, {
  status: config.statusValue,
  performed_by: performedBy, // Pass staff name to backend
  action_notes: notes.trim() || null // Pass notes to backend
});

// Note: Backend automatically logs action history, no manual creation needed
```

### Backend Changes (`backend/src/controllers/mailItems.controller.js`)

Added support for `action_notes` parameter:

**Line 183:**
```javascript
const { status, item_type, description, contact_id, received_date, quantity, performed_by, action_notes } = req.body;
```

**Line 333:**
```javascript
await supabase
  .from('action_history')
  .insert({
    mail_item_id: id,
    action_type: actionType,
    action_description: actionDescriptions.join('; '),
    previous_value: previousValue,
    new_value: newValue,
    performed_by: performed_by || 'Staff',
    notes: action_notes || null, // Include notes from ActionModal
    action_timestamp: new Date().toISOString()
  });
```

## Result

Now when a status is changed via ActionModal:
- ✅ **Only ONE** action history entry is created
- ✅ Shows correct staff name ("Merlin" or "Madison")
- ✅ Has correct action_type ("forwarded", "abandoned", "picked_up", "scanned")
- ✅ Includes notes if provided
- ✅ Shows clean display format

### Example After Fix
```
Merlin forwarded the item
Picked Up → Forward
3:38 PM
```

## Files Modified

1. `frontend/src/components/ActionModal.tsx`
   - Removed duplicate action history creation
   - Pass `performed_by` and `action_notes` to backend

2. `backend/src/controllers/mailItems.controller.js`
   - Added `action_notes` parameter support
   - Include notes in action history entry

## Other Modals Checked

✅ **QuickNotifyModal** - No duplicate issue
- Uses `quickNotify` API which doesn't create action history
- Manual action history creation is intentional and correct

✅ **SendEmailModal** - No duplicate issue
- Email sending creates action history in email controller
- No manual duplication

✅ **Log Edit Modal** - No duplicate issue
- Uses `mailItems.update()` which creates action history
- No manual duplication

## Testing

- [ ] Mark mail as "Forward" → Should show 1 entry with staff name
- [ ] Mark mail as "Abandoned" → Should show 1 entry with staff name
- [ ] Mark mail as "Picked Up" → Should show 1 entry with staff name
- [ ] Mark mail as "Scanned" → Should show 1 entry with staff name
- [ ] Add notes when changing status → Notes should appear in action history
- [ ] Verify all entries show correct staff member ("Merlin" or "Madison")




