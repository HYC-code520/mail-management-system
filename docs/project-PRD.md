# Mei Way Mail Plus: Internal Mail Management Tool PRD

**Project:** Mei Way Mail — CRM MVP  
**Owner:** Ariel Chen (Pursuit Builder)  
**Supporting:** Tim (Project Coordinator), Pak (Technical Implementation)  
**Client:** Madison Rosa  
**Date:** Nov 6, 2025  

---

## 1. Problem

Mei Way Mail Plus is a new business that started in February 2025. Madison founded the store after noticing a growing demand for mail services in the area. Since February, they have mostly focused on the consignment business.

Due to a recent change in the building’s mail operations, all mail that used to be handled by the building’s security guard is now managed by Mei Way Mail Plus. As a result, most of their mail clients come from other shops within the same building in the mall.

Many of these clients prefer using Mei Way Mail Plus over USPS because:

- The post office is more expensive  
- Renting a PO box there often comes with a one- to two-year waitlist  

The store’s location in Flushing also means that the majority of its customers are Chinese-speaking, so bilingual communication (English and Chinese) is an essential part of daily operations.

The business is currently run by two employees: Madison and Merlin.

- Merlin works on **Mondays, Wednesdays, and Fridays** from **10:30 a.m. to 7 p.m.**
- Madison works on **Tuesdays, Thursdays, and weekends**

Their daily mail operations are handled manually and spread across multiple tools:

- Google Sheets – client profiles and mail tracking  
- Email – contracts and formal communication  
- Google Voice – text notifications from their business phone number  
- Physical notebook / Apple Cloud Notes – daily to-dos and reminders  

However, there is **no single system** that shows:

- Who currently has mail  
- Who has been notified  
- Which clients still need action  

This fragmented workflow makes it easy to lose track of pending items and follow-ups.

Their bilingual notifications are also repetitive, since the existing templates were originally written for consignment services rather than mail.

Recently, a **new building-wide mail contract** has increased mail volume significantly:

- Letters and envelopes arrive **2–3 times per week**
- All stores in the building are now **required** to use Mei Way Mail Plus for mail handling
- The workload is growing rapidly

Madison and Merlin need a more organized and centralized way to track:

- Incoming mail  
- Client communication  
- Next steps and follow-ups  

The business also has a growing **consignment** side that focuses on reselling vintage items, which brings in additional revenue. Madison hopes to spend more time developing that part of the business, so reducing the manual work required for mail operations will allow him to focus on expanding consignment sales.

Currently, lead handling is informal:

- Their first virtual client came from a friend’s referral  
- Madison prefers to send formal proposals by email  
- Follow-ups are flagged manually in Outlook reminders  

This makes tracking inconsistent. Madison would like a simple system that reminds him of:

- Pending pickups  
- Unanswered messages  

In short, he wants a **CRM that centralizes all client information, communication, and follow-up actions in one place**.

While consignment continues to grow, the **immediate priority for the MVP** is to focus on **optimizing the core mail management workflow**.

---

## 2. Opportunity

### 2.1 Summary

Deliver a **lightweight MailOps hub** to streamline:

> Intake → Identify customer → Send bilingual notification → Log → Remind / follow-up  
> + a simple lead tracker for proposals.

The opportunity is to develop a lightweight MailOps hub that simplifies and connects the multiple workflows of Mei Way Mail Plus.

The system will allow staff to:

- Intake and record incoming mail
- Quickly identify the correct customer
- Send bilingual (English and Chinese) notifications from one platform

Each notification will be **logged automatically**, with options to set **reminders** or **follow-up actions** to ensure timely pickups and responses.

In addition, a **simple tracker** of “who’s interested and who’s not” will help Madison:

- Manage new client proposals  
- Monitor follow-up status  
- View everything in one organized, centralized place  

### 2.2 Market Opportunity

- Small businesses and mailbox services repeat the same tasks every day — even simple organization/automation can **boost profits** and **keep customers longer**.  
- In the Flushing/Queens area, many customers need **bilingual (English/Chinese) support**, which is a clear advantage for Mei Way Mail Plus.  
- Their customers have more **Chinese speakers than English speakers** (the law firm and travel agent speak English).  
- This community often expects **after-hour responses and communication**.  
- They are **not very text-savvy**, but they **love WeChat**, so future integrations with WeChat would be valuable.

---

## 3. Users & Needs

### 3.1 Primary User – Merlin (Staff)

Merlin is the main daily operator at Mei Way Mail Plus.

- Works in the shop on **Mondays, Wednesdays, and Fridays** from **10:30 a.m. to 7 p.m.**
- Responsibilities:
  - Manage day-to-day mail operations
  - Open and sort packages
  - Hand packages to clients within the building
  - Notify customers about mail in person or via email
  - Assist with logging incoming mail (a process not yet fully digitized)
  - Research and list consignment items for resale
  - Occasionally create social media posts

Merlin will be the **primary user** of the system, as he performs most of the mail intake, notifications, and follow-ups that this CRM is meant to streamline.

#### Merlin’s Needs

As Merlin (who manages all the mail), I need to:

- **Log incoming mail and packages quickly**  
  Because doing it manually in spreadsheets is slow and prone to error.

- **Find the right customer fast**  
  By name, box number, or company, so I can notify them without cross-checking multiple tabs or files.

- **Send bilingual “you have mail” notifications with one click**  
  To avoid rewriting or copy-pasting messages every time.

- **Track which customers haven’t picked up or responded**  
  To follow up and avoid pile-ups of unclaimed items.  
  - Notifications happen **3 times a week** (Mon, Wed, Fri).  
  - After **1 week**, a warning-type notification goes out that customers must pay for not picking up the package.

- **View templates for common replies**  
  To make communication consistent and reduce typing.

- **Mark completed actions easily**  
  (Picked up / forwarded / scanned / abandoned) so I don’t have to double-check what’s already done.

---

### 3.2 Secondary User – Madison Rosa (Owner)

Madison is the owner of Mei Way Mail Plus.

- Works on **Tuesdays, Thursdays, and weekends**
- Responsibilities:
  - Handle client contracts
  - Manage new customer sign-ups
  - Oversee business operations

Madison will primarily use the system to:

- Review customer activity  
- Monitor mail and notification status  
- Ensure that client communication remains clear and professional in both English and Chinese  

#### Madison’s Needs

As Madison (who manages getting new clients), I need to:

- **See all customer updates in one place**  
  Because information is currently scattered across spreadsheets, notes (physical and online), and emails — causing confusion and lost time.

- **Track new client sign-ups and proposals**  
  Because follow-ups are in different emails and it will get messy as the business grows.

- **Send formal bilingual proposals and messages**  
  To maintain professionalism and consistency for both English- and Chinese-speaking clients.

- **Know what daily tasks belong to who**  
  So there’s no confusion or overlap between Madison and Merlin.

---

## 4. Proposed Solution

A **desktop-first web app** with three core areas:

1. **Intake**  
   Add today’s letters/packages and link them to the correct customer via search.

2. **Directory (Mini-CRM)**  
   Reduce the **sources of truth** to one platform.  
   Currently, sources of truth include:
   - Excel spreadsheet  
   - Google Docs  
   - Emails  
   - Paper contracts/forms  
   - Notes/checklists in their notebook  
   - Notes in Apple Notes  

3. **Notify (EN/中文)**  
   - Templates Madison and Merlin can customize  
   - Copy-and-paste into Gmail or another email service  
   - Reduce time spent writing manual emails  
   - When the email is sent, they can track what was sent in the **history section**  

### 4.1 Top 3 MVP Value Props

- **[The Vitamin]** – Reusable bilingual templates for mail notifications.  
- **[The Painkiller]** – Intake → Notify → Log in one place; fewer missed actions.  
- **[The Steroid]** – Reminders/dashboard makes a 2-person team feel bigger.

---

## 5. Goals & Non-Goals

### 5.1 Goals

- Build a **simple bilingual web tool** that helps staff record, notify, and track incoming mail in one place.  
- Reduce manual work, lost messages, and scattered data; **centralize email templates** and **improve response speed** and client satisfaction.  
- Ensure staff can complete daily mail tasks **faster and more consistently**, with all mail and notifications **logged and traceable** in one hub.

### 5.2 Non-Goals / Out of Scope (MVP)

| Area                    | Description                                                                                  |
|-------------------------|----------------------------------------------------------------------------------------------|
| Consignment automation  | No eBay/Etsy listing creation, pricing suggestions, or draft uploads in this MVP.           |
| Payment integrations    | No PayPal/Zelle or other billing systems integration (may allow manual notes only).         |
| Omnichannel messaging   | No WeChat, WhatsApp, or Yelp API integrations; staff will manually copy messages when needed. |
| Full 1583 e-sign workflow | Form tracking may be logged manually; no automation or ID upload system yet.              |
| Mobile-first app        | Focused on desktop/laptop for now (in-store use); mobile is deferred.                       |

---

## 6. Success Metrics

**Target timeframe:** 6 weeks after MVP launch.

| Goal                                          | Signal                                                                 | Metric                                                       | Target                              |
|-----------------------------------------------|------------------------------------------------------------------------|--------------------------------------------------------------|-------------------------------------|
| 1. Improve Operational Efficiency             | Staff can log mail, identify customers, and send bilingual notifications in one flow without switching tools. Workflow from intake → notification → follow-up is faster and smoother. | Average time from mail arrival to notification sent.         | **< 10 minutes per mail item**      |
| 2. Strengthen Organization & Follow-Up       | All mail items are logged and linked to customer profiles with complete notification history. Staff can view pending pickups without relying on manual notes. | % of mail items fully logged and linked to customers.        | **≥ 85%** fully logged              |
| 3. Increase Team Adoption & Consistency       | Madison and Merlin actively use the tool to replace manual logs. All customer-facing notifications use approved bilingual templates. | Daily active users (Mon–Sun). % of messages sent using templates. | **≥ 2 active users/day**, **≥ 80%** template usage |

---

## 7. Requirements

**Legend**

- **[P0]** = MVP for a GA release  
- **[P1]** = Important for delightful experience  
- **[P2]** = Nice-to-have

---

## 8. Use Case / Journey 1: Mail Intake → Notification → Log (Daily Workflow)

**Context:**  
When physical mail arrives, staff need a simple, reliable way to record it, find the customer, and notify them — all from one central place. The MVP focuses on **manual entry** and **template-based copy-paste workflows** that can later be automated.

### 8.1 Step 1: Mail Intake

- [P0] Staff can add a new mail item with minimal required fields:
  - [P0] Auto-filled date
  - [P0] Type (letter / package)
  - [P0] Short note (optional)

- [P0] Staff can search for and link the mail item to an **existing customer profile** by:
  - Name  
  - Company  
  - Mailbox number  

- [P0] Mail entries are **saved and persist** in the system (basic local or cloud database).

- [P0] If no existing customer is found, staff can **create a new profile**.  
  - This profile includes a column for what services they signed up for (Tier 1, Tier 2, add-ons).

- [P1] **To-do list checker** for staff to track:  
  - Who is doing what  
  - What needs attention  
  - What deadlines or alerts are active  

- [P1] **End-of-day / weekly summary reporting**  
  Automatic summaries showing:
  - What mail came in  
  - What was scanned  
  - What was forwarded  

- [P2] **Auto-apply customer policy rules** (Tier 1 & Tier 2)  
  - What fees will trigger and the rules that come with it  
  - What they can receive, what limits apply, and what fees trigger  
  - Example: Tier 1 = no packages; Tier 2 = packages allowed, 1-day hold, etc.

- [P2] **Future: OCR (Optical Character Recognition)**  
  - From uploaded label images for auto-entry.

- [P2] **Future: Photo upload** of the package for reference in the mail item.  
  - Might require cloud storage with additional cost considerations.

---

### 8.2 Step 2: Bilingual Notification (Manual Send)

- [P1] The system provides reusable **bilingual templates (EN/中文)** that staff can copy and paste into Gmail or another email service. Templates cover:

  - New mail/package arrival  
  - Reminder for uncollected mail  
  - Final notice for unclaimed packages (after 1 week)  
  - Contract message or form send-out  
  - General bilingual updates  

- [P1] Staff can **add and customize new templates** based on needs.

- [P1] **Auto-fill placeholders** to speed up prep, e.g.:

  - `{CUSTOMER_NAME}`  
  - `{MAILBOX_NUMBER}`  
  - `{MAIL_TYPE}`  
  - `{RECEIVED_DATE}`  

- [P2] **Stretch goal:** Direct “Send Email” integration via Gmail API with **auto-logging** of sent messages.

---

### 8.3 Step 3: Log & Follow-up

- [P0] Staff can mark a mail item as:

  - “Pending”  
  - “Notified”  
  - “Picked up”  
  - “Scanned document”  
  - “Forwarded”  
  - “Abandoned package”

  directly in the system, to track current status.

- [P0] Each **status change is stored and visible** in the log view.

- [P1] Show how long each item has been stored, including items **close to triggering fees**.

- [P1] Allow **manual reminder notes** (e.g., “Follow up Wednesday”) in a “tickler” section.

- [P2] **Automated reminders** or dashboard for overdue items.  
  - “Ticklers” connected with future email integration via Gmail.

---

## 9. Use Case / Journey 2: Customer Profile (Mini CRM)

**Context:**  
Provides a centralized, bilingual-friendly view of all customers and their mail activities.

- [P0] Staff can **view, create, and edit customer profiles**, including:

  - Name  
  - Company  
  - Mailbox #  
  - Email  
  - Phone  
  - Language preference  

- [P0] Each customer shows **basic mail history** (manual entry).

- [P1] **Timeline view** of notifications and status updates.

- [P1] Add **tags or filters**, such as:

  - Tenant / Business  
  - Active / Inactive  

- [P2] **Leads (simple)** — capture:

  - Name + email  
  - Record “proposal sent”  
  - Set reminder  

---

## 10. Appendix

- Designs: simple, clean, and practical layout, optimized for desktop use.  
- Future enhancements (e.g., WeChat integration, consignment module, advanced analytics) will be considered after the MVP proves value and stabilizes daily mail operations.

