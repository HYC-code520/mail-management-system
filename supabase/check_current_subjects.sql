-- Check current subject lines in the database
SELECT 
  template_name,
  subject_line,
  template_type,
  updated_at
FROM message_templates
WHERE template_name IN (
  'Package Fee Reminder',
  'Final Notice Before Abandonment',
  'Final Notice (After 1 Week)'
)
ORDER BY template_name;


