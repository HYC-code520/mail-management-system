# Backend API - Mail Management System

Express.js backend API for the Mail Management System with email notification support (SMTP + OAuth2).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `env.example` to `.env` and fill in your values:
```bash
cp env.example .env
```

3. Update `.env` with your credentials:
   - Supabase credentials from the main project's `.env.local`
   - Choose email method: SMTP (App Password) OR OAuth2 (see below)

## Email Configuration

This system supports **TWO** methods for sending emails:

1. **SMTP with App Password** - Simple, single business account
2. **OAuth2** - More secure, per-user sending, no 2FA required

You can use either method OR both (OAuth2 with SMTP fallback).

---

### Method 1: SMTP (App Password) - Simple Setup

**Best for:** Single business Gmail account, quick setup

#### Step 1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password (no spaces)

#### Step 2: Configure .env

Add these variables to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_NAME=MeiWay Mail Service
```

**Important Notes:**
- Use the **App Password**, NOT your regular Gmail password
- Free Gmail accounts: 500 emails/day limit
- Google Workspace: 2,000 emails/day limit
- Email service will gracefully fail if credentials are missing

---

### Method 2: OAuth2 - Secure, No 2FA Required

**Best for:** Multiple users, each using their own Gmail, more secure

#### Quick Setup (15 minutes)

1. **Google Cloud Console Setup:**
   - Create project & enable Gmail API
   - Create OAuth2 credentials
   - Get Client ID & Secret

2. **Add to `.env`:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/gmail/callback
   FRONTEND_URL=http://localhost:3000
   ```

3. **Run Migration:**
   ```bash
   npx supabase migration up --local
   ```

4. **Build Frontend UI** (optional - see guide)

**Full OAuth2 Setup Guide:** `/docs/OAUTH2_SETUP_GUIDE.md`

#### OAuth2 Benefits:
- ✅ No 2FA requirement
- ✅ No password storage
- ✅ Per-user Gmail sending
- ✅ Revocable access
- ✅ Automatic token refresh

---

### Hybrid Approach (Recommended!)

Configure **both** methods:
- SMTP as fallback
- OAuth2 for users who connect Gmail
- System intelligently uses OAuth2 if available, falls back to SMTP

```env
# SMTP (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=business@gmail.com
SMTP_PASS=app-password

# OAuth2 (Primary)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/gmail/callback
FRONTEND_URL=http://localhost:3000
```

### Step 3: Test Email Configuration

Once the server is running, test your email setup:

```bash
curl "http://localhost:5000/api/emails/test?to=your-test-email@gmail.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Development

Run the development server with auto-reload:
```bash
npm run dev
```

Server will start on http://localhost:5000

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### Contacts (All require authentication)
- `GET /api/contacts` - List all contacts (with optional filters)
- `POST /api/contacts` - Create new contact
- `GET /api/contacts/:id` - Get single contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Soft delete contact

### Mail Items
- `GET /api/mail-items` - List all mail items
- `POST /api/mail-items` - Create new mail item
- `GET /api/mail-items/:id` - Get single mail item
- `PUT /api/mail-items/:id` - Update mail item
- `DELETE /api/mail-items/:id` - Delete mail item

### Templates
- `GET /api/templates` - List all message templates
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Emails
- `POST /api/emails/send` - Send email using template with variable substitution
- `POST /api/emails/send-custom` - Send custom email
- `GET /api/emails/test` - Test email configuration

**Note:** Email endpoints automatically use OAuth2 if user has connected Gmail, otherwise falls back to SMTP.

### OAuth2 (Gmail Connection)
- `GET /api/oauth/gmail/auth-url` - Get OAuth2 authorization URL
- `GET /api/oauth/gmail/callback` - Handle OAuth2 callback from Google
- `GET /api/oauth/gmail/status` - Check if user has connected Gmail
- `POST /api/oauth/gmail/disconnect` - Disconnect Gmail (revoke tokens)

#### Send Email with Template

```bash
curl -X POST http://localhost:5000/api/emails/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "template_id": "uuid-here",
    "mail_item_id": "uuid-here",
    "message_type": "Initial Notification",
    "custom_variables": {
      "SPECIAL_NOTE": "Your package requires signature"
    }
  }'
```

**Template Variable Substitution:**
- `{{CUSTOMER_NAME}}` - Contact's name
- `{{MAILBOX_NUMBER}}` - Mailbox number
- `{{MAIL_TYPE}}` - Type of mail item
- `{{TRACKING_NUMBER}}` - Tracking number
- `{{RECEIVED_DATE}}` - Date received (formatted)
- `{{QUANTITY}}` - Number of items
- Any custom variables you pass in `custom_variables`

#### Send Custom Email

```bash
curl -X POST http://localhost:5000/api/emails/send-custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "subject": "Important Notice",
    "body": "Hello,\n\nThis is a custom message.\n\nBest regards,\nMeiWay",
    "contact_id": "uuid-here",
    "mail_item_id": "uuid-here"
  }'
```

### Notifications
- `GET /api/notifications/mail-item/:mailItemId` - Get notifications for mail item
- `GET /api/notifications/contact/:contactId` - Get notifications for contact
- `POST /api/notifications` - Create notification record
- `POST /api/notifications/quick-notify` - Quick notify shortcut

### Outreach Messages
- `GET /api/outreach-messages` - List all outreach messages
- `POST /api/outreach-messages` - Create outreach message record

### Action History
- `GET /api/action-history/:mailItemId` - Get action history for mail item
- `POST /api/action-history` - Create action history entry
- `POST /api/action-history/bulk` - Create multiple action history entries

### Authentication

All API routes (except `/health`) require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

## Testing

Test the health endpoint:
```bash
curl http://localhost:5000/health
```

Test contacts endpoint (requires token):
```bash
curl http://localhost:5000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Automated Tests

Run the test suite:
```bash
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Business logic
│   │   ├── contacts.controller.js
│   │   ├── mailItems.controller.js
│   │   ├── templates.controller.js
│   │   ├── notifications.controller.js
│   │   ├── outreachMessages.controller.js
│   │   ├── actionHistory.controller.js
│   │   └── email.controller.js     # NEW: Email sending
│   ├── middleware/       # Auth, error handling
│   ├── routes/          # API route definitions
│   │   └── email.routes.js         # NEW: Email routes
│   ├── services/        # External services
│   │   ├── supabase.service.js
│   │   └── email.service.js        # NEW: Nodemailer service
│   └── server.js        # Express app entry point
├── .env                 # Environment variables (not in git)
├── env.example          # Example environment variables
└── package.json
```

## Email Features

### What's Included

✅ **Nodemailer Integration** - Gmail SMTP support  
✅ **Template System** - Use message templates with variable substitution  
✅ **Custom Emails** - Send one-off custom messages  
✅ **Auto-logging** - All emails logged to `outreach_messages` table  
✅ **Bilingual Support** - Templates can be in English or Chinese  
✅ **HTML Emails** - Professional formatted emails  
✅ **Test Endpoint** - Verify email configuration  

### Rate Limits

- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2,000 emails/day

The system does not enforce rate limiting - Gmail will reject emails over the limit.

### Security

- SMTP credentials stored in `.env` (not committed to git)
- Use App Passwords instead of real passwords
- All email endpoints require authentication
- Emails are only sent to contacts in your database

## Troubleshooting

### Email not sending?

1. Check `.env` has correct SMTP credentials
2. Verify you're using an **App Password**, not regular password
3. Ensure 2FA is enabled on Gmail account
4. Check the server logs for detailed error messages
5. Test with: `GET /api/emails/test?to=your-email@gmail.com`

### "SMTP Connection Error"?

- Verify `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`
- Check if your network/firewall blocks port 587
- Ensure the Gmail account is accessible

### "Daily sending quota exceeded"?

- Free Gmail: 500 emails/day limit reached
- Wait 24 hours or upgrade to Google Workspace

## Next Steps

- [x] Email notification system with nodemailer
- [ ] Add input validation (Zod)
- [ ] Enhanced error handling
- [ ] Deploy to production
- [ ] Email queue for rate limiting
- [ ] Email templates in database (already supported!)


