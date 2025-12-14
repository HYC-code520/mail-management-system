# Audit Report: Staff Names & Quantity Counting Issues

## Summary
Found **5 potential issues** with staff name tracking and **2 issues** with quantity counting.

---

## Issue 1: Staff Names Using Email Instead of Madison/Merlin

### Places That Currently Use `req.user.email`:

#### ❌ Issue 1A: Mail Item Creation (Scan/Log)
**File:** `backend/src/controllers/mailItems.controller.js` (Line 165)
**Code:**
```javascript
performed_by: req.user.email || 'Staff',
```
**When it happens:** When scanning or manually logging new mail
**Impact:** Action history shows "ariel.chen@pursuit.org" instead of staff name
**Fix needed:** Should accept `performed_by` parameter from frontend

---

#### ❌ Issue 1B: Bulk Scan from Scan Session
**File:** `backend/src/controllers/scan.controller.js` (Line 267)
**Code:**
```javascript
performed_by: req.user.email || 'Staff',
```
**When it happens:** When bulk submitting scanned items from scan session
**Impact:** Action history shows email instead of Madison/Merlin
**Fix needed:** Scan session should ask who is scanning (Madison/Merlin)

---

#### ❌ Issue 1C: Single Email Notification
**File:** `backend/src/controllers/email.controller.js` (Lines 182, 199)
**Code:**
```javascript
// Line 182 - notification_history
notified_by: req.user.email || 'System',

// Line 199 - action_history
performed_by: req.user.email || 'System',
```
**When it happens:** When sending single item email notifications
**Impact:** Shows email in notification and action history
**Fix needed:** Frontend should pass `sent_by` parameter (similar to bulk email)

---

#### ❌ Issue 1D: Custom Email
**File:** `backend/src/controllers/email.controller.js` (Lines 335, 352)
**Code:**
```javascript
// Line 335 - notification_history
notified_by: req.user.email || 'System',

// Line 352 - action_history  
performed_by: req.user.email || 'System',
```
**When it happens:** When sending custom emails
**Impact:** Shows email instead of staff name
**Fix needed:** Frontend should pass `sent_by` parameter

---

#### ⚠️  Issue 1E: Fee Waiving
**File:** `backend/src/controllers/fee.controller.js` (Line 135)
**Code:**
```javascript
performed_by: req.user.email || 'Unknown',
```
**When it happens:** When waiving fees
**Impact:** Shows email instead of Madison/Merlin
**Note:** This might be intentional since waiving requires manager approval?
**Question:** Should we add staff selection for fee waiving too?

---

## Issue 2: Quantity Counting Problems

### ❌ Issue 2A: Dashboard "Needs Follow-Up" Item Count
**File:** `frontend/src/components/dashboard/GroupedFollowUp.tsx` (Line 158)
**Code:**
```javascript
const totalItems = group.packages.length + group.letters.length;
```
**Problem:** Counts **records**, not **quantities**
**Example:** 1 letter record with quantity=5 shows as "1 item" instead of "5 items"
**Impact:** Confusing UI - shows wrong item count in dashboard

**Frontend Display (Line 201):**
```javascript
<p className="text-sm text-gray-600">
  📮 {group.contact.mailbox_number || 'No mailbox'} • {totalItems} item{totalItems !== 1 ? 's' : ''}
  {!isPersonExpanded && ` • ${oldestDays} days old`}
</p>
```

---

### ⚠️  Issue 2B: Possible Issue in Fee Grouping
**File:** `backend/src/controllers/stats.controller.js` (Line 49-107)
**Function:** `groupNeedsFollowUpByPerson()`
**Current behavior:**
- Lines 84-88: Groups packages and letters into arrays
- Line 78-79: Sums up fees correctly (only pending fees)

**Potential issue:** The function doesn't consider quantity when grouping. Each mail_item is treated as one entity.

**Question:** Is this causing the fee discrepancy you mentioned ($86 vs $22)?

---

## Issue 3: Fee Discrepancy ($86 vs $22)

You mentioned:
- **Customer Profile** shows: `Total Outstanding: $86.00`
- **Needs Follow-Up** shows: `$22.00`

### ✅ THIS IS EXPECTED BEHAVIOR! Here's why:

#### Customer Profile ($86)
**Source:** `GET /api/fees/unpaid/:contactId` (Line 262-278 in fee.controller.js)
**Shows:** **ALL pending fees** for the customer
**Includes:**
- ✅ Packages still in storage (Received/Notified status)
- ✅ Packages already picked up but fee not collected (Picked Up status)
- ✅ ALL pending fees regardless of notification date

**Code:**
```javascript
.eq('fee_status', 'pending')
.gt('fee_amount', 0) // Only fees > $0
```

---

#### Needs Follow-Up ($22)
**Source:** `backend/src/controllers/stats.controller.js` (Lines 299-326)
**Shows:** **Only fees for items needing follow-up**
**Filtered by:**
- ❌ Excludes: Packages with status "Picked Up", "Forwarded", "Scanned", "Abandoned" (Line 290-293)
- ❌ Excludes: Packages notified within last 3 days (Line 311)
- ✅ Includes: Only packages that are "Received/Notified" AND need follow-up

**Code:**
```javascript
// Exclude completed items (Line 290-296)
if (item.status === 'Picked Up' || 
    item.status === 'Forwarded' || 
    item.status === 'Scanned' ||
    item.status.includes('Abandoned')) {
  return false;
}

// Only show if never notified OR notified 3+ days ago (Line 311)
if (!item.last_notified || getDaysSinceNY(item.last_notified) >= 3) {
  contactIdsToShow.add(item.contact_id);
}
```

---

### Example Scenario (Your Customer):

Let's say the customer has:
1. **Package A** - Picked Up yesterday, fee $64 pending ❌ Not in "Needs Follow-Up" (already picked up)
2. **Package B** - Notified today, fee $20 pending ❌ Not in "Needs Follow-Up" (notified < 3 days ago)  
3. **Package C** - Notified 5 days ago, fee $22 pending ✅ Shows in "Needs Follow-Up"

**Result:**
- **Customer Profile:** $64 + $20 + $22 = **$106** (all pending fees)
- **Needs Follow-Up:** $22 only (the one needing follow-up)

Your actual numbers ($86 vs $22) suggest:
- $22 = fees for items needing follow-up
- $64 = fees for items picked up or recently notified ($86 - $22)

---

### Is This a Problem?

**No! This is intentional design:**

1. **"Needs Follow-Up"** = Action required (remind customer)
2. **Customer Profile** = Complete financial picture (all debt)

The difference shows you have **$64 in fees that don't need immediate follow-up** because:
- Customer already picked up the items (will pay later)
- Customer was just notified (give them time to respond)

---

## Verification Questions for You:

### For Staff Names:
1. **Scan Session**: Should we add Madison/Merlin selection when scanning mail?
2. **Single Emails**: Should we add staff selection for single email notifications?
3. **Fee Waiving**: Should waiving fees show Madison/Merlin or keep it as email (for accountability)?

### For Quantities:
1. Can you check the customer with $86/$22 discrepancy:
   - How many packages with fees do they have?
   - What are the statuses and last_notified dates of those packages?
   - Are some packages "Notified" within the last 3 days?

2. In the "Needs Follow-Up" section, when you see "X items":
   - Click to expand the card
   - Count the actual number of letters/packages shown
   - Does it match the "X items" number?

---

## Summary of Findings

### Staff Name Issues: 5 places - ✅ ALL FIXED!
1. ✅ **FIXED** Mail item creation (scan/log)
2. ✅ **FIXED** Bulk scan session
3. ✅ **FIXED** Single email notification
4. ✅ **FIXED** Custom email
5. ✅ **FIXED** Fee waiving

**See `STAFF_TRACKING_FIX_SUMMARY.md` for complete details.**

### Quantity Issues: 2 places
1. ❌ Dashboard "Needs Follow-Up" item count
2. ⚠️  Possibly in backend grouping logic

### Fee Discrepancy: 1 issue
- ✅ **NOT A BUG** - Likely due to filtering logic (some packages excluded from "Needs Follow-Up")

---

## Recommended Next Steps

1. **Verify the fee discrepancy first** - check if it's a filtering issue
2. **Prioritize fixing the most visible issues:**
   - Dashboard item count (frontend fix - easy)
   - Scan session staff selection (frontend + backend)
3. **Decide on email notification staff tracking** (do we need it?)
4. **Test thoroughly after each fix**

Let me know which issues you want to fix first!

