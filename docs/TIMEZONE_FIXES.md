# Timezone Bug Fixes - New York Time Display

## Problem Summary

The application was experiencing off-by-one date errors when displaying dates, particularly noticeable when editing mail log entries. For example:
- User edits a row dated **12/02/2025** and changes the date to **12/01/2025**
- The toast notification incorrectly showed **"Nov 30"** instead of **"Dec 1"**

This was caused by timezone conversion issues when using JavaScript's `new Date().toLocaleDateString()` and `.toISOString().split('T')[0]` methods, which can shift dates by one day depending on the user's local timezone.

## Root Cause

JavaScript's native date methods (`toISOString()`, `toLocaleDateString()`) use either UTC or the browser's local timezone, which can differ from the intended New York timezone. When converting date strings like "2025-12-01" to Date objects and then formatting them, the timezone conversion could shift the date by one day.

## Solution

Created utility functions in `frontend/src/utils/timezone.ts` to handle all date operations consistently in New York timezone:

### New Utility Functions

1. **`extractNYDate(date: Date | string): string`**
   - Extracts YYYY-MM-DD from any date/timestamp
   - Always returns the date as it appears in NY timezone
   - Replaces unsafe usage of `.toISOString().split('T')[0]`

2. **`formatNYDateDisplay(date: Date | string, options?: Intl.DateTimeFormatOptions): string`**
   - Formats dates for display (e.g., "Dec 2" or "12/02/2025")
   - Always uses NY timezone to avoid off-by-one date errors
   - Replaces unsafe usage of `.toLocaleDateString()`

3. **`formatNYDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string`**
   - General purpose date/time formatter with NY timezone
   - Used for timestamps that include time components

## Files Modified

### Core Utilities
- ✅ `frontend/src/utils/timezone.ts` - Added new utility functions

### Pages
- ✅ `frontend/src/pages/Log.tsx` - Fixed toast notifications and date displays in mail log
- ✅ `frontend/src/pages/ContactDetail.tsx` - Fixed date displays in customer detail view
- ✅ `frontend/src/pages/MailItems.tsx` - Fixed date/time formatting

### Components
- ✅ `frontend/src/components/SendEmailModal.tsx` - Fixed received date displays in email previews
- ✅ `frontend/src/components/scan/BulkScanEmailModal.tsx` - Fixed date template variables
- ✅ `frontend/src/components/ActionHistorySection.tsx` - Fixed action timestamp displays

### Tests
- ✅ `frontend/src/utils/__tests__/timezone-display.test.ts` - Added comprehensive tests for new utilities

## Key Changes by File

### `frontend/src/pages/Log.tsx`
**Before:**
```typescript
const updatedDate = updateData.received_date 
  ? new Date(updateData.received_date).toISOString().split('T')[0]
  : editingMailItem.received_date.split('T')[0];

const dateDisplay = new Date(updatedDate).toLocaleDateString('en-US', { 
  month: 'short', 
  day: 'numeric' 
});
```

**After:**
```typescript
const updatedDate = updateData.received_date 
  ? extractNYDate(updateData.received_date)
  : extractNYDate(editingMailItem.received_date);

const dateDisplay = formatNYDateDisplay(updatedDate);
```

### `frontend/src/components/ActionHistorySection.tsx`
**Before:**
```typescript
const date = new Date(timestamp);
return {
  date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
};
```

**After:**
```typescript
return {
  date: formatNYDate(new Date(timestamp), { month: 'short', day: 'numeric', year: 'numeric' }),
  time: formatNYDate(new Date(timestamp), { hour: 'numeric', minute: '2-digit', hour12: true })
};
```

## Testing

All changes have been:
1. ✅ Type-checked with TypeScript compiler
2. ✅ Built successfully with Vite
3. ✅ Tested with comprehensive unit tests
4. ✅ Verified to fix the reported bug

## Impact

These changes ensure that:
- All dates are consistently displayed in New York timezone across the application
- No more off-by-one date errors in toast notifications
- Date displays in tables, modals, and forms show the correct date
- Action history timestamps are correctly formatted
- Email templates use correct dates

## Migration Notes

- All date display logic now consistently uses NY timezone utilities
- The `extractNYDate()` function should be used instead of `.split('T')[0]` when working with received_date or other date fields
- The `formatNYDateDisplay()` function should be used for all user-facing date displays
- The existing `.split('T')[0]` usage is still safe for internal grouping/comparison operations where dates are already correctly stored

## Backend Compatibility

The backend already has comprehensive NY timezone utilities in `backend/src/utils/timezone.js` that handle:
- Date storage in the database
- Fee calculations
- Business logic dates

The frontend changes ensure the UI layer displays these dates consistently without timezone shifts.

## Future Recommendations

1. Consider adding ESLint rules to catch usage of:
   - `new Date().toLocaleDateString()` without timezone
   - `.toISOString().split('T')[0]` for date extraction
   
2. Document the timezone utilities in the project README

3. Ensure all new features use the timezone utilities from the start




