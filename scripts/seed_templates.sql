-- Seed Bilingual Notification Templates
-- Run this in Supabase SQL Editor after running simple_reset_rebuild.sql

-- Template 1: New Mail Notification
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, default_channel, is_default)
VALUES (
  'New Mail Notification',
  'Initial',
  'You have mail waiting - Mei Way Mail Plus',
  'Hello {Name},

You have new mail waiting for you at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Type: {Type}
Date Received: {Date}

Please collect at your earliest convenience during business hours.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好,

您在美威邮件中心有新邮件等待领取。

邮箱号: {BoxNumber}
类型: {Type}
收件日期: {Date}

请在营业时间内尽快领取。

此致
美威邮件团队',
  'Both',
  true
);

-- Template 2: Reminder (Uncollected Mail)
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, default_channel, is_default)
VALUES (
  'Reminder (Uncollected Mail)',
  'Reminder',
  'Reminder: Uncollected Mail - Mei Way Mail Plus',
  'Hello {Name},

This is a friendly reminder that you have uncollected mail at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Type: {Type}
Days waiting: 3-5 days

Please collect during business hours to avoid storage fees.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好,

友情提醒，您在美威邮件中心有未领取的邮件。

邮箱号: {BoxNumber}
类型: {Type}
等待天数: 3-5天

请在营业时间内领取，以避免存储费用。

此致
美威邮件团队',
  'Both',
  true
);

-- Template 3: Final Notice (After 1 Week)
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, default_channel, is_default)
VALUES (
  'Final Notice (After 1 Week)',
  'Reminder',
  'Final Notice: Uncollected Mail - Storage Fee Applies',
  'Hello {Name},

FINAL NOTICE: Your mail has been waiting for over 1 week.

Mailbox: {BoxNumber}
Type: {Type}
Days waiting: 7+ days

Storage fees will apply if not collected within 48 hours.
Fee: $5 per week after 7 days

Please collect immediately during business hours.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好,

最后通知：您的邮件已等待超过1周。

邮箱号: {BoxNumber}
类型: {Type}
等待天数: 7天以上

如48小时内未领取将收取存储费。
费用：7天后每周$5

请立即在营业时间内领取。

此致
美威邮件团队',
  'Both',
  true
);

-- Verify insertion
SELECT template_id, template_name, template_type, is_default
FROM message_templates
WHERE is_default = true
ORDER BY created_at;




