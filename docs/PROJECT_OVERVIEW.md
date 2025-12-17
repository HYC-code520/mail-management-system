# Mei Way Mail Plus - Project Overview

## What It Is
A complete mail management system for a mail forwarding service. Staff can log incoming mail, notify customers, track packages, collect storage fees, and manage customer information - all in one place.

---

## Core Features

### 1. **Mail Logging & Tracking**
- **Log New Mail**: Record incoming letters and packages for customers
- **Smart Scanning**: Use camera/phone to scan mail labels and auto-match to customers using AI
- **Quick Scan Mode**: Bulk scan multiple items rapidly during busy times
- **Mail History**: Complete timeline of all mail items per customer
- **Status Tracking**: Received → Notified → Picked Up/Forwarded

### 2. **Customer Notifications**
- **Email Templates**: Pre-written templates for different scenarios (new mail, fees, reminders)
- **Smart Summary Emails**: Send one email for all items a customer has
- **Bulk Email**: Send announcements to multiple customers at once
- **Bilingual Support**: English and Chinese templates
- **Notification History**: Track when and what was sent to each customer

### 3. **Package Storage Fees**
- **Automatic Fee Calculation**: Fees increase daily after grace period (2 days free, then $2/day)
- **Fee Collection**: Collect payments via cash, card, Venmo, Zelle, check
- **Discount Support**: Staff can adjust fees and track discounts
- **Revenue Tracking**: Dashboard shows monthly revenue, total revenue, outstanding fees
- **Waive Fees**: Option to waive fees with reason tracking

### 4. **Dashboard & Analytics**
- **Quick Actions**: Fast access to scan mail, log mail, add customers
- **Needs Follow-Up**: Intelligent list of customers who need attention
  - Shows customers with unpaid fees
  - Shows customers with items not notified recently (3+ days)
  - Displays ALL their outstanding items, not just filtered ones
- **Statistics**: Total customers, active mail items, overdue packages, revenue
- **Charts**: Mail volume trends, customer growth over time

### 5. **Customer Management**
- **Customer Database**: Store contact info, mailbox numbers, language preference
- **Search & Filter**: Find customers by name, company, mailbox number
- **Customer Profiles**: View complete history of mail, fees, and communications
- **Fee Overview**: See all outstanding fees per customer with age and amounts

---

## Key Workflows

### Daily Mail Processing
1. **Morning**: Staff opens scan session
2. **Scan Items**: Take photos of mail labels
3. **Auto-Match**: AI matches labels to customers
4. **Review & Submit**: Verify matches, send notifications
5. **Done**: Customers receive emails automatically

### Customer Pickup
1. **Customer Arrives**: Staff searches by name/mailbox
2. **View Items**: See all packages and letters
3. **Check Fees**: System shows any storage fees owed
4. **Collect Payment**: Select staff member, payment method, adjust if needed
5. **Mark Picked Up**: Items marked as completed

### Follow-Up Reminders
1. **Dashboard Shows**: Customers needing attention (fees owed, long wait times)
2. **Quick Actions**: Send reminders, collect fees, mark abandoned
3. **Urgency Sorting**: Customers with fees or old packages appear first

---

## Technical Architecture

### Frontend (React + TypeScript)
- Modern single-page application
- Real-time updates
- Mobile-responsive design
- Deployed on Vercel

### Backend (Node.js + Express)
- RESTful API
- JWT authentication
- Automated fee calculations
- Deployed on Render

### Database (Supabase/PostgreSQL)
- Customer data
- Mail items and tracking
- Package fees and payments
- Notification history
- Action audit logs

### Third-Party Services
- **Gmail API**: Send emails through office Gmail account
- **Google Gemini AI**: Smart matching of scanned labels to customers
- **Tesseract OCR**: Backup text extraction from images
- **Amazon Translate**: Translate templates to Chinese

---

## User Roles & Permissions

### Staff (Madison & Merlin)
- Log mail items
- Scan and process incoming mail
- Send notifications to customers
- Collect fees and payments
- View all customer data
- Access dashboard and analytics

### Authentication
- Email/password login through Supabase Auth
- Session management with JWT tokens
- Secure API endpoints

---

## Data Management

### Mail Items
- **Types**: Letter, Package, Certified Mail, Large Package
- **Statuses**: Received, Notified, Picked Up, Forwarded, Abandoned
- **Properties**: Received date, quantity, notes, tracking numbers
- **Relationships**: Linked to customers, fees, notifications

### Package Fees
- **Automatic Calculation**: Runs daily to update pending fees
- **Grace Period**: First 2 days free
- **Daily Rate**: $2 per day after grace period
- **Statuses**: Pending, Paid, Waived
- **Discount Tracking**: Stores both original fee and actual collected amount

### Customers (Contacts)
- **Basic Info**: Name, company, mailbox number, email, phone
- **Preferences**: Language (English/Chinese), notification settings
- **Status**: Active, Inactive
- **History**: Complete log of all mail and interactions

---

## Smart Features

### AI-Powered Scanning
- Takes photos of mail labels
- Extracts text using Google Gemini or Tesseract OCR
- Matches to customers by name, company, or mailbox number
- Confidence scoring for accuracy
- Manual override available

### Intelligent Grouping
- Groups mail items by customer, date, and type
- Shows summary view (e.g., "3 packages on Dec 10")
- Expandable details for each group
- Action history tracked at item level

### Timezone Awareness
- All dates/times in New York timezone
- Prevents timezone bugs for fee calculations
- Consistent date display across app

### Notification Deduplication
- Tracks notification history per mail item
- Prevents sending duplicate notifications
- Smart filtering for follow-up reminders

---

## Reporting & Insights

### Revenue Tracking
- **Monthly Revenue**: Fees collected this month
- **Total Revenue**: All-time fees collected (uses actual collected amounts)
- **Outstanding Fees**: Total pending fees across all customers
- **Waived Fees**: Track forgiven/discounted amounts

### Follow-Up Management
- Urgency scoring based on:
  - Pending fees (highest priority)
  - Age of packages (older = more urgent)
  - Notification status (never notified or 3+ days old)
- Grouped by customer for efficient processing
- Shows total fees and item counts at a glance

### Action History
- Every important action is logged:
  - Mail received
  - Notifications sent (by whom)
  - Fees collected (with payment method and staff)
  - Status changes
  - Fee waivers (with reason)
- Complete audit trail for accountability

---

## Recent Improvements

### December 2024 Updates
1. **Staff Attribution**: Track who collected fees and sent emails (Madison/Merlin)
2. **Discount Tracking**: Revenue now shows actual collected amounts, not original fees
3. **Better Follow-Up Display**: Show ALL items for customers with fees, not just filtered ones
4. **Improved Scanning UX**: Non-blocking "Keep scanning!" message, glowing buttons
5. **Mail Log Enhancements**: Auto-highlight newly added items, "Scan Mail" button
6. **Fee Collection**: Required staff selection, editable amounts with discount notation
7. **UI Polish**: Removed unnecessary emojis, improved hover effects, added tooltips
8. **Bulk Email**: Send announcements to multiple customers at once

---

## Future Considerations

### Potential Features
- SMS notifications (via Twilio)
- Package photo attachments
- Customer self-service portal
- Multi-location support
- Inventory/storage management
- Advanced reporting and exports
- Mobile app for staff

### Scalability
- Currently designed for single-location operation
- Database can handle thousands of customers
- Fee calculation runs as scheduled job
- Can add caching for performance if needed

---

## Support & Maintenance

### Monitoring
- Backend server health checks
- Error logging and tracking
- Database backup (handled by Supabase)
- Uptime monitoring via Vercel/Render

### Updates
- Code hosted on GitHub
- Continuous deployment (push to GitHub → auto-deploy)
- Migration system for database schema changes
- Version control for all changes

---

## Key Technical Decisions

### Why These Technologies?
- **React**: Modern, maintainable frontend with great tooling
- **TypeScript**: Type safety reduces bugs
- **Supabase**: Fast setup, built-in auth, real-time features
- **Vercel**: Free hosting, automatic HTTPS, global CDN
- **Gmail API**: Use existing business email, no extra service needed
- **Gemini AI**: Latest Google AI, excellent for text extraction

### Security
- Passwords hashed (handled by Supabase)
- API endpoints require authentication
- Environment variables for secrets
- HTTPS everywhere
- Input validation and sanitization

---

## Getting Started (For New Team Members)

1. **Access**: Get login credentials for staff account
2. **Training**: Practice on test customers first
3. **Daily Workflow**: Start with scan session, check follow-ups
4. **When in Doubt**: Check customer profile for complete history
5. **Support**: Contact technical team for issues or questions

---

## System Requirements

### For Staff Use
- Modern web browser (Chrome, Safari, Firefox, Edge)
- Internet connection
- Camera or smartphone (for scanning)
- Gmail account access (for email sending)

### Performance
- Fast load times (<3 seconds)
- Real-time updates
- Handles hundreds of customers
- Processes bulk scans efficiently

---

*Last Updated: December 13, 2024*
*Version: 2.0*

