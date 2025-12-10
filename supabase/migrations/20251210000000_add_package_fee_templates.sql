-- Add Package Fee Email Templates
-- Creates two new email templates for the package fee system

-- First, check if templates already exist and delete them if they do
DELETE FROM message_templates 
WHERE template_name IN ('Package Fee Reminder', 'Final Notice Before Abandonment');

-- Template 1: Package Fee Reminder
INSERT INTO message_templates (
  template_name,
  template_type,
  subject_line,
  message_body,
  is_default
)
VALUES (
  'Package Fee Reminder',
  'Reminder',
  'Package Storage Fees - {Name}',
  'Hello {Name},

You have {PackageCount} {PackagesText} at Mei Way Mail Plus with accumulated storage fees.

Mailbox: {BoxNumber}
Total Storage Fees: {TotalPackageFees}

Our storage policy:
- Day 1: FREE
- Day 2+: $2.00 per day per package

Please collect your packages during business hours to avoid additional charges.

Thank you,
Mei Way Mail Plus Team

---

{Name} 您好，

您在美威邮件中心有 {PackageCount} 个包裹产生了存储费用。

邮箱号：{BoxNumber}
总存储费用：{TotalPackageFees}

我们的存储政策：
- 第1天：免费
- 第2天起：每个包裹每天 $2.00

请在营业时间内领取您的包裹，以避免额外费用。

谢谢，
美威邮件中心',
  false
);

-- Template 2: Final Notice Before Abandonment
INSERT INTO message_templates (
  template_name,
  template_type,
  subject_line,
  message_body,
  is_default
)
VALUES (
  'Final Notice Before Abandonment',
  'Final',
  'FINAL NOTICE - Package Abandonment Warning - {Name}',
  'Hello {Name},

This is a FINAL NOTICE regarding your package(s) at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Days Waiting: {DaysCharged}+ days
Current Storage Fees: {TotalPackageFees}

⚠️ IMPORTANT: Packages left for 30+ days will be marked as ABANDONED per our policy.

Please collect immediately or contact us to make arrangements.

Business Hours: Monday-Friday 10am-6pm, Saturday 10am-2pm
Phone: (XXX) XXX-XXXX

Mei Way Mail Plus Team

---

{Name} 您好，

这是关于您在美威邮件中心包裹的最后通知。

邮箱号：{BoxNumber}
等待天数：{DaysCharged}+ 天
当前存储费用：{TotalPackageFees}

⚠️ 重要提示：根据我们的政策，存放超过30天的包裹将被标记为"已遗弃"。

请立即领取或联系我们安排。

营业时间：周一至周五 10am-6pm，周六 10am-2pm
电话：(XXX) XXX-XXXX

美威邮件中心',
  false
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Package fee email templates created successfully';
  RAISE NOTICE '   - Package Fee Reminder';
  RAISE NOTICE '   - Final Notice Before Abandonment';
END $$;

