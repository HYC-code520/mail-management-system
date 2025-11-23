# Phone Number Formatting & Validation

## Overview
Added automatic phone number formatting and validation to ensure consistent data entry across all customer forms.

## Format
**Standard Format:** `XXX-XXX-XXXX` (e.g., `917-822-5751`)

## Features

### 1. Auto-Formatting
- **Real-time formatting** as user types
- Automatically adds dashes in the correct positions
- Example: User types "9178225751" → Displays as "917-822-5751"

### 2. Digit Limit
- **Maximum 10 digits** (standard US phone number)
- Extra digits are automatically prevented
- `maxLength={12}` on input (10 digits + 2 dashes)

### 3. Clean Input
- Automatically strips non-digit characters (except formatting dashes)
- User can paste messy input like "(917) 822-5751" and it will be cleaned/reformatted

## Implementation

### Logic Flow
```javascript
formatPhoneNumber(value: string) {
  1. Remove all non-digits: "(917) 822-5751" → "9178225751"
  2. Limit to 10 digits: "91782257519999" → "9178225751"
  3. Format with dashes:
     - 3 digits or less: "917" → "917"
     - 4-6 digits: "917822" → "917-822"
     - 7-10 digits: "9178225751" → "917-822-5751"
}
```

### Files Modified
1. **`frontend/src/pages/NewContact.tsx`**
   - Added `formatPhoneNumber` function
   - Updated `handleChange` to apply formatting for phone field
   - Updated placeholder: `917-822-5751`
   - Added `maxLength={12}` to phone input

2. **`frontend/src/pages/Contacts.tsx`** (Edit Modal)
   - Added `formatPhoneNumber` function
   - Updated `handleChange` to apply formatting for `phone_number` field
   - Updated placeholder: `917-822-5751`
   - Added `maxLength={12}` to phone input

## User Experience

### Before
- No formatting, any input accepted
- Inconsistent formats: "(917) 822-5751", "917.822.5751", "9178225751"
- Could enter 20+ digits

### After
- ✅ Automatic formatting as user types
- ✅ Consistent format: `917-822-5751`
- ✅ Limited to 10 digits
- ✅ Clean, professional data entry

## Example Usage

**Scenario 1: Typing**
```
User types:  9 → 91 → 917 → 917-8 → 917-82 → 917-822 → 917-822-5 → ... → 917-822-5751
Display:     9 → 91 → 917 → 917-8 → 917-82 → 917-822 → 917-822-5 → ... → 917-822-5751
```

**Scenario 2: Pasting**
```
User pastes: (917) 822-5751
System:      Strips to "9178225751"
Display:     917-822-5751
```

**Scenario 3: Too Many Digits**
```
User tries:  91782257519999
System:      Takes first 10 digits: "9178225751"
Display:     917-822-5751
```

## Testing Checklist
- [ ] Type phone number digit by digit - see formatting in real-time
- [ ] Paste phone with different formats - see it auto-format
- [ ] Try entering 15 digits - verify only 10 are accepted
- [ ] Edit existing contact with phone - see current number formatted
- [ ] Save and verify phone is stored correctly in database

## Date
November 23, 2025

