# Intake Form - Active Customers Only

## Problem
The intake form's "Link to Customer" search field was showing all customers, including archived ones (status: 'No'). This could lead to:
- Confusion when seeing inactive customers
- Accidentally logging mail for archived customers
- Cluttered search results

## Solution
Updated the customer search to **only show active customers** by default.

## Changes Made

### File: `frontend/src/pages/Intake.tsx`

1. **Updated Contact Interface**
   - Added `status?: string;` field to the Contact interface

2. **Updated searchContacts Function**
   - Added filter to exclude customers with `status === 'No'` (archived)
   - Only active customers appear in the search dropdown
   - Search still matches: name, company, mailbox number, unit number

## UX Improvements

### Before
```
Search: "john"
Results:
- John Doe (Active)
- John Smith (Archived) ❌ Shouldn't show
- John Lee (Active)
```

### After
```
Search: "john"
Results:
- John Doe (Active) ✅
- John Lee (Active) ✅
(Archived customers are filtered out)
```

## Benefits

1. **Cleaner Search Results**: Only relevant, active customers are shown
2. **Prevents Errors**: Can't accidentally log mail for archived customers
3. **Faster Selection**: Fewer results to scroll through
4. **Better UX**: Matches user expectations for daily operations

## Alternative Approach (Not Implemented)

If you ever need to log mail for an archived customer, you could:
- Restore the customer first (from the Contacts page)
- Then log the mail
- Archive them again if needed

Or we could add an optional "Include archived" checkbox if this becomes a common need.

## Testing

1. Go to the Contacts page and archive a customer
2. Go to the Intake page
3. Search for the archived customer's name
4. Verify they don't appear in the results
5. Search for an active customer
6. Verify they do appear in the results

## Related Files
- `frontend/src/pages/Intake.tsx` - Customer search logic
- `frontend/src/pages/Contacts.tsx` - Where customers are archived/restored

