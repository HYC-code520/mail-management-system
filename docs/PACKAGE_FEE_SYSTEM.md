# Package Storage Fee Tracking System

## Overview

The Package Storage Fee Tracking System automatically calculates and tracks storage fees for packages held beyond the free grace period. This system helps Mei Way Mail Plus manage Tier 2 customer package storage fees transparently and efficiently.

---

## Business Rules

### Pricing & Tiers
- **Tier 2 Customers**: $15/month includes **1-day FREE storage**
- **Storage Fees**: **$2 per day per package** (starting Day 2)
- **Grace Period**: Day 0 (received) and Day 1 are FREE
- **Extra-Large Packages**: $5 flat fee (tracked manually, not in system)

### Example Fee Calculation
```
Package received: Dec 1, 2025
- Dec 1 (Day 0): $0 (free - arrival day)
- Dec 2 (Day 1): $0 (free - 1 day included storage)
- Dec 3 (Day 2): $2 (1 billable day × $2/day)
- Dec 4 (Day 3): $4 (2 billable days × $2/day)
- Dec 5 (Day 4): $6 (3 billable days × $2/day)
```

### Abandonment
- Packages held for **30+ days** are considered abandoned
- System flags these as high priority for follow-up

### Payment
- **Full payment at pickup only** (no partial payments)
- Payment methods: Cash, Card, Venmo, Zelle, Check, Other

### Fee Waiving
- Fees can be waived (forgiven) by staff
- **Reason required** for audit trail
- Common reasons:
  - Goodwill gesture for loyal customers
  - System error
  - Customer complaint resolution
  - First-time courtesy

---

## System Architecture

### Database

#### `package_fees` Table
```sql
CREATE TABLE package_fees (
  fee_id UUID PRIMARY KEY,
  mail_item_id UUID REFERENCES mail_items(mail_item_id),
  contact_id UUID REFERENCES contacts(contact_id),
  user_id UUID REFERENCES users(id),
  
  -- Fee calculation
  fee_amount DECIMAL(10,2) DEFAULT 0.00,
  days_charged INTEGER DEFAULT 0,
  daily_rate DECIMAL(10,2) DEFAULT 2.00,
  grace_period_days INTEGER DEFAULT 1,
  
  -- Status tracking
  fee_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'waived'
  
  -- Payment info
  paid_date TIMESTAMPTZ,
  payment_method TEXT,
  
  -- Waiving info
  waived_date TIMESTAMPTZ,
  waived_by UUID REFERENCES users(id),
  waive_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_package_fees_mail_item` on `mail_item_id`
- `idx_package_fees_contact` on `contact_id`
- `idx_package_fees_status` on `fee_status`
- `idx_package_fees_user` on `user_id`
- `idx_package_fees_user_pending` on `user_id, fee_status` (partial index for pending fees)

---

### Backend Services

#### Fee Service (`backend/src/services/fee.service.js`)

**Core Functions:**
- `calculateFeeForPackage(mailItem, asOfDate)` - Calculate fee based on days since received
- `createFeeRecord(mailItemId, contactId, userId)` - Create initial $0 fee record
- `updateFeesForAllPackages(userId)` - Daily cron job updates all fees
- `waiveFee(feeId, reason, waivedByUserId)` - Mark fee as waived
- `markFeePaid(feeId, paymentMethod)` - Mark fee as paid
- `getOutstandingFees(userId)` - Get all pending fees
- `getRevenueStats(userId, startDate, endDate)` - Revenue analytics

**Fee Calculation Logic:**
```javascript
const daysSinceReceived = getDaysBetweenNY(receivedDate, asOfDate);
const billableDays = Math.max(0, daysSinceReceived - gracePeriodDays);
const feeAmount = billableDays * dailyRate;
```

**Timezone Handling:**
- Uses NY timezone utilities (`getDaysBetweenNY`, `toNYDateString`)
- Ensures accurate day calculations even during DST transitions
- Critical for fee accuracy (midnight rollover in NY time)

#### Mail Items Controller (`backend/src/controllers/mailItems.controller.js`)

**Auto-Create Fee on Package Log:**
```javascript
// When creating a package
if (mailItem.item_type === 'Package') {
  await feeService.createFeeRecord(
    mailItem.mail_item_id,
    mailItem.contact_id,
    req.user.id
  );
}
```

#### Stats Controller (`backend/src/controllers/stats.controller.js`)

**Enhanced Dashboard Stats:**
- Groups "Need Follow-up" items by person (not individual items)
- Enriches each group with package fee data
- Calculates urgency scores:
  - **Packages with fees**: Highest priority (1000+ points)
  - **Abandoned items (30+ days)**: 500 points
  - **Overdue items (7+ days)**: 100 points
  - **Age**: +1 point per day

**Urgency Sorting:**
```javascript
function calculateUrgencyScore(group) {
  let score = 0;
  if (group.totalFees > 0) {
    score += 1000 + group.totalFees; // Fees = most urgent
  }
  const maxDays = Math.max(...items.map(i => getDaysSinceNY(i.received_date)));
  if (maxDays >= 30) score += 500; // Abandoned
  else if (maxDays >= 7) score += 100; // Overdue
  score += maxDays; // Age factor
  return score;
}
```

---

### API Endpoints

#### Fee Endpoints (`/api/fees`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/fees` | Get all fees for user |
| `GET` | `/api/fees/outstanding` | Get unpaid fees only |
| `GET` | `/api/fees/revenue` | Get revenue stats (optional `?startDate&endDate`) |
| `POST` | `/api/fees/:feeId/waive` | Waive a fee (body: `{reason}`) |
| `POST` | `/api/fees/:feeId/pay` | Mark fee as paid (body: `{paymentMethod}`) |
| `POST` | `/api/fees/recalculate` | Manually trigger fee recalculation |
| `POST` | `/api/fees/cron/update` | **Cron job endpoint** (requires `x-cron-secret` header) |

**Example: Waive Fee**
```bash
curl -X POST http://localhost:5000/api/fees/abc-123/waive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Goodwill gesture for loyal customer"}'
```

**Example: Mark Fee as Paid**
```bash
curl -X POST http://localhost:5000/api/fees/abc-123/pay \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "cash"}'
```

---

### Daily Cron Job

#### Setup (`backend/src/jobs/updatePackageFees.js`)

**Purpose:** Automatically update all pending package fees daily at 2 AM EST.

**Trigger Options:**

1. **Render Cron Jobs** (Recommended):
   ```
   URL: https://your-backend.onrender.com/api/fees/cron/update
   Method: POST
   Schedule: Daily at 2:00 AM EST
   Headers: x-cron-secret: YOUR_SECRET_KEY
   ```

2. **Manual Trigger**:
   ```bash
   node backend/src/jobs/updatePackageFees.js
   ```

3. **API Call** (for admin/testing):
   ```bash
   curl -X POST http://localhost:5000/api/fees/recalculate \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Environment Variable Required:**
```bash
CRON_SECRET=your_secret_key_here
```

---

### Frontend Components

#### Dashboard Revenue Widget

**Location:** `frontend/src/pages/Dashboard.tsx`

**Displays:**
- **This Month**: Revenue collected this month
- **Outstanding**: Total pending fees (owed but not paid)
- **Total (All Time)**: Total revenue ever collected

**Example UI:**
```
💰 Package Storage Revenue
┌─────────────────────────────────────┐
│  This Month    Outstanding   Total  │
│    $48.00        $124.00     $582.00│
└─────────────────────────────────────┘
```

#### Grouped Follow-up Section

**Key Features:**
- Groups mail items by **person** (not individual items)
- Shows packages and letters together for each customer
- Displays total fees owed per customer
- Sorts by urgency (fees > abandonment > age)

**Visual Indicators:**
- 🔴 **Red border**: Abandoned (30+ days)
- 🟠 **Orange border**: Has pending fees
- ⚫ **Gray border**: Regular follow-up

**Example Group Card:**
```
┌─────────────────────────────────────────┐
│ 🟠 Ariel Chen  │  📮 #123  │  💰 $8.00 │
│ ─────────────────────────────────────── │
│ 📦 Packages (2):                        │
│    • Day 5 ($8.00) ×1                   │
│    • Day 1 ($0.00 - grace) ×1           │
│ ✉️ Letters (3): Oldest: 4 days          │
│ 📧 Last notified: 5 days ago            │
│ ─────────────────────────────────────── │
│ [ ⚠️ Package Fee Reminder ] [ Waive... ]│
└─────────────────────────────────────────┘
```

#### Waive Fee Modal

**Component:** `frontend/src/components/WaiveFeeModal.tsx`

**Features:**
- Shows customer info and mailbox number
- Lists all packages with pending fees
- Displays total fees to waive
- **Requires reason** (minimum 5 characters)
- Waives all pending fees for that customer at once
- Confirmation toast with amount waived

**Reason Examples:**
- "Goodwill gesture for loyal customer"
- "System error - package was already picked up"
- "Customer complaint resolution"
- "First-time courtesy waiver"

---

## Deployment Checklist

### 1. Database Migration
```bash
# Run migration on production Supabase
psql $DATABASE_URL < supabase/migrations/20251209210403_add_package_fees.sql
```

### 2. Environment Variables
Add to Render:
```bash
CRON_SECRET=your_generated_secret_key_here
```

Generate secret:
```bash
openssl rand -hex 32
```

### 3. Set Up Render Cron Job
1. Go to Render Dashboard → Cron Jobs → Add Cron Job
2. **Name**: Update Package Fees
3. **Command**: `curl -X POST https://your-backend.onrender.com/api/fees/cron/update -H "x-cron-secret: YOUR_SECRET"`
4. **Schedule**: `0 2 * * *` (Daily at 2 AM EST)
5. Save and test

### 4. Deploy Backend
```bash
git add .
git commit -m "feat: add package fee tracking system"
git push origin main
```

### 5. Deploy Frontend
```bash
cd frontend
npm run build
# Vercel will auto-deploy
```

### 6. Verify Deployment
- ✅ Log a test package
- ✅ Check that fee record is created ($0 on Day 0)
- ✅ Manually trigger fee update via API
- ✅ Verify fee increases to $2 after grace period
- ✅ Test waiving a fee
- ✅ Test marking a fee as paid
- ✅ Check revenue analytics widget
- ✅ Verify cron job runs at 2 AM

---

## Testing

### Manual Testing Checklist

**Backend:**
- [ ] Create package → Fee record created with $0
- [ ] Update fees manually → Fees calculate correctly
- [ ] Waive fee → Status changes to 'waived' with reason
- [ ] Mark fee as paid → Status changes to 'paid' with payment method
- [ ] Get outstanding fees → Returns only pending fees
- [ ] Get revenue stats → Returns correct totals

**Frontend:**
- [ ] Dashboard loads with revenue widget
- [ ] Revenue widget shows correct amounts
- [ ] Need Follow-up section groups by person
- [ ] Packages with fees show orange border
- [ ] Waive fee modal opens and works
- [ ] Waiving fee updates dashboard
- [ ] Marking package as picked up removes from follow-up

**Integration:**
- [ ] Log package → Fee created → Fee updates daily → Mark paid → Revenue updates

---

## Troubleshooting

### Fees Not Calculating
**Symptom:** Fees remain at $0 even after multiple days.

**Causes:**
1. Cron job not running
2. Package status is "Picked Up" (fees stop calculating)
3. Timezone issue (days calculated in wrong timezone)

**Solutions:**
1. Check Render Cron Job logs
2. Manually trigger: `POST /api/fees/recalculate`
3. Verify `backend/src/utils/timezone.js` is being used

### Cron Job Failing
**Symptom:** Cron job returns 401 Unauthorized.

**Causes:**
1. Missing or incorrect `CRON_SECRET`
2. Header not set correctly

**Solutions:**
1. Verify `CRON_SECRET` env var on Render
2. Check Render Cron Job header: `x-cron-secret: YOUR_SECRET`

### Revenue Not Updating
**Symptom:** Revenue widget shows $0 despite paid fees.

**Causes:**
1. Fees marked as 'waived' instead of 'paid'
2. Frontend not fetching latest stats

**Solutions:**
1. Check fee status in database: `SELECT * FROM package_fees WHERE fee_status = 'paid';`
2. Hard refresh frontend (Cmd+Shift+R)
3. Check browser console for API errors

### Timezone Issues
**Symptom:** Fees calculated incorrectly (off by 1 day).

**Causes:**
1. Not using NY timezone utilities
2. DST transition edge case

**Solutions:**
1. Always use `getDaysBetweenNY()` from `backend/src/utils/timezone.js`
2. Never use `Date.now()` or simple date math
3. Test around midnight EST and during DST transitions

---

## Future Enhancements

### Potential Features
- [ ] Email reminders for fees over $10
- [ ] SMS notifications for high fees
- [ ] Bulk waive fees for multiple customers
- [ ] Fee history report (CSV export)
- [ ] Custom grace periods per customer
- [ ] Variable daily rates (VIP customers)
- [ ] Auto-waive fees for first-time offenders
- [ ] Package fee dashboard (analytics)

### Database Improvements
- [ ] Add `fee_history` table for audit trail
- [ ] Track fee adjustments and edits
- [ ] Add `customer_tier` to affect grace period

### UI Enhancements
- [ ] Fee trend charts (revenue over time)
- [ ] Customer fee history in Contact Detail page
- [ ] Quick-pay button in Need Follow-up
- [ ] Bulk actions (mark multiple as paid)

---

## Support & Maintenance

### Key Files
- **Backend:**
  - `backend/src/services/fee.service.js` - Core fee logic
  - `backend/src/controllers/fee.controller.js` - API endpoints
  - `backend/src/jobs/updatePackageFees.js` - Daily cron job
  - `backend/src/utils/timezone.js` - NY timezone utilities

- **Frontend:**
  - `frontend/src/components/WaiveFeeModal.tsx` - Waive fee modal
  - `frontend/src/pages/Dashboard.tsx` - Revenue widget & grouped follow-up
  - `frontend/src/lib/api-client.ts` - Fee API methods

- **Database:**
  - `supabase/migrations/20251209210403_add_package_fees.sql` - Fee table migration

### Contact
For questions or issues with the package fee system:
- Check this documentation first
- Review `log.md` for known issues
- Check Render logs for cron job status
- Test in local environment before production changes

---

## Changelog

### v1.0.0 (2025-12-10)
- ✅ Initial implementation
- ✅ Database migration with `package_fees` table
- ✅ Fee calculation service with NY timezone support
- ✅ Daily cron job for automatic fee updates
- ✅ Dashboard revenue widget
- ✅ Grouped follow-up section by person
- ✅ Waive fee modal with reason tracking
- ✅ Mark fee as paid functionality
- ✅ Revenue analytics (monthly, outstanding, total)
- ✅ Urgency-based sorting (fees > abandonment > age)

