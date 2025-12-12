-- Add Summary Notification Template for Bulk Emails
-- This template is used when notifying a customer about ALL their pending items

-- Delete existing template if it exists
DELETE FROM message_templates 
WHERE template_name = 'Summary Notification (All Items)';

-- Insert the smart summary template
INSERT INTO message_templates (
  template_name,
  template_type,
  subject_line,
  message_body,
  default_channel,
  is_default
)
VALUES (
  'Summary Notification (All Items)',
  'Summary',
  'Your items at Mei Way Mail Plus - Mailbox {BoxNumber}',
  'Hello {Name},

This is a summary of all your items currently waiting at Mei Way Mail Plus.

📬 YOUR ITEMS:
{ItemSummary}

📊 SUMMARY:
• Total: {TotalItems}
• Packages: {TotalPackages}
• Letters: {TotalLetters}
• Oldest item: {OldestDays} days
{FeeSummary}

Please collect your items at your earliest convenience during business hours.

Business Hours: Monday-Friday 10am-6pm, Saturday 10am-2pm
Phone: (646) 535-0363

Thank you,
Mei Way Mail Plus Team

---

{Name} 您好，

这是您目前在美威邮件中心等待领取的所有物品的摘要。

📬 您的物品：
{ItemSummaryChinese}

📊 摘要：
• 总计：{TotalItems}
• 包裹：{TotalPackages}
• 信件：{TotalLetters}
• 最早物品：{OldestDays} 天
{FeeSummaryChinese}

请在方便时于营业时间内领取您的物品。

营业时间：周一至周五 10am-6pm，周六 10am-2pm
电话：(646) 535-0363

谢谢，
美威邮件中心',
  'Email',
  false
);

-- Verify insertion
DO $$
BEGIN
  RAISE NOTICE '✅ Summary Notification template created successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Available variables:';
  RAISE NOTICE '  {Name} - Customer name';
  RAISE NOTICE '  {BoxNumber} - Mailbox number';
  RAISE NOTICE '  {TotalItems} - Total count of all items';
  RAISE NOTICE '  {TotalPackages} - Package count';
  RAISE NOTICE '  {TotalLetters} - Letter count';
  RAISE NOTICE '  {OldestDays} - Age of oldest item';
  RAISE NOTICE '  {ItemSummary} - Formatted list of items (English)';
  RAISE NOTICE '  {ItemSummaryChinese} - Formatted list of items (Chinese)';
  RAISE NOTICE '  {FeeSummary} - Fee information (English)';
  RAISE NOTICE '  {FeeSummaryChinese} - Fee information (Chinese)';
END $$;

