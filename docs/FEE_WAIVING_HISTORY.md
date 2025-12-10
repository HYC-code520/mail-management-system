# Fee Waiving History Tracking

## Overview
When a package storage fee is waived, the system now logs this action to the `action_history` table and displays the waived status in the UI.

## Implementation

### Backend Changes

**File**: `backend/src/controllers/fee.controller.js`

When a fee is waived via `POST /api/fees/:feeId/waive`, the system now:
1. Waives the fee in the `package_fees` table
2. Logs the action to `action_history` table with:
   - `action_type`: "Fee Waived"
   - `notes`: "Waived $X.XX storage fee. Reason: [user's reason]"
   - `mail_item_id`: The package the fee was for
   - `contact_id`: The customer
   - `user_id`: Who performed the action
   - `performed_by`: User's email

### Frontend Changes

**File**: `frontend/src/components/dashboard/GroupedFollowUp.tsx`

The "Need Follow-up" section now displays fee status:
- **Free Storage**: `📦 Received Nov 26 (0 days ago) - Free (1 day included)` (green)
- **Pending Fee**: `📦 Received Nov 26 (9 days ago) - Storage fee: $16.00` (orange)
- **Waived Fee**: `📦 Received Nov 26 (9 days ago) - ~~Storage fee: $16.00~~ (fee waived)` (strikethrough with blue)
- **Paid Fee**: `📦 Received Nov 26 (9 days ago) - Storage fee: $16.00 ✓ Paid` (green)

## Where History Appears

### 1. Mail Log Page
- View the action history for each mail item
- Shows "Fee Waived" with the amount and reason

### 2. Contact Detail Page
- View all actions for a customer, including fee waivers
- Helps track customers who frequently need fee waivers

### 3. Dashboard - Need Follow-up Section
- Visual indicator: waived fees show as strikethrough
- Helps staff quickly see which packages no longer have pending fees

## Example Use Cases

### Use Case 1: Customer Goodwill
Customer picked up package late due to medical emergency.
- Staff waives the $20 fee
- Reason: "Medical emergency - customer hospitalized"
- History shows the waiver for future reference

### Use Case 2: Business Customer Dispute
Business customer disputes a $10 fee, claiming they never received notification.
- Manager reviews notification history in action log
- Confirms notification was sent
- Decides to waive fee as one-time courtesy
- Reason: "First-time courtesy waiver"
- History tracks that this customer already received a courtesy waiver

### Use Case 3: System Error
Package was incorrectly logged with wrong date, causing incorrect fee.
- Staff fixes the date
- Waives the incorrect fee
- Reason: "System error - incorrect received date"
- History shows the correction

## Benefits

✅ **Audit Trail**: Every fee waiver is logged with who, when, and why
✅ **Customer Service**: Staff can see past waivers when making decisions
✅ **Transparency**: Clear visual indication of waived fees in dashboard
✅ **Accountability**: User email is logged for each waiver action
✅ **Reporting**: Can analyze waiver patterns and reasons over time

## Testing Checklist

- [x] Waive fee from dashboard "Waive Fees" button
- [x] Check action_history table for "Fee Waived" entry
- [x] Verify mail item action history shows the waiver
- [x] Verify contact detail page shows the waiver
- [x] Confirm dashboard shows "(fee waived)" status
- [x] Test that waived fees are excluded from outstanding fees total
- [x] Verify fee status changes from "pending" to "waived"

## Technical Notes

- Fee status can be: `pending`, `waived`, or `paid`
- Waived fees are NOT counted in `outstandingFees` total
- The strikethrough styling uses Tailwind's `line-through` class
- Action history logging is wrapped in try-catch to prevent failures from blocking the waive operation
- The `performed_by` field captures the user's email for accountability

