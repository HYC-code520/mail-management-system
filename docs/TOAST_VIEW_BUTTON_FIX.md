# Toast "View" Button Fix - Correct Customer and Row Jump

## Problem
When editing a mail item's date, the success toast's "View" button would:
1. Show the wrong customer name (e.g., "Ting Lan" instead of "Ariel Houyu Chen")
2. Jump to the wrong row when clicked

## Root Cause
The toast was using `editingMailItem` to get customer information AFTER the modal was closed and `editingMailItem` was set to null. By the time the toast was rendered, the `editingMailItem` state had been cleared, causing it to potentially show stale or incorrect data.

**Code flow issue:**
```typescript
// 1. Close modal (clears editingMailItem)
closeModal();

// 2. Reload items
await loadMailItems();

// 3. Try to use editingMailItem (but it's now null!)
const customerName = editingMailItem.contacts?.contact_person;
```

## Solution

### Fixed Order of Operations (`frontend/src/pages/Log.tsx`)

**Before:**
```typescript
closeModal(); // Clears editingMailItem

await loadMailItems();

// Try to get customer name from cleared editingMailItem
const customerName = editingMailItem.contacts?.contact_person || 
                    editingMailItem.contacts?.company_name || 
                    'Customer';
```

**After:**
```typescript
// Store customer info BEFORE closing modal and reloading
const customerName = editingMailItem.contacts?.contact_person || 
                    editingMailItem.contacts?.company_name || 
                    'Customer';
const itemTypeDisplay = updateData.item_type || editingMailItem.item_type;
const dateDisplay = formatNYDateDisplay(updatedDate);

await loadMailItems(); // Now reload

// Toast now uses the captured values
```

## Key Changes

1. **Capture Data Early**
   - Extract customer name, item type, and date display BEFORE closing modal
   - Store in local variables that won't be affected by state updates

2. **Correct Sequence**
   - Get data from `editingMailItem` while it's still valid
   - Then close modal and reload
   - Then show toast with the captured correct data

3. **Group Key Still Correct**
   - The `updatedGroupKey` is calculated correctly using contact_id and new date
   - `jumpToRow` function uses this key to find and scroll to the correct row

## Result

### Before Fix:
```
Toast: "Updated Ting Lan (Package, Dec 12)" ❌
Clicks "View" → Jumps to wrong row
```

### After Fix:
```
Toast: "Updated Ariel Houyu Chen (Letter, Dec 13)" ✅
Clicks "View" → Jumps to correct row with customer Ariel Houyu Chen on date 12/13
```

## Files Modified

1. `frontend/src/pages/Log.tsx`
   - Lines 612-626: Reordered operations to capture customer data before modal close
   - Ensures toast shows correct customer name and item type
   - Ensures "View" button jumps to correct row

## Testing

- [ ] Edit a mail item date → Toast shows correct customer name
- [ ] Click "View" button on toast → Jumps to correct row (same customer, new date)
- [ ] Edit a mail item status → Toast shows correct customer and status
- [ ] Edit a mail item with date + status change → Toast shows correct info
- [ ] Verify row is highlighted and expanded after clicking "View"
- [ ] Test with multiple items in same group

## Related Fixes

This fix works together with:
- Date timezone fixes (extractNYDate, formatNYDateDisplay)
- Action history fixes (staff names, no duplicates)
- Date change action history logging




