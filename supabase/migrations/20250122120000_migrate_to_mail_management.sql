-- ##############################################################
-- ##  MIGRATION: Stripe to Mail Management System          ##
-- ##############################################################
-- This migration cleans up the unused Stripe tables and adds
-- the mail management system tables that are actually used by the app.

-- ##############################################################
-- ##           STEP 1: DROP UNUSED STRIPE TABLES            ##
-- ##############################################################

-- Drop Stripe-related tables (safe - checks IF EXISTS)
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop Stripe-related types
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS pricing_plan_interval CASCADE;
DROP TYPE IF EXISTS pricing_type CASCADE;

-- Clean up users table (remove Stripe billing fields)
ALTER TABLE users DROP COLUMN IF EXISTS billing_address;
ALTER TABLE users DROP COLUMN IF EXISTS payment_method;

-- ##############################################################
-- ##        STEP 2: CREATE MAIL MANAGEMENT TABLES           ##
-- ##############################################################

-- Contacts table (customer/client information)
CREATE TABLE IF NOT EXISTS contacts (
    contact_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name        TEXT,
    unit_number         TEXT,  -- Mailbox/Unit identifier (e.g., F14-F15, F17, C8)
    contact_person      TEXT,  -- Primary contact name
    language_preference TEXT,  -- e.g., English, Mandarin, English/Mandarin
    email               TEXT,
    phone_number        TEXT,
    service_tier        INTEGER, -- 1, 2, etc.
    options             TEXT,  -- Special notes like "*High Volume"
    mailbox_number      TEXT,  -- Physical mailbox assignment (e.g., D1, D2, D3)
    status              TEXT DEFAULT 'PENDING', -- Active, PENDING, No
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Mail items table (individual mail/package tracking)
CREATE TABLE IF NOT EXISTS mail_items (
    mail_item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id          UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    item_type           TEXT DEFAULT 'Package', -- Package, Letter, Certified Mail, etc.
    description         TEXT, -- Brief note about the item
    received_date       TIMESTAMPTZ DEFAULT NOW(),
    status              TEXT DEFAULT 'Received', -- Received, Notified, Picked Up, Returned
    pickup_date         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach messages table (communication tracking)
CREATE TABLE IF NOT EXISTS outreach_messages (
    message_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_item_id        UUID REFERENCES mail_items(mail_item_id) ON DELETE CASCADE,
    contact_id          UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    message_type        TEXT, -- Initial Notification, Reminder, Pickup Confirmed
    channel             TEXT, -- Email, SMS, WeChat, Phone
    message_content     TEXT, -- The actual message sent
    sent_at             TIMESTAMPTZ DEFAULT NOW(),
    responded           BOOLEAN NOT NULL DEFAULT FALSE,
    response_date       TIMESTAMPTZ,
    follow_up_needed    BOOLEAN DEFAULT TRUE,
    follow_up_date      TIMESTAMPTZ, -- Auto-set to 24-48h after sent_at
    notes               TEXT
);

-- Message templates table (reusable message templates)
CREATE TABLE IF NOT EXISTS message_templates (
    template_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    template_name       TEXT NOT NULL, -- e.g., "Mail Received", "Pickup Reminder", "Pickup Confirmed"
    template_type       TEXT NOT NULL, -- Initial, Reminder, Confirmation, Custom
    subject_line        TEXT, -- For emails
    message_body        TEXT NOT NULL, -- Can include {{variables}} like {{contact_name}}, {{item_type}}
    default_channel     TEXT DEFAULT 'Email', -- Email, SMS, Both
    is_default          BOOLEAN DEFAULT FALSE, -- System default templates
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ##############################################################
-- ##          STEP 3: ENABLE ROW LEVEL SECURITY             ##
-- ##############################################################

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ##############################################################
-- ##              STEP 4: CREATE POLICIES                   ##
-- ##############################################################

-- Contacts policies (users can only manage their own contacts)
DROP POLICY IF EXISTS "Users can manage their own contacts." ON contacts;
CREATE POLICY "Users can manage their own contacts." ON contacts
    FOR ALL USING (auth.uid() = user_id);

-- Mail items policies (users can only manage mail for their contacts)
DROP POLICY IF EXISTS "Users can manage mail items for their contacts." ON mail_items;
CREATE POLICY "Users can manage mail items for their contacts." ON mail_items
    FOR ALL USING (auth.uid() = (SELECT user_id FROM contacts WHERE contacts.contact_id = mail_items.contact_id));

-- Outreach messages policies (users can only manage outreach for their contacts)
DROP POLICY IF EXISTS "Users can manage outreach for their contacts." ON outreach_messages;
CREATE POLICY "Users can manage outreach for their contacts." ON outreach_messages
    FOR ALL USING (auth.uid() = (SELECT contacts.user_id FROM contacts WHERE contacts.contact_id = outreach_messages.contact_id));

-- Message templates policies (users can manage their own templates + see defaults)
DROP POLICY IF EXISTS "Users can manage their templates." ON message_templates;
CREATE POLICY "Users can manage their templates." ON message_templates
    FOR ALL USING (auth.uid() = user_id OR is_default = TRUE);

-- ##############################################################
-- ##            STEP 5: UPDATE REALTIME PUBLICATION         ##
-- ##############################################################

-- Drop old publication and recreate with correct tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE contacts, mail_items, outreach_messages, message_templates;

-- ##############################################################
-- ##          STEP 6: INSERT DEFAULT TEMPLATES              ##
-- ##############################################################

-- Insert default message templates (only if they don't exist)
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, default_channel, is_default)
SELECT * FROM (VALUES
    (
        'New Mail Notification',
        'Initial',
        'New Mail Received at Mei Way Mail Plus',
        'Hello {Name},

You have new mail waiting for you at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Type: {Type}
Date Received: {Date}

Please collect at your earliest convenience during business hours.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好，

您在美威邮件中心有新邮件等待领取。

邮箱号：{BoxNumber}
类型：{Type}
收件日期：{Date}

请在营业时间内尽快领取。

此致
美威邮件团队',
        'Both',
        TRUE
    ),
    (
        'Reminder (Uncollected Mail)',
        'Reminder',
        'Reminder: Uncollected Mail - Mei Way Mail Plus',
        'Dear {Name},

This is a friendly reminder that you have uncollected mail at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Type: {Type}
Waiting since: {Date}

Please collect your mail during business hours: Mon-Fri 9AM-5PM.

Thank you,
Mei Way Mail Plus

---

亲爱的 {Name}，

这是一封友好提醒，您在美威邮件中心有未领取的邮件。

邮箱号：{BoxNumber}
类型：{Type}
等待领取时间：{Date}

请在营业时间内领取您的邮件：周一至周五 上午9点至下午5点。

谢谢
美威邮件中心',
        'Both',
        TRUE
    ),
    (
        'Final Notice (After 1 Week)',
        'Reminder',
        'Final Notice: Uncollected Mail - Storage Fee Applies',
        'FINAL NOTICE

Dear {Name},

Your mail has been waiting at Mei Way Mail Plus for over one week.

Mailbox: {BoxNumber}
Received: {Date}

Please collect immediately. Uncollected items may be returned to sender or disposed of according to our policy.

Contact us if you need assistance.

Mei Way Mail Plus
Phone: (555) 123-4567

---

最后通知

{Name} 您好，

您的邮件已在美威邮件中心等待超过一周。

邮箱号：{BoxNumber}
收件日期：{Date}

请立即领取。根据我们的政策，未领取的物品可能会被退回或处理。

如需帮助，请联系我们。

美威邮件中心
电话：(555) 123-4567',
        'Both',
        TRUE
    )
) AS v(template_name, template_type, subject_line, message_body, default_channel, is_default)
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE template_name = v.template_name
);

-- ##############################################################
-- ##                   MIGRATION COMPLETE                   ##
-- ##############################################################

-- ✅ Removed unused Stripe tables
-- ✅ Created mail management system tables
-- ✅ Enabled RLS on all tables
-- ✅ Created proper security policies
-- ✅ Updated realtime subscriptions
-- ✅ Added default message templates


