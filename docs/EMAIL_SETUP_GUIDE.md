# 📧 Email Setup Guide - Nodemailer with Gmail

## Quick Summary

✅ **Nodemailer is installed and configured**  
✅ **Free to use** (nodemailer itself is free)  
✅ **Gmail SMTP** - 500 emails/day on free Gmail, 2,000/day on Google Workspace  
✅ **Auto-logging** - All emails logged to database  
✅ **Template support** - Use existing message templates with variable substitution  

---

## What Your Client Can Do

With nodemailer integrated, your client (MeiWay) can:

### 1. **Send Template-Based Emails**
- Use pre-configured bilingual templates (English/Chinese)
- Auto-fill customer details (name, mailbox, tracking number, etc.)
- One-click send notifications for:
  - New mail arrival
  - Pickup reminders
  - Final notices
  - Custom messages

### 2. **Send Custom Emails**
- Write one-off custom messages
- Send to any customer email
- Full control over subject and body

### 3. **Automatic Tracking**
- Every email automatically logged in the database
- View complete email history per customer
- Track follow-ups and responses

### 4. **Professional HTML Emails**
- Formatted, professional-looking emails
- Bilingual support (their existing templates)
- Plain text fallback for older email clients

---

## Setup Steps for MeiWay

### Step 1: Generate Gmail App Password

**Important:** You need an **App Password**, not the regular Gmail password.

1. Go to: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Enable **2-Step Verification** (if not already enabled)
4. Scroll down to **App passwords** (only appears after 2FA is on)
5. Click **App passwords**
6. Select:
   - App: **Mail**
   - Device: **Other** (type "MeiWay System")
7. Click **Generate**
8. Copy the **16-character password** (remove spaces)

### Step 2: Add Credentials to Backend

Edit `/backend/.env` and add these lines:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=meiway-business-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM_NAME=MeiWay Mail Service
```

**Replace:**
- `meiway-business-email@gmail.com` with their actual Gmail address
- `xxxx xxxx xxxx xxxx` with the 16-character App Password (no spaces)

### Step 3: Restart Backend Server

```bash
cd backend
npm run dev
```

You should see in the console:
```
✅ Email service ready to send messages
```

### Step 4: Test Email (Optional but Recommended)

Test sending an email to verify setup:

**Option A: Using curl**
```bash
curl "http://localhost:5000/api/emails/test?to=your-test-email@gmail.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Option B: Using the browser (once logged in)**
- Navigate to the frontend
- Open browser console
- Run:
```javascript
await api.emails.test('your-test-email@gmail.com')
```

If successful, you'll receive a test email! 🎉

---

## How to Use in the Application

### Method 1: Send with Template

From the frontend, call:

```javascript
import { api } from '@/lib/api-client';

// Send email using a template
await api.emails.sendWithTemplate({
  contact_id: 'contact-uuid-here',
  template_id: 'template-uuid-here',
  mail_item_id: 'mail-item-uuid-here', // optional
  message_type: 'Initial Notification',
  custom_variables: { // optional
    SPECIAL_NOTE: 'Package requires signature'
  }
});
```

**What happens:**
1. System fetches contact details (name, email, mailbox)
2. System fetches the template
3. Replaces all `{{VARIABLES}}` in template with actual values
4. Sends the email via Gmail
5. Logs the email in `outreach_messages` table
6. Returns success confirmation

### Method 2: Send Custom Email

```javascript
await api.emails.sendCustom({
  to: 'customer@example.com',
  subject: 'Important Notice',
  body: 'Hello,\n\nYour package is ready.\n\nBest,\nMeiWay',
  contact_id: 'contact-uuid', // optional
  mail_item_id: 'mail-uuid' // optional
});
```

---

## Template Variables Supported

When using templates, these variables are automatically replaced:

- `{{CUSTOMER_NAME}}` - Contact's name
- `{{MAILBOX_NUMBER}}` - Mailbox number
- `{{CONTACT_EMAIL}}` - Customer's email
- `{{MAIL_TYPE}}` - Type of mail (letter, package, etc.)
- `{{TRACKING_NUMBER}}` - Tracking number
- `{{RECEIVED_DATE}}` - Date received (formatted)
- `{{QUANTITY}}` - Number of items
- `{{STATUS}}` - Current status
- Any custom variables you pass in

### Example Template

**Subject:**
```
New Mail Arrived - Mailbox {{MAILBOX_NUMBER}}
```

**Body:**
```
Hi {{CUSTOMER_NAME}},

You have {{QUANTITY}} new {{MAIL_TYPE}} in mailbox {{MAILBOX_NUMBER}}.

Received Date: {{RECEIVED_DATE}}
Tracking Number: {{TRACKING_NUMBER}}

Please pick up at your earliest convenience.

Best regards,
MeiWay Mail Service
```

---

## Costs & Limits

### Nodemailer Library
- **Cost:** FREE (open-source MIT license)
- **Maintenance:** None needed

### Gmail SMTP Service

**Free Gmail Account:**
- **Cost:** FREE
- **Limit:** 500 emails per day
- **Good for:** Small to medium operations

**Google Workspace:**
- **Cost:** $6-18/month per user
- **Limit:** 2,000 emails per day
- **Good for:** High-volume operations

### Alternative Providers (if needed)

If Gmail limits are too restrictive:

| Provider | Free Tier | Cost After Free |
|----------|-----------|----------------|
| SendGrid | 100/day | $15/month for 40K |
| Mailgun | 10,000/month (3 mo) | $35/month for 50K |
| AWS SES | None | $0.10 per 1,000 emails |
| Resend | 100/day | $20/month for 50K |

---

## Security Notes

✅ **App Passwords** - More secure than regular passwords  
✅ **Environment Variables** - Credentials never in code  
✅ **Authentication Required** - All email endpoints require login  
✅ **Database Contacts Only** - Can only email customers in your system  
✅ **Audit Trail** - Every email logged with timestamp  

⚠️ **Keep `.env` file private** - Never commit to git (already in .gitignore)  
⚠️ **Backup App Password** - Store securely (can't view again after generation)  

---

## Troubleshooting

### "SMTP Connection Error"
**Fix:** 
1. Check that 2FA is enabled on Gmail
2. Verify you're using the App Password, not regular password
3. Ensure no typos in SMTP_USER or SMTP_PASS

### "Daily sending quota exceeded"
**Fix:**
- Free Gmail: Wait 24 hours (500/day limit)
- Or upgrade to Google Workspace (2,000/day)

### "Email not sending but no errors"
**Check:**
1. Is backend server running? (`npm run dev`)
2. Are SMTP variables set in `.env`?
3. Check backend console for logs
4. Try the test endpoint: `/api/emails/test`

### "Invalid login" or "Authentication failed"
**Fix:**
1. Regenerate App Password
2. Make sure to use the App Password, not Gmail password
3. Remove any spaces from the App Password
4. Double-check the email address is correct

---

## Next Steps

### Immediate
1. ✅ Generate Gmail App Password
2. ✅ Add credentials to `.env`
3. ✅ Restart backend
4. ✅ Test with test endpoint

### Future Enhancements
- [ ] Build "Send Email" UI in frontend (currently templates page exists)
- [ ] Add email template preview before sending
- [ ] Implement email queue for rate limiting
- [ ] Add attachment support (if needed)
- [ ] Schedule automated reminder emails
- [ ] Email analytics dashboard

---

## API Reference

### Send Email with Template
```
POST /api/emails/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "contact_id": "uuid",
  "template_id": "uuid",
  "mail_item_id": "uuid",      // optional
  "message_type": "string",     // optional
  "custom_variables": {}        // optional
}
```

### Send Custom Email
```
POST /api/emails/send-custom
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "email@example.com",
  "subject": "string",
  "body": "string",
  "contact_id": "uuid",         // optional
  "mail_item_id": "uuid"        // optional
}
```

### Test Email Configuration
```
GET /api/emails/test?to=test@example.com
Authorization: Bearer {token}
```

---

## Support

If you encounter any issues:
1. Check backend console logs for detailed errors
2. Verify `.env` configuration
3. Test with the `/api/emails/test` endpoint
4. Check Gmail account hasn't hit daily limits

For Gmail issues, refer to: https://support.google.com/mail/answer/7126229

---

**🎉 Setup Complete!**

The email system is now fully integrated and ready to use. MeiWay can start sending professional, bilingual email notifications to their customers directly from the web application!

