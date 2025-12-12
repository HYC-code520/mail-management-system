-- Update Email BODIES to match the spam-safe subject lines
-- This removes ALL CAPS and aggressive language from the email content

-- Update "Final Notice Before Abandonment" body
UPDATE message_templates 
SET message_body = 'Hello {Name},

This is an important notice regarding your package(s) at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Days Waiting: {DaysCharged}+ days
Current Storage Fees: {TotalPackageFees}

⚠️ Please Note: Packages left for 30+ days may be processed as unclaimed per our policy.

Please collect at your earliest convenience or contact us to make arrangements.

Business Hours: Monday-Friday 10am-6pm, Saturday 10am-2pm
Phone: (646) 535-0363

Thank you,
Mei Way Mail Plus Team

---

{Name} 您好，

这是关于您在美威邮件中心包裹的重要通知。

邮箱号：{BoxNumber}
等待天数：{DaysCharged}+ 天
当前存储费用：{TotalPackageFees}

⚠️ 请注意：根据我们的政策，存放超过30天的包裹可能会被处理为无人认领。

请尽快领取或联系我们安排。

营业时间：周一至周五 10am-6pm，周六 10am-2pm
电话：(646) 535-0363

谢谢，
美威邮件中心'
WHERE template_name = 'Final Notice Before Abandonment';

-- Update "Final Notice (After 1 Week)" body
UPDATE message_templates 
SET message_body = 'Hello {Name},

This is an important reminder that your mail has been waiting for over one week.

Mailbox: {BoxNumber}
Type: {Type}
Days waiting: 7+ days

Storage fees may apply if not collected soon.
Fee: $5 per week after 7 days

Please collect during business hours at your earliest convenience.

Thank you,
Mei Way Mail Plus Team

---

{Name} 您好,

重要提醒：您的邮件已等待超过一周。

邮箱号: {BoxNumber}
类型: {Type}
等待天数: 7天以上

如不尽快领取可能会产生存储费用。
费用：7天后每周$5

请在营业时间内尽快领取。

谢谢，
美威邮件团队'
WHERE template_name = 'Final Notice (After 1 Week)';

-- Verify updates
DO $$
BEGIN
  RAISE NOTICE '✅ Updated email bodies to remove spam triggers:';
  RAISE NOTICE '   ❌ REMOVED: "FINAL NOTICE" in all caps';
  RAISE NOTICE '   ❌ REMOVED: "ABANDONED" threatening language';
  RAISE NOTICE '   ❌ REMOVED: "IMMEDIATELY" urgency words';
  RAISE NOTICE '   ✅ ADDED: Professional, helpful tone';
  RAISE NOTICE '   ✅ ADDED: "important notice/reminder" (softer)';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email Deliverability Improvement:';
  RAISE NOTICE '   Before: Aggressive, threatening tone (high spam risk)';
  RAISE NOTICE '   After: Professional, service-oriented (low spam risk)';
END $$;

-- Show updated templates
SELECT 
  template_name,
  subject_line as "Subject Line",
  SUBSTRING(message_body FROM 1 FOR 100) || '...' as "Body Preview (First 100 chars)"
FROM message_templates
WHERE template_name IN (
  'Package Fee Reminder',
  'Final Notice Before Abandonment',
  'Final Notice (After 1 Week)'
)
ORDER BY template_name;


