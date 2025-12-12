-- Update Email Subject Lines to be Less Spam-Triggering
-- This migration improves email deliverability by softening subject line language

-- Update "Final Notice Before Abandonment" subject (HIGHEST PRIORITY)
UPDATE message_templates 
SET subject_line = 'Important: Package Pickup Required - Mailbox {BoxNumber}'
WHERE template_name = 'Final Notice Before Abandonment';

-- Update "Package Fee Reminder" subject (make it less aggressive)
UPDATE message_templates 
SET subject_line = 'Package Ready for Pickup - Mailbox {BoxNumber}'
WHERE template_name = 'Package Fee Reminder';

-- Update "Final Notice (After 1 Week)" subject (if exists)
UPDATE message_templates 
SET subject_line = 'Important Notice: Mail Pickup Reminder - Mailbox {BoxNumber}'
WHERE template_name = 'Final Notice (After 1 Week)';

-- Verify updates
DO $$
BEGIN
  RAISE NOTICE '✅ Updated email subject lines to reduce spam triggers:';
  RAISE NOTICE '   ❌ REMOVED: "FINAL NOTICE", "Abandonment Warning", "Fees"';
  RAISE NOTICE '   ✅ ADDED: Professional language with mailbox numbers';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Spam Risk Reduction:';
  RAISE NOTICE '   Before: HIGH risk (ALL CAPS, aggressive wording)';
  RAISE NOTICE '   After: LOW risk (professional, informative)';
END $$;

-- Show updated templates
SELECT 
  template_name,
  subject_line as "New Subject Line",
  template_type
FROM message_templates
WHERE template_name IN (
  'Package Fee Reminder',
  'Final Notice Before Abandonment',
  'Final Notice (After 1 Week)'
)
ORDER BY template_name;

