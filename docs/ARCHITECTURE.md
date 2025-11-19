# Mei Way Outreach Tracker - Data Flow & Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  ┌────────────┐  ┌───────────┐  ┌─────────────────────┐   │
│  │ Dashboard  │  │ Contacts  │  │  Mail Items         │   │
│  │  Page      │  │   Page    │  │  & Messages         │   │
│  └────────────┘  └───────────┘  └─────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ API Routes
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                       │
│  /api/contacts    /api/mail-items    /api/messages         │
│  /api/templates                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ Supabase Client
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Database + Auth)                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐            │
│  │ contacts │  │mail_items │  │outreach_msgs │            │
│  └──────────┘  └───────────┘  └──────────────┘            │
│  ┌──────────────────────┐                                  │
│  │ message_templates    │   + Row Level Security           │
│  └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                       users                                  │
│  - id (uuid)                                                │
│  - full_name                                                │
│  - email                                                     │
└────────────┬────────────────────────────────────────────────┘
             │ 1
             │
             │ N
┌────────────▼────────────────────────────────────────────────┐
│                     contacts                                 │
│  - contact_id (PK)                                          │
│  - user_id (FK) ──────────────────┐                        │
│  - company_name                    │                        │
│  - unit_number                     │                        │
│  - contact_person                  │                        │
│  - language_preference             │                        │
│  - email                           │                        │
│  - phone_number                    │                        │
│  - service_tier                    │                        │
│  - mailbox_number                  │                        │
│  - status (Active/PENDING/No)      │                        │
└────────────┬───────────────────────┼────────────────────────┘
             │ 1                     │
             │                       │
             │ N                     │
┌────────────▼───────────────────────┼────────────────────────┐
│                  mail_items        │                        │
│  - mail_item_id (PK)               │                        │
│  - contact_id (FK)                 │                        │
│  - item_type                       │                        │
│  - description                     │                        │
│  - received_date                   │                        │
│  - status (Received/Notified/      │                        │
│            Picked Up/Returned)     │                        │
│  - pickup_date                     │                        │
└────────────┬───────────────────────┼────────────────────────┘
             │ 1                     │
             │                       │
             │ N                     │ N
┌────────────▼───────────────────────▼────────────────────────┐
│               outreach_messages                              │
│  - message_id (PK)                                          │
│  - mail_item_id (FK, optional)                              │
│  - contact_id (FK)                                          │
│  - message_type                                             │
│  - channel (Email/SMS/WeChat/Phone)                         │
│  - message_content                                          │
│  - sent_at                                                  │
│  - responded (boolean)                                      │
│  - follow_up_needed                                         │
│  - follow_up_date                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               message_templates                              │
│  - template_id (PK)                                         │
│  - user_id (FK, nullable for defaults)                      │
│  - template_name                                            │
│  - template_type                                            │
│  - subject_line                                             │
│  - message_body (with {{variables}})                        │
│  - default_channel                                          │
│  - is_default                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 User Workflow: Log Mail & Send Notification

```
START: New package arrives
         │
         ▼
┌──────────────────────────┐
│ 1. Staff logs in        │
│    (Madison or Merlin)  │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ 2. Opens Dashboard       │
│    - Sees current stats  │
│    - Clicks "+ Add Mail" │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ 3. Add Mail Item Modal   │
│    Opens                 │
│    ┌──────────────────┐ │
│    │ Select Contact   │ │  ← Search/dropdown
│    │ Item Type        │ │  ← Package/Letter/etc
│    │ Description      │ │  ← Optional note
│    │ [Save & Notify]  │ │  ← Click this
│    └──────────────────┘ │
└───────────┬──────────────┘
            │
            ▼
    ┌───────┴────────┐
    │ API Call       │
    │ POST           │
    │ /api/mail-items│
    └───────┬────────┘
            │
            ▼
    ┌───────────────────────┐
    │ DB: Insert into       │
    │ mail_items table      │
    │ Status = "Received"   │
    └───────┬───────────────┘
            │
            ▼
┌──────────────────────────┐
│ 4. Send Message Modal    │
│    Opens Automatically   │
│    ┌──────────────────┐ │
│    │ Template:        │ │
│    │ [Mail Received▼] │ │  ← Dropdown with templates
│    │                  │ │
│    │ Preview:         │ │
│    │ "Hi Zhang,       │ │  ← Auto-fills with data
│    │ You have a       │ │
│    │ Package ready    │ │
│    │ for pickup..."   │ │
│    │                  │ │
│    │ Channel:         │ │
│    │ ☑ Email          │ │
│    │ ☐ SMS            │ │
│    │ ☐ Copy Text      │ │
│    │                  │ │
│    │ [Send Message]   │ │  ← Click this
│    └──────────────────┘ │
└───────────┬──────────────┘
            │
            ▼
    ┌───────┴────────┐
    │ API Call       │
    │ POST           │
    │ /api/messages  │
    └───────┬────────┘
            │
            ▼
    ┌───────────────────────────┐
    │ DB: Insert into           │
    │ outreach_messages table   │
    │ - Log message content     │
    │ - Set follow_up_date      │
    │   (24-48h from now)       │
    └───────┬───────────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ DB: Update            │
    │ mail_items.status     │
    │ "Received" → "Notified"│
    └───────┬───────────────┘
            │
            ▼
┌──────────────────────────┐
│ 5. Confirmation Toast    │
│    "Message sent to      │
│     Zhang via Email!"    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ 6. Dashboard Updates     │
│    - Mail item shows     │
│      "Notified" status   │
│    - Message logged in   │
│      history             │
│    - Follow-up reminder  │
│      scheduled           │
└──────────────────────────┘
            │
            ▼
    Wait 24-48 hours
            │
            ▼
┌──────────────────────────┐
│ 7. Follow-up Appears     │
│    in Dashboard          │
│    "Zhang - No response  │
│     for 48h"             │
│    [Send Reminder]       │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ 8. Customer Picks Up     │
│    Staff clicks          │
│    [Mark Picked Up]      │
└───────────┬──────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ DB: Update            │
    │ mail_items.status     │
    │ → "Picked Up"         │
    │ pickup_date = NOW()   │
    └───────┬───────────────┘
            │
            ▼
┌──────────────────────────┐
│ 9. Optional: Send        │
│    Confirmation Message  │
│    "Thank you for        │
│     picking up!"         │
└──────────────────────────┘
            │
            ▼
        END: Complete!
```

## 🎯 Key User Flows

### Flow 1: Add New Contact (Import from Spreadsheet)
```
Dashboard → [+ Add Contact] → Fill Form → Save → Contact List
```

**Data:**
- Company Name: "Flushing Travel (Shine Travel)"
- Unit Number: "F6A/B"
- Contact Person: "Fred Fu"
- Language: "English"
- Email: "flushingtravel@yahoo.com"
- Status: "Active"

### Flow 2: Quick Notification (Staff's Daily Task)
```
Dashboard → [+ Add Mail] → Select "Zhang" → Package →
[Save & Notify] → "Mail Received" template → [Send Email] → Done!
```

**Time:** < 1 minute (vs 5 minutes manually)

### Flow 3: Follow-Up Reminder
```
Dashboard → "Follow-ups Needed" section → See "Benjamin Wong (48h)" →
Click [Remind] → "Pickup Reminder" template → [Send SMS] → Done!
```

### Flow 4: View Contact History
```
Contacts → Click "Zhang" → See:
- Contact info
- 3 mail items this month
- 5 messages sent
- Last pickup: 2 days ago
```

## 📱 UI Component Tree

```
App Layout
├── Navbar
│   ├── Logo
│   ├── Dashboard Link
│   ├── Contacts Link
│   └── Sign Out Button
│
├── Dashboard Page (/)
│   ├── Stats Cards
│   │   ├── Total Contacts Card
│   │   ├── Active Mail Items Card
│   │   └── Pending Follow-ups Card
│   ├── Action Buttons
│   │   ├── [+ Add Mail Item] → Opens MailItemModal
│   │   └── [+ Add Contact] → Opens ContactForm
│   ├── Recent Mail Items Table
│   │   └── Rows with StatusBadge
│   └── Follow-ups Needed Section
│       └── Follow-up Cards
│
├── Contacts Page (/dashboard/contacts)
│   ├── Search Bar
│   ├── Filter Dropdown (Status)
│   ├── Contacts Table
│   │   ├── Company Name Column
│   │   ├── Unit Number Column
│   │   ├── Contact Person Column
│   │   ├── Email Column
│   │   ├── Phone Column
│   │   ├── Status Column (with StatusBadge)
│   │   └── Actions Column
│   │       ├── [View] → Contact Detail Page
│   │       └── [Message] → SendMessageModal
│   └── [+ New Contact] Button
│
├── Contact Detail Page (/dashboard/contacts/[id])
│   ├── Contact Info Card
│   │   └── [Edit] [Delete] [Send Message] Buttons
│   ├── Mail Items History Table
│   │   └── [Mark Picked Up] Button per row
│   └── Communication History Timeline
│       └── Message cards with timestamp
│
├── Modals/Dialogs (Shared)
│   ├── MailItemModal
│   │   ├── Contact Selector (Dropdown)
│   │   ├── Item Type Input
│   │   ├── Description Textarea
│   │   ├── [Cancel] Button
│   │   ├── [Save] Button
│   │   └── [Save & Notify] Button
│   │
│   ├── SendMessageModal
│   │   ├── Contact Display (read-only if context)
│   │   ├── Template Selector (Dropdown)
│   │   ├── Message Preview (auto-updates)
│   │   ├── Channel Checkboxes (Email/SMS/Copy)
│   │   ├── [Cancel] Button
│   │   └── [Send Message] Button
│   │
│   └── ContactForm (Modal or Page)
│       ├── All contact fields from spreadsheet
│       ├── [Cancel] Button
│       └── [Save Contact] Button
│
└── Footer
```

## 🎨 Component Reuse Map

```
Existing Component → New Use Case
─────────────────────────────────
Button.tsx → All action buttons
Input.tsx → All form inputs
Card.tsx → Stats cards, contact cards
Toast → Success/error notifications
Navbar → Main navigation (update links)

New Components to Create
────────────────────────
StatusBadge.tsx → Color-coded status (Active/PENDING/No)
MailItemModal.tsx → Add mail item dialog
SendMessageModal.tsx → Message sending dialog
ContactForm.tsx → Add/edit contact form
ContactTable.tsx → Sortable contacts table
MessageTimeline.tsx → Communication history view
```

## 🔒 Security: Row Level Security (RLS)

```
Policy: "Users can manage their own contacts"
─────────────────────────────────────────────
SELECT contacts WHERE user_id = auth.uid()
INSERT contacts VALUES (..., user_id = auth.uid())
UPDATE contacts WHERE user_id = auth.uid()
DELETE contacts WHERE user_id = auth.uid()

Policy: "Users can manage mail items for their contacts"
─────────────────────────────────────────────────────────
SELECT mail_items WHERE contact_id IN (
  SELECT contact_id FROM contacts WHERE user_id = auth.uid()
)

Policy: "Users can manage outreach for their contacts"
───────────────────────────────────────────────────────
SELECT outreach_messages WHERE contact_id IN (
  SELECT contact_id FROM contacts WHERE user_id = auth.uid()
)
```

## 🚀 API Endpoints Reference

```
Contacts
────────
GET    /api/contacts           → List all contacts (filtered by user)
POST   /api/contacts           → Create new contact
GET    /api/contacts/[id]      → Get single contact
PUT    /api/contacts/[id]      → Update contact
DELETE /api/contacts/[id]      → Delete contact

Mail Items
──────────
GET    /api/mail-items         → List all mail items (optional ?contact_id=xxx)
POST   /api/mail-items         → Create new mail item
PUT    /api/mail-items/[id]    → Update mail item (usually status)

Messages
────────
GET    /api/messages           → List messages (optional ?contact_id=xxx)
POST   /api/messages           → Log new outreach message
PUT    /api/messages/[id]      → Mark as responded

Templates
─────────
GET    /api/templates          → Get all message templates
POST   /api/templates          → Create custom template (P1/P2 feature)
```

## ⚡ Performance Optimizations

```
1. Server Components (Default)
   - Dashboard stats
   - Contact list
   - Mail items list
   → Fetch data on server, reduce client JS

2. Client Components (Only When Needed)
   - Modals/dialogs
   - Forms with interactivity
   - Real-time updates
   → Use 'use client' directive

3. Data Fetching Strategies
   - Server: await getContacts(supabase)
   - Client: fetch('/api/contacts')
   - Revalidation: revalidatePath('/dashboard')

4. Caching
   - Next.js automatic caching
   - Supabase query caching
   - Consider React Query for P2
```

## 📈 Success Metrics Tracking

```
Before (Manual Process):
────────────────────────
1. Open Gmail/SMS app             → 30 seconds
2. Find contact info              → 30 seconds
3. Copy-paste message             → 60 seconds
4. Send email/text                → 30 seconds
5. Log in spreadsheet             → 120 seconds
6. Set reminder in Outlook        → 60 seconds
                           TOTAL: 5.5 minutes per customer

After (Mei Way Tracker):
────────────────────────
1. Click [+ Add Mail]             → 5 seconds
2. Select contact & item type     → 10 seconds
3. Click [Save & Notify]          → 5 seconds
4. Select template, click Send    → 20 seconds
5. Auto-logged & reminder set     → 0 seconds (automatic!)
                           TOTAL: 40 seconds per customer

Time Saved: 4 minutes 50 seconds per customer (87% reduction!)
```

## 🎯 Demo Script for Presentation

```
"Hi, I'm Madison from Mei Way Mail Plus. We were spending 5+ minutes per 
customer just to send a simple 'you have mail' notification. With this 
tracker, I can now do it in under a minute."

[Show Dashboard]
"Here's my dashboard. I can see I have 20 contacts, 15 active mail items, 
and 5 people who need follow-up reminders."

[Click + Add Mail]
"A package just arrived for Fred Fu. Let me log it..."
[Select Fred Fu, Package, click Save & Notify]

[Message Modal Opens]
"Now I'll send him the notification. I select the 'Mail Received' template,
and it automatically fills in his name and the item type."
[Click Send Email]

[Toast appears: "Message sent to Fred Fu via Email!"]
"Done! The system logged this message, set a 48-hour follow-up reminder,
and updated the status to 'Notified' — all automatically."

[Show Contact Detail]
"I can see all of Fred's mail history and every message we've sent him."

[Show Follow-ups section]
"And here, I can see Benjamin Wong hasn't responded in 48 hours, so I 
should send him a reminder."

"This has cut our communication time by 87%, from 5 minutes down to 40 
seconds per customer. With 50+ customers per day, that's over 3 hours 
saved daily!"
```

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js 14 Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs

Happy building! 🚀

