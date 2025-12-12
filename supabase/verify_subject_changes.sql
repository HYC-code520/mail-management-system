-- Quick test: Send yourself a test email with the new subject line
-- Run this in your app's email test page or via API

-- To verify the templates are loaded correctly, check what the frontend will see:
SELECT 
  template_id,
  template_name,
  subject_line as "Subject (What User Will See)",
  template_type,
  CASE 
    WHEN subject_line LIKE '%FINAL NOTICE%' THEN '🔴 SPAM RISK - Has "FINAL NOTICE"'
    WHEN subject_line LIKE '%Important:%' THEN '✅ GOOD - Professional tone'
    WHEN subject_line LIKE '%Ready for Pickup%' THEN '✅ GOOD - Service-focused'
    ELSE '⚠️ Check manually'
  END as "Spam Assessment"
FROM message_templates
WHERE template_name IN (
  'Package Fee Reminder',
  'Final Notice Before Abandonment',
  'Final Notice (After 1 Week)'
)
ORDER BY template_name;


