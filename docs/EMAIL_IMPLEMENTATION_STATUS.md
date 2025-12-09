# 📧 Email Implementation Status - Gmail REST API

**Last Updated:** December 9, 2025

## Current Implementation

### ✅ Primary Method: Gmail REST API (OAuth2)

**What we use:** `gmail.users.messages.send()` via googleapis package

**Why Gmail REST API?**
- ✅ No Google verification required
- ✅ No OAuth2 SMTP authentication blocks
- ✅ More reliable and officially supported
- ✅ Per-user sending with OAuth2
- ✅ Automatic token refresh

**Files:**
- `backend/src/services/email.service.js` - `sendEmailWithGmailApi()` function
- `backend/src/services/oauth2.service.js` - OAuth2 token management
- `backend/src/controllers/oauth.controller.js` - OAuth2 flow

**Tests:**
- `backend/src/__tests__/email-gmail-api.test.js` - 7 tests
- `backend/src/__tests__/email-template-variables.test.js` - 12 tests
- All 19 tests passing ✅

---

### ⚠️ Fallback Method: SMTP with App Password

**What we use:** nodemailer with SMTP only (NOT OAuth2 SMTP)

**When it's used:**
- User hasn't connected Gmail via OAuth2
- Gmail REST API fails for any reason
- Testing/development without OAuth2

**Important:** We do NOT use nodemailer with OAuth2 SMTP. That causes error 535-5.7.8 (Google blocks it).

---

## Why NOT Nodemailer OAuth2 SMTP?

**Error:** `535-5.7.8 Username and Password not accepted`

**Root Cause:** Google blocks OAuth2 SMTP for unverified apps

**What we tried (that didn't work):**
- ✅ Published OAuth app ("In production" mode)
- ✅ Disconnected/reconnected Gmail
- ✅ Added `clientId`, `clientSecret`, `refreshToken` to nodemailer
- ❌ All still failed with 535-5.7.8

**Solution:** Use Gmail REST API instead (implemented ✅)

**Documentation:** See `log.md` Error #31 for full details

---

## How Email Sending Works

### Flow:

```
User clicks "Send Email"
    ↓
Frontend calls `/api/emails/send`
    ↓
Backend checks if user has connected Gmail
    ↓
If YES → Use Gmail REST API (gmail.users.messages.send) ✅
    ↓
If NO → Fall back to SMTP (App Password)
    ↓
Email sent & logged to database
```

### Code Path:

```javascript
// 1. Email Controller (backend/src/controllers/email.controller.js)
sendNotificationEmail(req, res) {
  // ... fetch contact, template, etc.
  
  await sendTemplateEmail({
    to: contact.email,
    templateSubject: template.subject_line,
    templateBody: template.message_body,
    variables: { Name, BoxNumber, etc. },
    userId: req.user.id // ← This triggers Gmail API
  });
}

// 2. Email Service (backend/src/services/email.service.js)
async function sendTemplateEmail({ to, templateSubject, templateBody, variables, userId }) {
  // Replace {VAR} and {{VAR}} placeholders
  // ...
  
  return sendEmail({
    to,
    subject,
    htmlContent,
    userId // ← This triggers Gmail API
  });
}

// 3. Send Email Function
async function sendEmail({ to, subject, htmlContent, userId }) {
  if (userId) {
    try {
      // ✅ PRIMARY: Gmail REST API
      return await sendEmailWithGmailApi(userId, to, subject, htmlContent);
    } catch (error) {
      // Falls through to SMTP fallback
    }
  }
  
  // ⚠️ FALLBACK: SMTP with App Password
  // (only if Gmail API not available)
}

// 4. Gmail API Function
async function sendEmailWithGmailApi(userId, to, subject, htmlContent) {
  const oauth2Client = await getValidOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  // Encode email in RFC 2822 format
  const message = [...].join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // ✅ Send via Gmail REST API
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });
}
```

---

## Template Variable Formats

**Both formats work:**
- Single braces: `{Name}`, `{BoxNumber}`, `{LetterCount}`
- Double braces: `{{Name}}`, `{{BoxNumber}}`, `{{LetterCount}}`

**Why both?** Historical inconsistency in templates. We support both to avoid breaking existing templates.

**Test coverage:** 12 tests in `email-template-variables.test.js`

---

## Common Issues & Solutions

### Issue: "Gmail disconnected" error

**Cause:** OAuth2 tokens expired or invalid

**Solution:**
1. Go to Settings
2. Click "Disconnect Gmail"
3. Click "Connect Gmail"
4. Authorize with Google

### Issue: Placeholders not replaced ({Name} shows literally)

**Cause:** Template replacement logic not working

**Solution:** Already fixed! We now support both `{VAR}` and `{{VAR}}` formats.

**Related:** See `log.md` Error #32

### Issue: Error 535-5.7.8 (OAuth2 SMTP blocked)

**Cause:** Trying to use nodemailer with OAuth2 SMTP

**Solution:** We already switched to Gmail REST API. If you see this error, something regressed.

**Prevention:** See tests in `email-gmail-api.test.js` - "Regression Prevention" section

---

## Testing

### Run Email Tests:

```bash
cd backend

# Gmail API tests
npm test -- email-gmail-api.test.js

# Template variable tests
npm test -- email-template-variables.test.js

# All email tests
npm test -- email
```

### Manual Testing:

1. **Connect Gmail:**
   - Go to Settings → Connect Gmail
   - Authorize with Google
   - Should see "Gmail Connected" with email address

2. **Send Test Email:**
   - Go to Mail Log or Contacts
   - Click "Send Email" on any contact
   - Select template
   - Click "Send"
   - Check email inbox

3. **Verify in Logs:**
   ```bash
   tail -f backend/logs/app.log
   # Should see: "📧 Using Gmail API to send email"
   # Should see: "✅ Email sent via Gmail API"
   ```

---

## Future: Can We Use Nodemailer?

**Short answer:** We already do! (For SMTP fallback only)

**For OAuth2 sending:** No, stick with Gmail REST API

**Why?**
- Nodemailer OAuth2 SMTP requires Google verification (weeks/months)
- Gmail REST API works immediately, no verification needed
- We already have it working perfectly

**If you need SMTP OAuth2 in the future:**
1. Submit app for Google security review
2. Wait for verification (can take months)
3. Update `backend/src/services/email.service.js`
4. Add tests to ensure it doesn't break Gmail REST API

**Recommendation:** Don't bother. Gmail REST API works great.

---

## Documentation Index

- **Setup:** `docs/OAUTH2_SETUP_GUIDE.md`
- **Error Logs:** `log.md` (Error #31, #32)
- **Backend README:** `backend/README.md`
- **This File:** Current implementation status
- **Historical:** `docs/TECHNICAL_QUESTION_FOR_COACH.md` (resolved)
- **Old Summary:** `docs/NODEMAILER_SUMMARY.md` (updated with warnings)

---

## Summary

✅ **Using:** Gmail REST API for OAuth2 email sending  
✅ **Fallback:** Nodemailer SMTP with App Password  
❌ **Not Using:** Nodemailer OAuth2 SMTP (blocked by Google)  
✅ **Tests:** 19 comprehensive tests, all passing  
✅ **Status:** Production ready

**Questions?** See `log.md` Error #31 and #32 for full history.

