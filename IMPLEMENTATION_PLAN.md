# Mei Way Outreach Tracker - Implementation Plan
## 90-Minute Hackathon Build

---

## 🎯 Executive Summary

**Goal:** Transform the existing Next.js SaaS starter (with Supabase auth) into a mail center CRM for Mei Way Mail Plus.

**Time Budget:** 90 minutes total
- **Backend:** 30-40 minutes
- **Frontend:** 50-60 minutes

**Team Split:**
- **Backend Dev:** Database schema, API routes, Supabase queries
- **Frontend Dev:** Dashboard UI, forms, message sending workflow

---

## ✅ What We're Keeping (Time Savers!)

### Already Built & Working:
1. ✅ **User Authentication** (Supabase Auth with email/password)
2. ✅ **Database Connection** (Supabase PostgreSQL + RLS)
3. ✅ **Next.js 14 App Router** setup
4. ✅ **Tailwind CSS** styling system
5. ✅ **Navigation & Layout** components
6. ✅ **Toast notifications** (for success/error messages)
7. ✅ **TypeScript** configuration

### What We're Removing/Ignoring:
- ❌ Stripe integration (payment stuff)
- ❌ Pricing page
- ❌ Customer portal
- ❌ Subscription management

---

## 📊 Updated Database Schema

### Schema Changes (DONE ✅):
The schema has been updated to match Mei Way's spreadsheet structure:

#### Table 1: `contacts`
- Tracks customer information from spreadsheet
- Fields: company_name, unit_number, contact_person, language_preference, email, phone, service_tier, mailbox_number, status

#### Table 2: `mail_items` 
- Tracks individual packages/mail (replaces "jobs")
- Fields: item_type, description, received_date, status, pickup_date

#### Table 3: `outreach_messages`
- Tracks all communications (replaces "reach_outs")
- Fields: message_type, channel, message_content, sent_at, responded, follow_up_date

#### Table 4: `message_templates`
- Pre-built message templates for quick sending
- Fields: template_name, template_type, subject_line, message_body, default_channel

---

## 🔧 Backend Implementation (30-40 min)

### Backend Dev Task Breakdown:

#### ✅ Task 1: Database Migration (COMPLETE)
**Files completed:** `simple_reset_rebuild.sql`
- [x] Updated schema with all 4 tables + foundation tables
- [x] Run migration in Supabase dashboard
- [x] Database ready and tested

#### ✅ Task 2: TypeScript Types (COMPLETE)
**File created:** `types/mei-way.ts`
- [x] Complete type definitions for all CRM entities
- [x] Form data types and dashboard statistics types

#### ✅ Task 3: Supabase Query Functions (COMPLETE)
**File completed:** `utils/supabase/queries.ts`
- [x] 15+ comprehensive query functions implemented:
  - Contact management: `getContacts`, `createContact`, `updateContact`, `getContactWithDetails`
  - Mail items: `getMailItems`, `createMailItem`, `updateMailItemStatus`, `getActiveMailItems`
  - Messages: `getOutreachMessages`, `createOutreachMessage`, `markMessageResponded`, `getPendingFollowups`
  - Templates: `getMessageTemplates`, `getDefaultTemplates`
  - Dashboard: `getDashboardStats`

#### ✅ Task 4: API Routes (COMPLETE)
**Files created:** All 7 API endpoints implemented
- [x] `app/api/contacts/route.ts` - GET all, POST new
- [x] `app/api/contacts/[id]/route.ts` - GET, PUT, DELETE one
- [x] `app/api/mail-items/route.ts` - GET all, POST new
- [x] `app/api/mail-items/[id]/route.ts` - PUT status
- [x] `app/api/messages/route.ts` - GET all, POST send message
- [x] `app/api/templates/route.ts` - GET templates
- [x] `app/api/dashboard/stats/route.ts` - GET dashboard statistics

**API endpoints ready:**
- `GET/POST /api/contacts` - Contact CRUD
- `GET/PUT/DELETE /api/contacts/[id]` - Individual contact operations
- `GET/POST /api/mail-items` - Mail item management
- `PUT /api/mail-items/[id]` - Update mail status
- `GET/POST /api/messages` - Message management
- `GET /api/templates` - Template retrieval
- `GET /api/dashboard/stats` - Dashboard data

#### ✅ Task 5: Sample Data (COMPLETE - see below)
**Ready to load:** Default templates and sample contacts provided

---

## 🎨 Frontend Implementation (50-60 min)

### Frontend Dev Task Breakdown:

#### Task 1: Main Dashboard Page (15 min)
**File to create:** `app/dashboard/page.tsx`

**Components:**
- Top stats bar (Total Contacts, Active Mail Items, Pending Follow-ups)
- Quick actions (+ Add Mail Item, + Add Contact)
- Recent mail items table with status badges
- Follow-up needed section

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  📊 20 Contacts  📦 15 Mail Items  ⏰ 5 Follow-ups │
│  [+ Add Mail] [+ Add Contact]                   │
├─────────────────────────────────────────────────┤
│  Recent Mail Items                              │
│  ┌───────────────────────────────────────────┐ │
│  │ Zhang | Package | Notified | 2h ago      │ │
│  │ Fred Fu | Letter | Received | 4h ago     │ │
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  Follow-ups Needed (Overdue)                    │
│  ┌───────────────────────────────────────────┐ │
│  │ Benjamin Wong | No response (48h)        │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

#### Task 2: Contacts Page (10 min)
**File to create:** `app/dashboard/contacts/page.tsx`

**Features:**
- Searchable/filterable contact list (matching spreadsheet view)
- Status badges (Active/PENDING/No)
- Click to view contact details
- Quick actions: Send Message, View History

**Table Columns:**
- Company Name
- Unit Number
- Contact Person
- Email
- Phone
- Status
- Actions

#### Task 3: Add/Edit Mail Item Modal (10 min)
**File to create:** `components/ui/MailItemModal.tsx`

**Form fields:**
- Select Contact (dropdown with autocomplete)
- Item Type (Package, Letter, Certified Mail, etc.)
- Description (text area)
- Auto-filled: Received Date, Status (default: Received)

**Actions:**
- [Save] button
- [Save & Notify] button (saves and opens message modal)

#### Task 4: Send Message Modal (15 min)
**File to create:** `components/ui/SendMessageModal.tsx`

**Critical Features:**
- Select contact
- Select message template (dropdown)
- Template preview with variable substitution
- Channel selection: Email ☐ SMS ☐ Copy to Clipboard ☐
- [Send] button

**Message Templates Dropdown:**
```
📬 Mail Received
🔔 Pickup Reminder  
✅ Pickup Confirmed
➕ Custom Message
```

**Variable replacement:**
- `{{contact_name}}` → actual contact name
- `{{item_type}}` → Package/Letter/etc.
- `{{company_name}}` → company name

#### Task 5: Contact Detail View (5-10 min)
**File to create:** `app/dashboard/contacts/[id]/page.tsx`

**Sections:**
- Contact info card
- Mail items history (table)
- Communication history (timeline)
- Quick actions: Send Message, Mark Picked Up

#### Task 6: Update Navigation (5 min)
**File to modify:** `components/ui/Navbar/Navlinks.tsx`

Replace "Pricing" with "Dashboard" and "Contacts":
```tsx
<Link href="/dashboard" className={s.link}>Dashboard</Link>
<Link href="/dashboard/contacts" className={s.link}>Contacts</Link>
```

---

## 🚀 Quick Wins & Time-Savers

### Use Existing Components:
1. **Button** - `components/ui/Button/Button.tsx`
2. **Input** - `components/ui/Input/Input.tsx`
3. **Card** - `components/ui/Card/Card.tsx`
4. **Toast** - `components/ui/Toasts/toast.tsx`

### Copy-Paste Friendly Patterns:
1. **Data fetching pattern:**
```tsx
const supabase = createClient();
const data = await getContacts(supabase);
```

2. **Form submission pattern:**
```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const response = await fetch('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  if (response.ok) {
    toast({ title: 'Success!' });
  }
};
```

3. **Status badge component:**
```tsx
const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    Active: 'bg-green-500',
    PENDING: 'bg-yellow-500',
    No: 'bg-red-500'
  };
  return <span className={`px-2 py-1 rounded ${colors[status]}`}>{status}</span>;
};
```

---

## 📋 MVP Feature Checklist (P0 = Must Have)

### ✅ P0 Features (Build These First):
- [ ] User can log in (already working)
- [ ] User can see dashboard with stats
- [ ] User can view all contacts in a table
- [ ] User can add a new contact
- [ ] User can log a new mail item for a contact
- [ ] User can select a message template
- [ ] User can send/copy a message to a contact
- [ ] Messages are logged in the database
- [ ] User can mark mail as "Picked Up"

### 🟡 P1 Features (If Time Permits):
- [ ] Search/filter contacts
- [ ] View contact details page
- [ ] View communication history
- [ ] Edit contact information
- [ ] Bulk actions (send to multiple contacts)
- [ ] Follow-up reminders (visual indicator)

### ⚪ P2 Features (Post-Hackathon):
- [ ] Custom message templates
- [ ] Actual email sending (via SendGrid/Resend API)
- [ ] SMS sending (via Twilio)
- [ ] Bilingual templates (English/Mandarin)
- [ ] Advanced search and filters
- [ ] Export data to CSV

---

## ⚡ 15-Minute Checkpoint Plan

### Minutes 0-15: Setup & Backend Foundation
- [ ] Run database migration
- [ ] Generate TypeScript types
- [ ] Create basic query functions
- [ ] Create first API route (contacts)

### Minutes 15-30: Core Backend APIs
- [ ] Complete all API routes
- [ ] Test endpoints with Postman/Thunder Client
- [ ] Add seed data for templates

### Minutes 30-45: Dashboard UI
- [ ] Build main dashboard page
- [ ] Create contact list page
- [ ] Style with existing components

### Minutes 45-60: Mail Item Flow
- [ ] Build add mail item modal
- [ ] Connect to API
- [ ] Test end-to-end flow

### Minutes 60-75: Message Sending
- [ ] Build send message modal
- [ ] Template selection & preview
- [ ] Message logging

### Minutes 75-90: Polish & Testing
- [ ] Mark as picked up functionality
- [ ] Fix any bugs
- [ ] Test full workflow: Add contact → Log mail → Send message → Mark picked up

---

## 🎯 Success Criteria

At the end of 90 minutes, you should be able to:

1. ✅ Log in as Madison or Merlin
2. ✅ See a list of contacts (import from spreadsheet)
3. ✅ Add a new mail item for a contact
4. ✅ Select "Mail Received" template
5. ✅ Send/copy message to contact
6. ✅ See message logged in communication history
7. ✅ Mark mail as "Picked Up"
8. ✅ See updated status in dashboard

**Time saved:** ~5 minutes per customer communication = **50% reduction**

---

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Start local Supabase (if using local dev)
pnpm supabase:start

# Run database migrations
pnpm supabase:reset

# Generate TypeScript types
pnpm supabase:generate-types

# Start dev server
pnpm dev
```

---

## 📦 File Structure Overview

```
pursuithackathon/
├── app/
│   ├── dashboard/                    # 🆕 Main dashboard
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── contacts/                 # Contacts section
│   │   │   ├── page.tsx              # Contact list
│   │   │   └── [id]/page.tsx         # Contact detail
│   │   └── mail-items/               # Mail items (optional)
│   │       └── page.tsx              
│   ├── api/                          # API routes
│   │   ├── contacts/                 # 🆕 Contact CRUD
│   │   │   ├── route.ts              
│   │   │   └── [id]/route.ts         
│   │   ├── mail-items/               # 🆕 Mail item CRUD
│   │   │   ├── route.ts              
│   │   │   └── [id]/route.ts         
│   │   ├── messages/                 # 🆕 Send messages
│   │   │   └── route.ts              
│   │   └── templates/                # 🆕 Message templates
│   │       └── route.ts              
│   ├── layout.tsx                    # Keep existing
│   └── page.tsx                      # Redirect to dashboard
├── components/
│   ├── ui/
│   │   ├── MailItemModal.tsx         # 🆕 Add mail modal
│   │   ├── SendMessageModal.tsx      # 🆕 Send message modal
│   │   ├── ContactForm.tsx           # 🆕 Add/edit contact
│   │   ├── StatusBadge.tsx           # 🆕 Status indicators
│   │   └── ...existing components    # Keep Button, Input, Card, etc.
├── types/
│   └── mei-way.ts                    # 🆕 Custom types
├── utils/
│   └── supabase/
│       └── queries.ts                # 📝 Add new query functions
├── schema.sql                        # ✅ Already updated!
└── IMPLEMENTATION_PLAN.md            # 📄 This file
```

---

## 🚨 Common Gotchas & Tips

### Backend:
1. **RLS Policies:** Make sure `user_id` is set correctly when inserting data
2. **UUID Generation:** Use `gen_random_uuid()` in Supabase, not client-side
3. **Timestamps:** Use `TIMESTAMPTZ` for all date fields

### Frontend:
1. **Server Components:** Use `createClient()` from `utils/supabase/server` in server components
2. **Client Components:** Use `createClient()` from `utils/supabase/client` in client components
3. **Revalidation:** Use `revalidatePath()` after mutations to refresh data
4. **Modals:** Use React state or dialog primitives (shadcn/ui dialogs if needed)

### Time Management:
1. **Don't overthink styling** - Use existing Tailwind classes
2. **Don't build custom components** - Use what's already there
3. **Copy-paste is OK** - Speed over perfection
4. **Test incrementally** - Don't wait until the end

---

## 🎉 Post-Hackathon Enhancements

If you finish early or want to add more:

1. **Actual Email/SMS Integration:**
   - Resend API for emails
   - Twilio for SMS
   - Environment variables for API keys

2. **Bilingual Support:**
   - Language toggle in templates
   - Chinese translations

3. **Advanced Features:**
   - Bulk import from CSV
   - Export communication reports
   - Email/SMS analytics
   - Calendar view for follow-ups

4. **UI Polish:**
   - Loading states
   - Empty states
   - Error boundaries
   - Animations (Framer Motion)

---

## 📞 Questions During Build?

**Schema Questions:** Check `schema.sql` for table structure
**Auth Questions:** Existing auth is working - just use it!
**Styling Questions:** Copy from existing components
**API Questions:** Follow patterns in `app/api/webhooks/route.ts`

---

## ✅ Final Checklist Before Demo

- [ ] Database migrated successfully
- [ ] Can log in with test user
- [ ] Dashboard loads with data
- [ ] Can add new contact
- [ ] Can log new mail item
- [ ] Can send message (or copy to clipboard)
- [ ] Message appears in history
- [ ] Can mark as picked up
- [ ] Status updates correctly

**Demo Script:**
1. "This is Madison logging in to Mei Way's outreach tracker"
2. "A new package arrived for Fred Fu - let me log it" [Add mail item]
3. "Now I'll notify him via email" [Select template, send]
4. "The system logs this automatically" [Show history]
5. "When he picks it up, I'll mark it" [Mark picked up]
6. "This reduced our communication time from 5 minutes to under 1 minute!"

---

## 🚀 Ready to Build!

**Remember:**
- Focus on P0 features first
- Use existing components
- Test as you go
- Speed over perfection
- Communication between team members is key!

Good luck! 🎯

