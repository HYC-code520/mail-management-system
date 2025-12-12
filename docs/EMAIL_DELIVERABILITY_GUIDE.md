# Email Deliverability Guide - Avoiding Spam Folder

Your emails are showing in Gmail "Sent" folder but going to recipient spam. This guide helps fix that.

## Current Status ✅

**What's Already Good:**
- ✅ Using Gmail API (better than SMTP)
- ✅ Emails are successfully sent and logged
- ✅ Template content is professional (bilingual Chinese/English)
- ✅ Now includes professional footer with business info
- ✅ Reply-To header added

## Why Emails Go to Spam (Most Common Causes)

### 1. **Missing Email Authentication Records** ⚠️ (MOST LIKELY)
Your domain (e.g., `@yourcompany.com`) needs to authorize Gmail to send on its behalf.

**Problem:** If you're sending from `yourname@gmail.com`, recipients see:
- "via gmail.com" warning
- "This email may not be from a verified sender"

**Solution:**
- **Option A (Recommended):** Use a custom domain email (`noreply@meiwaymail.com`)
  - Set up SPF, DKIM, and DMARC records in your domain's DNS
  - See "Setting Up Custom Domain" section below

- **Option B (Quick Fix):** Continue with Gmail but build reputation
  - Send smaller volumes initially (10-20/day)
  - Gradually increase over 2-3 weeks
  - Ask recipients to mark as "Not Spam"

### 2. **New Sender Reputation**
- Gmail account sending automated emails has low reputation score
- First 100-200 emails often land in spam until reputation builds

**Solution:**
- **Warm up** your Gmail account: Start with 10-20 emails/day
- Ask first recipients to mark as "Not Spam" and reply (even just "Thanks")
- Increase volume slowly: 10 → 20 → 50 → 100 over 2 weeks

### 3. **Subject Line Triggers**
Certain words/phrases trigger spam filters:

**Avoid:**
- ALL CAPS WORDS (use: "Final Notice" not "FINAL NOTICE")
- Multiple !!! exclamation marks
- "URGENT", "ACT NOW", "FREE", "WINNER"
- Dollar signs without context: "$$$"

**Better Alternatives:**
- ❌ "FINAL NOTICE - URGENT ACTION REQUIRED!!!"
- ✅ "Important: Final Notice for Package Pickup"

### 4. **Email Content Issues**

**What Triggers Spam:**
- No physical address or contact info → ✅ **FIXED** (footer added)
- Too many links or shortened URLs
- Large images or attachments
- Inconsistent formatting
- No unsubscribe option (for marketing emails)

**What Helps:**
- Plain, professional language → ✅ You have this
- Bilingual content → ✅ You have this (actually helps!)
- Clear sender identity → ✅ You have this
- Footer with business address → ✅ Just added

## Quick Fixes (Implemented ✅)

### 1. Professional Email Footer
We've added a footer with:
- Business name and address
- Phone and email
- Disclaimer about automated notification

**You need to update** `/backend/.env` with your real business info:

```bash
# Add these to your .env file:
BUSINESS_NAME=Mei Way Mail Plus
BUSINESS_ADDRESS=123 Main Street, New York, NY 10001
BUSINESS_PHONE=(555) 123-4567
BUSINESS_EMAIL=info@meiwaymail.com
```

### 2. Reply-To Header
Added `Reply-To` header to improve spam score.

## Recommended Actions (Priority Order)

### Priority 1: Ask Recipients to Mark as "Not Spam" 🔥
**This is the fastest fix!**

1. Call or text your first 5-10 customers
2. Ask them to:
   - Check spam folder
   - Mark email as "Not Spam"
   - Add `yourname@gmail.com` to contacts
   - Optionally reply with "Thanks" (builds reputation)

### Priority 2: Update Email Templates (Optional)
Consider softening "FINAL NOTICE" language:

**Current:**
```
Subject: FINAL NOTICE - Package Abandonment Warning - {Name}
```

**Suggested:**
```
Subject: Important Notice: Package Pickup Required - {Name}
```

### Priority 3: Set Up Custom Domain Email (Long-term)
This is the **best long-term solution** but requires technical setup.

#### Steps:
1. **Get a domain** (e.g., `meiwaymail.com`) if you don't have one
   - Costs ~$10-15/year

2. **Set up Google Workspace** or similar
   - ~$6/month for business email
   - Get `noreply@meiwaymail.com`

3. **Add DNS Records** (in your domain registrar)
   ```
   SPF Record:
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.google.com ~all

   DKIM Record: (Google Workspace provides this)
   Type: TXT
   Name: google._domainkey
   Value: [Provided by Google]

   DMARC Record:
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@meiwaymail.com
   ```

4. **Update Gmail API OAuth** to use custom domain email

### Priority 4: Monitor Email Reputation
Use these free tools:
- **Google Postmaster Tools**: https://postmaster.google.com
- **Mail Tester**: https://www.mail-tester.com (test your email score)
- **MX Toolbox**: https://mxtoolbox.com/deliverability

## Testing Your Emails

### Use Mail-Tester.com
1. Go to https://www.mail-tester.com
2. Copy the test email address they provide
3. In your app, send a notification to that test address
4. Check your score (aim for 8/10 or higher)

### Common Issues Mail-Tester Shows:
- "SPF not set up" → Need custom domain
- "No DKIM signature" → Need custom domain
- "Reverse DNS does not match" → Normal for Gmail (ignore)
- "No List-Unsubscribe header" → Only needed for marketing emails

## Short-term Workarounds

While you build reputation or set up custom domain:

### 1. **Send Test Email to Yourself**
Send to your own Gmail, Yahoo, and Outlook accounts to see where they land.

### 2. **Personal Outreach for First 20 Customers**
- Send emails manually from Gmail for first batch
- Ask them to add you to contacts
- Then switch to automated system

### 3. **Reduce Email Frequency**
- Don't send multiple emails to same person in one day
- Space out reminders by 2-3 days

### 4. **Include Call to Action**
Ask customers to reply (increases engagement score):
```
Please reply to this email if you have any questions or need special pickup arrangements.
```

## What to Update in Your Templates

1. **Remove ALL CAPS from subject lines**
2. **Add a soft CTA** (call to action)
3. **Update footer placeholders** with real address

I'll help you update these - want me to do that now?

## Checking If It's Working

After implementing fixes, monitor:
- Ask 2-3 customers: "Did my email land in inbox or spam?"
- Check Gmail "Sent" folder for bounce-backs
- Use Mail-Tester.com weekly
- Watch for "undeliverable" errors in your app logs

## Expected Timeline

- **Immediate (Today)**: Add recipients to "Not Spam" → 50% improvement
- **Week 1**: Send lower volume, build reputation → 70% inbox rate
- **Week 2-3**: Continued sending → 85% inbox rate
- **Month 1+**: With custom domain + reputation → 95%+ inbox rate

## Need Help?

If emails still going to spam after 1 week:
1. Run Mail-Tester.com and send me the report
2. Check if recipients have strict corporate email filters
3. Consider professional email deliverability service (e.g., SendGrid, AWS SES)

---

**Bottom Line:** Your code is good! This is a **sender reputation issue**, not a technical bug. The fastest fix is asking recipients to mark as "Not Spam" while you build reputation over the next 2 weeks.


