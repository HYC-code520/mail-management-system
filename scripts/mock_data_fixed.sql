-- ##############################################################
-- ##          MOCK DATA FOR MEI WAY MAIL MANAGEMENT           ##
-- ##############################################################
-- This script adds 4 sample records for each table
--
-- INSTRUCTIONS:
-- 1. Click "Auth Users — IDs and Emails" tab in Supabase (or run: SELECT id, email FROM auth.users;)
-- 2. Copy your user ID
-- 3. Replace 'YOUR_USER_ID_HERE' below with your actual user ID (Cmd+F to find all)
-- 4. Run this entire script in Supabase SQL Editor

-- ##############################################################
-- ##                    CONTACTS (4 entries)                  ##
-- ##############################################################

INSERT INTO contacts (
  user_id,
  contact_person,
  company_name,
  email,
  phone_number,
  mailbox_number,
  unit_number,
  language_preference,
  service_tier,
  status
) VALUES
  -- Contact 1: John Smith
  (
    'YOUR_USER_ID_HERE',
    'John Smith',
    'Smith Consulting LLC',
    'john.smith@smithconsulting.com',
    '+1 (555) 123-4567',
    'MB-101',
    '101',
    'English',
    2,
    'Active'
  ),
  -- Contact 2: Maria Garcia
  (
    'YOUR_USER_ID_HERE',
    'Maria Garcia',
    'Garcia Imports',
    'maria@garciaimports.com',
    '+1 (555) 234-5678',
    'MB-102',
    '102',
    'Bilingual',
    3,
    'Active'
  ),
  -- Contact 3: Wei Chen
  (
    'YOUR_USER_ID_HERE',
    'Wei Chen',
    NULL,
    'wei.chen@email.com',
    '+1 (555) 345-6789',
    'MB-103',
    '103',
    'Chinese',
    1,
    'Active'
  ),
  -- Contact 4: Sarah Johnson
  (
    'YOUR_USER_ID_HERE',
    'Sarah Johnson',
    'Tech Innovations Inc',
    'sarah.j@techinnovations.com',
    '+1 (555) 456-7890',
    'MB-104',
    '104',
    'English',
    3,
    'PENDING'
  );

-- ##############################################################
-- ##                 MAIL ITEMS (4 entries)                   ##
-- ##############################################################

-- Mail Item 1: For John Smith - Received Package
INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Received',
  'Amazon delivery - small box',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-101'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Mail Item 2: For Maria Garcia - Notified Letter
INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Notified',
  'USPS certified mail',
  CURRENT_DATE - INTERVAL '1 day',
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-102'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Mail Item 3: For Wei Chen - Picked Up Package
INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Picked Up',
  'FedEx large package',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE - INTERVAL '1 day'
FROM contacts c
WHERE c.mailbox_number = 'MB-103'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Mail Item 4: For Sarah Johnson - Received Letter
INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Received',
  'Bank statement',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-104'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- ##############################################################
-- ##           MESSAGE TEMPLATES (4 entries)                  ##
-- ##############################################################

INSERT INTO message_templates (
  user_id,
  template_name,
  template_text_en,
  template_text_cn,
  category
) VALUES
  -- Template 1: New Mail Notification
  (
    'YOUR_USER_ID_HERE',
    'New Mail Notification',
    'Hello {Name},

You have new mail waiting for you at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Type: {Type}
Date Received: {Date}

Please collect at your earliest convenience during business hours.

Best regards,
Mei Way Mail Plus Team',
    '{Name} 您好，

您在美威邮件中心有新邮件等待领取。

邮箱号：{BoxNumber}
类型：{Type}
收件日期：{Date}

请在营业时间内尽快领取。

此致
美威邮件团队',
    'notification'
  ),
  -- Template 2: Reminder (Uncollected Mail)
  (
    'YOUR_USER_ID_HERE',
    'Reminder (Uncollected Mail)',
    'Dear {Name},

This is a friendly reminder that you have uncollected mail at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Waiting since: {Date}

Please collect your mail during business hours: Mon-Fri 9AM-5PM.

Thank you,
Mei Way Mail Plus',
    '亲爱的 {Name}，

这是一封友好提醒，您在美威邮件中心有未领取的邮件。

邮箱号：{BoxNumber}
等待领取时间：{Date}

请在营业时间内领取您的邮件：周一至周五 上午9点至下午5点。

谢谢
美威邮件中心',
    'reminder'
  ),
  -- Template 3: Final Notice
  (
    'YOUR_USER_ID_HERE',
    'Final Notice (After 1 Week)',
    'FINAL NOTICE

Dear {Name},

Your mail has been waiting at Mei Way Mail Plus for over one week.

Mailbox: {BoxNumber}
Received: {Date}

Please collect immediately. Uncollected items may be returned to sender or disposed of according to our policy.

Contact us if you need assistance.

Mei Way Mail Plus
Phone: (555) 123-4567',
    '最后通知

{Name} 您好，

您的邮件已在美威邮件中心等待超过一周。

邮箱号：{BoxNumber}
收件日期：{Date}

请立即领取。根据我们的政策，未领取的物品可能会被退回或处理。

如需帮助，请联系我们。

美威邮件中心
电话：(555) 123-4567',
    'final_notice'
  ),
  -- Template 4: Pickup Confirmation
  (
    'YOUR_USER_ID_HERE',
    'Pickup Confirmation',
    'Hello {Name},

This is to confirm that you have picked up your mail from Mei Way Mail Plus.

Mailbox: {BoxNumber}
Pickup Date: {Date}
Type: {Type}

Thank you for using our service!

Best regards,
Mei Way Mail Plus Team',
    '{Name} 您好，

确认您已从美威邮件中心领取邮件。

邮箱号：{BoxNumber}
领取日期：{Date}
类型：{Type}

感谢使用我们的服务！

此致
美威邮件团队',
    'confirmation'
  );

-- ##############################################################
-- ##           OUTREACH MESSAGES (4 entries)                  ##
-- ##############################################################

-- Outreach 1: To John Smith about Package
INSERT INTO outreach_messages (
  contact_id,
  mail_item_id,
  message_type,
  message_content,
  sent_at,
  channel
)
SELECT 
  c.contact_id,
  mi.mail_item_id,
  'notification',
  'Hello John Smith, You have a new package waiting. Mailbox: MB-101. Please collect at your earliest convenience.',
  CURRENT_TIMESTAMP,
  'email'
FROM contacts c
JOIN mail_items mi ON c.contact_id = mi.contact_id
WHERE c.mailbox_number = 'MB-101'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Outreach 2: To Maria Garcia about Letter
INSERT INTO outreach_messages (
  contact_id,
  mail_item_id,
  message_type,
  message_content,
  sent_at,
  channel
)
SELECT 
  c.contact_id,
  mi.mail_item_id,
  'notification',
  'Dear Maria Garcia, You have certified mail waiting. Mailbox: MB-102. Business hours: Mon-Fri 9AM-5PM.',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'sms'
FROM contacts c
JOIN mail_items mi ON c.contact_id = mi.contact_id
WHERE c.mailbox_number = 'MB-102'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Outreach 3: To Wei Chen - Pickup Confirmation
INSERT INTO outreach_messages (
  contact_id,
  mail_item_id,
  message_type,
  message_content,
  sent_at,
  channel
)
SELECT 
  c.contact_id,
  mi.mail_item_id,
  'confirmation',
  'Wei Chen 您好，确认您已领取包裹。感谢使用美威邮件服务！',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'email'
FROM contacts c
JOIN mail_items mi ON c.contact_id = mi.contact_id
WHERE c.mailbox_number = 'MB-103'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- Outreach 4: To Sarah Johnson - New Mail
INSERT INTO outreach_messages (
  contact_id,
  mail_item_id,
  message_type,
  message_content,
  sent_at,
  channel
)
SELECT 
  c.contact_id,
  mi.mail_item_id,
  'notification',
  'Dear Sarah Johnson, You have mail waiting at Mei Way Mail Plus. Mailbox: MB-104.',
  CURRENT_TIMESTAMP,
  'email'
FROM contacts c
JOIN mail_items mi ON c.contact_id = mi.contact_id
WHERE c.mailbox_number = 'MB-104'
  AND c.user_id = 'YOUR_USER_ID_HERE'
LIMIT 1;

-- ##############################################################
-- ##                    VERIFICATION                          ##
-- ##############################################################

-- Check record counts for each table
SELECT 
  'contacts' as table_name,
  COUNT(*) as record_count
FROM contacts
WHERE user_id = 'YOUR_USER_ID_HERE'

UNION ALL

SELECT 
  'mail_items' as table_name,
  COUNT(*) as record_count
FROM mail_items mi
JOIN contacts c ON mi.contact_id = c.contact_id
WHERE c.user_id = 'YOUR_USER_ID_HERE'

UNION ALL

SELECT 
  'message_templates' as table_name,
  COUNT(*) as record_count
FROM message_templates
WHERE user_id = 'YOUR_USER_ID_HERE'

UNION ALL

SELECT 
  'outreach_messages' as table_name,
  COUNT(*) as record_count
FROM outreach_messages om
JOIN contacts c ON om.contact_id = c.contact_id
WHERE c.user_id = 'YOUR_USER_ID_HERE'

ORDER BY table_name;



