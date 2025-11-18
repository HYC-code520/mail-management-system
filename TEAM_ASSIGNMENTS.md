# Team Task Assignments - 90 Minute Build

## 🔧 Backend Developer Tasks (30-40 minutes)

### ⏱️ Phase 1: Database & Types (10 min)
- [ ] **Run migration** - Execute updated `schema.sql` in Supabase
  ```bash
  pnpm supabase:reset
  ```
- [ ] **Create types file** - Copy from `IMPLEMENTATION_PLAN.md` → `types/mei-way.ts`
- [ ] **Generate DB types** - Run `pnpm supabase:generate-types`

### ⏱️ Phase 2: Query Functions (10 min)
**File:** `utils/supabase/queries.ts`

Add these functions (copy patterns from existing queries):
```typescript
// Contacts
- getContacts() - Get all contacts for logged-in user
- getContactById(contactId) - Get single contact
- createContact(data) - Insert new contact
- updateContact(contactId, data) - Update contact

// Mail Items  
- getMailItems(contactId?) - Get mail items (optionally filtered)
- createMailItem(data) - Log new mail/package
- updateMailItemStatus(mailItemId, status) - Update status

// Outreach
- getOutreachMessages(contactId?) - Get message history
- createOutreachMessage(data) - Log sent message

// Templates
- getMessageTemplates() - Get all templates (including defaults)
```

### ⏱️ Phase 3: API Routes (15 min)
Create these API endpoints:

1. **`app/api/contacts/route.ts`**
   - GET: Return all contacts
   - POST: Create new contact

2. **`app/api/contacts/[id]/route.ts`**
   - GET: Return single contact
   - PUT: Update contact
   - DELETE: Delete contact

3. **`app/api/mail-items/route.ts`**
   - GET: Return all mail items
   - POST: Create new mail item

4. **`app/api/mail-items/[id]/route.ts`**
   - PUT: Update mail item status

5. **`app/api/messages/route.ts`**
   - POST: Log new outreach message

6. **`app/api/templates/route.ts`**
   - GET: Return message templates

### ⏱️ Phase 4: Seed Data (5 min)
**File:** `supabase/seed.sql`

Add default message templates (SQL provided in implementation plan).

---

## 🎨 Frontend Developer Tasks (50-60 minutes)

### ⏱️ Phase 1: Dashboard Page (15 min)
**File:** `app/dashboard/page.tsx`

**Build:**
- Stats cards (Total Contacts, Active Mail Items, Pending Follow-ups)
- Action buttons (+ Add Mail, + Add Contact)
- Recent mail items table
- Follow-ups needed section

**Use existing components:**
- Card component for stats
- Button component for actions
- Table with Tailwind classes

### ⏱️ Phase 2: Contacts Page (10 min)
**File:** `app/dashboard/contacts/page.tsx`

**Build:**
- Data table matching spreadsheet layout
- Columns: Company Name, Unit Number, Contact Person, Email, Phone, Status, Actions
- Status badges (green=Active, yellow=PENDING, red=No)
- Click row to view details

### ⏱️ Phase 3: Mail Item Modal (10 min)
**File:** `components/ui/MailItemModal.tsx`

**Form fields:**
- Contact selector (dropdown)
- Item type (Package, Letter, Certified Mail)
- Description (textarea)
- Auto-fill received date

**Buttons:**
- [Save] - Just save the mail item
- [Save & Notify] - Save + open send message modal

### ⏱️ Phase 4: Send Message Modal (15 min)
**File:** `components/ui/SendMessageModal.tsx`

**Critical features:**
- Template selector dropdown (Mail Received, Pickup Reminder, Pickup Confirmed)
- Message preview with variable replacement
  - `{{contact_name}}` → actual name
  - `{{item_type}}` → Package/Letter/etc.
- Channel selection: ☐ Email ☐ SMS ☐ Copy to Clipboard
- [Send] button → logs message in database

### ⏱️ Phase 5: Contact Detail Page (5 min)
**File:** `app/dashboard/contacts/[id]/page.tsx`

**Sections:**
- Contact info card
- Mail items table (for this contact)
- Communication history (timeline view)
- Quick actions (Send Message, Mark Picked Up)

### ⏱️ Phase 6: Navigation Update (5 min)
**File:** `components/ui/Navbar/Navlinks.tsx`

Replace "Pricing" link with:
- Dashboard link → `/dashboard`
- Contacts link → `/dashboard/contacts`

---

## 🎯 Parallel Work Strategy

### Minutes 0-15: Independent Work
**Backend:** Setup database, create types
**Frontend:** Build dashboard layout & skeleton

### Minutes 15-30: First Integration Point
**Backend:** Complete contacts API
**Frontend:** Connect contacts page to API

### Minutes 30-45: Core Features
**Backend:** Mail items & messages API
**Frontend:** Build mail item modal

### Minutes 45-60: Message Flow
**Backend:** Templates API
**Frontend:** Build send message modal

### Minutes 60-75: Integration & Testing
**Both:** Test end-to-end workflow together

### Minutes 75-90: Polish & Bug Fixes
**Both:** Fix issues, improve UX

---

## 🚀 Quick Reference

### Backend API Patterns
```typescript
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const data = await getContacts(supabase);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  const result = await createContact(supabase, body);
  return NextResponse.json(result);
}
```

### Frontend Data Fetching
```typescript
// Server Component
const supabase = createClient();
const contacts = await getContacts(supabase);

// Client Component
const response = await fetch('/api/contacts');
const contacts = await response.json();
```

### Form Submission
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const response = await fetch('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  
  if (response.ok) {
    toast({ title: 'Contact created!' });
    router.refresh();
  }
};
```

---

## ✅ Testing Checklist (Both Team Members)

Test this flow together at minute 60:

1. [ ] Login works
2. [ ] Dashboard shows stats
3. [ ] Can view contacts list
4. [ ] Can add new contact
5. [ ] Can log new mail item for contact
6. [ ] Can select message template
7. [ ] Message preview shows correct info
8. [ ] Can send/copy message
9. [ ] Message appears in history
10. [ ] Can mark mail as picked up
11. [ ] Status updates correctly

---

## 🆘 Quick Help

**Backend stuck?**
- Copy patterns from `app/api/webhooks/route.ts`
- Check `utils/supabase/queries.ts` for examples

**Frontend stuck?**
- Look at existing `app/account/page.tsx` for form patterns
- Check `components/ui/` for reusable components

**Database issues?**
- Run `pnpm supabase:status` to check if running
- Check browser console for RLS policy errors

**Need to communicate?**
- Backend ready with contacts API? → Tell frontend!
- Frontend needs specific data format? → Tell backend!

---

## 🎉 Success = Working Demo

At minute 90, you should be able to show:

**"5-Minute Demo Flow"**
1. Login as Madison
2. See dashboard with current stats
3. Add new mail item for "Zhang"
4. Select "Mail Received" template
5. Preview shows: "Hi Zhang, You have a Package ready for pickup..."
6. Click "Copy to Clipboard" (or "Send Email" if implemented)
7. Show message logged in communication history
8. Mark as "Picked Up"
9. Show updated status in dashboard

**Success Metric:** Reduced communication time from 5 minutes → under 1 minute ✅

Good luck team! 🚀

