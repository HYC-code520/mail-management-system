# Technical Question: Nodemailer OAuth2 SMTP vs Gmail API

**Context:** We implemented OAuth2 Gmail integration for our mail management system, but encountered authentication errors. We switched from Nodemailer+SMTP+OAuth2 to Gmail API. I want to verify this was the right approach.

---

## What We Tried First (Recommended by Coaches)

**Nodemailer with OAuth2 via SMTP:**

```javascript
// Method 1: Nodemailer + OAuth2 + SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: gmailAddress,
    accessToken: accessToken
  }
});
```

**Error we got:**
```
❌ Email send error: Error: Invalid login: 535-5.7.8 Username and Password not accepted
responseCode: 535,
command: 'AUTH XOAUTH2'
```

**What we tried to fix it:**
- ✅ Published OAuth app (moved from "Testing" to "In production")
- ✅ Disconnected and reconnected Gmail
- ✅ Got fresh OAuth2 tokens
- ✅ Verified scopes include `gmail.send`
- ❌ Still got same error

---

## What We Switched To

**Gmail API (Direct):**

```javascript
// Method 2: Gmail API with OAuth2
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const res = await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

**Result:** ✅ Working (need to test)

---

## My Questions for Coach:

### 1. Why did Nodemailer + OAuth2 + SMTP fail?

**My research found:**
- Error code `535-5.7.8` is Gmail's "OAuth2 SMTP authentication blocked" error
- Gmail blocks SMTP authentication with OAuth2 for apps that aren't fully verified by Google
- Full verification requires Google security review (can take weeks/months)
- Even in "In production" mode, SMTP + OAuth2 is restricted

**Sources:**
- Google Gmail API docs: https://developers.google.com/gmail/api/guides/sending
- Nodemailer docs warn about OAuth2 + SMTP restrictions
- Stack Overflow threads about this exact error code

**Question:** Is this understanding correct? Or did we misconfigure something?

---

### 2. When should we use Nodemailer vs Gmail API?

**My understanding:**

| Method | Best For | Pros | Cons |
|--------|---------|------|------|
| **Nodemailer + SMTP + App Password** | Simple internal tools | Easy setup, works immediately | Requires 2FA, stores password |
| **Nodemailer + SMTP + OAuth2** | ??? | Should be more secure | Gmail blocks for unverified apps |
| **Gmail API + OAuth2** | Production apps with OAuth2 | No SMTP restrictions, most secure | More code, API knowledge needed |

**Question:** When should we actually use Nodemailer + OAuth2 + SMTP? Is it only for Google Workspace Enterprise apps? Or apps that completed Google's verification process?

---

### 3. Why did two technical coaches recommend Nodemailer?

**My theory:**
- They recommended Nodemailer + SMTP + **App Password** (Method 1)
- This works great and is simpler than Gmail API
- We misunderstood and tried Nodemailer + SMTP + **OAuth2** (Method 1.5)
- Which led us to the Gmail block issue

**Question:** Is this the likely misunderstanding? Or is Nodemailer + OAuth2 + SMTP supposed to work easily?

---

### 4. Is Gmail API + OAuth2 production-ready and secure?

**My research:**
- Gmail API is Google's official/recommended method for OAuth2
- More secure than SMTP (no protocol vulnerabilities)
- Used by major apps (Superhuman, Front, etc.)
- Requires same OAuth2 scopes (`gmail.send`)

**Question:** Any downsides to using Gmail API we should know about? Rate limits? Deliverability? Cost?

---

## Code Comparison

### Nodemailer Approach (Not Working for Us):

```javascript
// backend/src/services/email.service.js
const oauth2Client = await getValidOAuthClient(userId);
const accessToken = oauth2Client.credentials.access_token;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: gmailAddress,
    accessToken: accessToken
  }
});

await transporter.sendMail({
  from: `"MeiWay Mail" <${gmailAddress}>`,
  to: to,
  subject: subject,
  html: htmlContent
});
```

**Error:** `535-5.7.8 Username and Password not accepted` + `AUTH XOAUTH2`

---

### Gmail API Approach (Our Current Solution):

```javascript
// backend/src/services/email.service.js
const oauth2Client = await getValidOAuthClient(userId);
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Encode email in RFC 2822 format
const message = [
  `From: "${process.env.SMTP_FROM_NAME}" <${gmailAddress}>`,
  `To: ${to}`,
  `Subject: ${subject}`,
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=utf-8',
  '',
  htmlContent
].join('\n');

const encodedMessage = Buffer.from(message)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: encodedMessage },
});
```

**Result:** Should work (bypasses SMTP entirely)

---

## What I Need from Coach:

1. ✅ Confirm my understanding is correct (or point out what I got wrong)
2. ✅ Verify Gmail API approach is production-ready for our use case
3. ✅ Clarify when Nodemailer + OAuth2 + SMTP actually works
4. ✅ Any security concerns with our implementation?

---

## Our Use Case

- **App:** Internal mail management system for MeiWay Business
- **Users:** ~3-5 internal staff members
- **Volume:** ~50-100 emails/day
- **Flow:** User connects their Gmail via OAuth2 → App sends emails on their behalf
- **Current status:** OAuth app published (not verified by Google yet)

---

## Timeline

- **Day 1:** Implemented Nodemailer + SMTP + OAuth2 (based on coach recommendation)
- **Day 2:** Hit `535-5.7.8` error repeatedly
- **Day 3:** Published OAuth app, still failed
- **Day 4:** Switched to Gmail API (current)

---

## Additional Context

**Our OAuth2 Setup:**
- Google Cloud Project: "MeiWay Mail System"
- OAuth Consent Screen: "In production" (not verified)
- Scopes: `gmail.send`, `userinfo.email`
- Test users: 3 (including business Gmail account)

**Our Environment:**
- Node.js 18.20.8
- `googleapis` ^140.0.1
- `nodemailer` ^7.0.11
- Backend: Express.js
- Database: Supabase (stores OAuth tokens)

---

## My Current Conclusion

**Gmail API + OAuth2 is the right approach for our use case because:**
1. Bypasses Gmail's SMTP + OAuth2 restrictions
2. Officially recommended by Google for OAuth2 apps
3. More secure (no SMTP protocol vulnerabilities)
4. Works without Google verification (which could take months)

**Nodemailer + SMTP + App Password would also work, but:**
- Requires storing a password (less secure)
- Requires 2FA on business Gmail account
- Less flexible (can't send from user's personal Gmail)

**Am I thinking about this correctly?**

---

## References

- Gmail API Send Documentation: https://developers.google.com/gmail/api/guides/sending
- Nodemailer OAuth2: https://nodemailer.com/smtp/oauth2/
- Error 535-5.7.8: https://support.google.com/mail/answer/14257
- Our implementation: `backend/src/services/email.service.js`

---

**Prepared by:** Butter Chen  
**Date:** December 1, 2025  
**Project:** MeiWay Mail Management System



