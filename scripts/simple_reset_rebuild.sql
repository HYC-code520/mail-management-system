-- ##############################################################
-- ##     MAIL MANAGEMENT SYSTEM - DATABASE RESET & REBUILD  ##
-- ##############################################################
-- Clean, focused schema for mail management (no Stripe bloat)

-- ##############################################################
-- ##                    STEP 1: CLEAN RESET                 ##
-- ##############################################################

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS outreach_messages CASCADE;
DROP TABLE IF EXISTS mail_items CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop publication
DROP PUBLICATION IF EXISTS supabase_realtime;

-- ##############################################################
-- ##                 STEP 2: CREATE USER TABLE              ##
-- ##############################################################

-- Users table (core user profiles)
CREATE TABLE users (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ##############################################################
-- ##                   STEP 3: CREATE CRM TABLES            ##
-- ##############################################################

-- Contacts table (customer/client information)
CREATE TABLE contacts (
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
CREATE TABLE mail_items (
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
CREATE TABLE outreach_messages (
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
CREATE TABLE message_templates (
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
-- ##                  STEP 4: ENABLE ROW LEVEL SECURITY     ##
-- ##############################################################

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ##############################################################
-- ##                    STEP 5: CREATE POLICIES             ##
-- ##############################################################

-- Users policies
CREATE POLICY "Can view own user data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Can update own user data." ON users FOR UPDATE USING (auth.uid() = id);

-- Contacts policies (users can only manage their own contacts)
CREATE POLICY "Users can manage their own contacts." ON contacts
    FOR ALL USING (auth.uid() = user_id);

-- Mail items policies (users can only manage mail for their contacts)
CREATE POLICY "Users can manage mail items for their contacts." ON mail_items
    FOR ALL USING (auth.uid() = (SELECT user_id FROM contacts WHERE contacts.contact_id = mail_items.contact_id));

-- Outreach messages policies (users can only manage outreach for their contacts)
CREATE POLICY "Users can manage outreach for their contacts." ON outreach_messages
    FOR ALL USING (auth.uid() = (SELECT contacts.user_id FROM contacts WHERE contacts.contact_id = outreach_messages.contact_id));

-- Message templates policies (users can manage their own templates + see defaults)
CREATE POLICY "Users can manage their templates." ON message_templates
    FOR ALL USING (auth.uid() = user_id OR is_default = TRUE);

-- ##############################################################
-- ##                STEP 6: CREATE FUNCTIONS & TRIGGERS     ##
-- ##############################################################

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ##############################################################
-- ##               STEP 7: SETUP REALTIME                   ##
-- ##############################################################

-- Create publication for realtime subscriptions (for live updates)
CREATE PUBLICATION supabase_realtime FOR TABLE contacts, mail_items, outreach_messages, message_templates;

-- ##############################################################
-- ##                STEP 8: INSERT DEFAULT DATA             ##
-- ##############################################################

-- Insert default bilingual message templates
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, is_default) VALUES
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
  TRUE
);

-- ##############################################################
-- ##                     COMPLETE!                          ##
-- ##############################################################

-- Database has been completely reset and rebuilt with:
-- ✅ User profiles (linked to Supabase Auth)
-- ✅ Contacts (customer management)
-- ✅ Mail Items (package/letter tracking)
-- ✅ Outreach Messages (communication tracking)
-- ✅ Message Templates (bilingual notifications)
-- ✅ Row-level security enabled on all tables
-- ✅ Proper security policies for multi-tenant data isolation
-- ✅ Automatic user profile creation on signup
-- ✅ Realtime subscriptions for live updates
-- ✅ 3 default bilingual templates ready to use
-- ✅ Foreign key relationships and data integrity constraints
-- 
-- 🗑️  REMOVED: All Stripe-related tables (products, prices, subscriptions, customers)
-- 📧 Mail management system is now clean and focused!
