-- Ensure all scan templates are system defaults (visible to everyone)
-- This makes them show up in the Templates page for all users

UPDATE message_templates
SET is_default = TRUE,
    user_id = NULL
WHERE template_name IN (
    'Scan: Letters Only',
    'Scan: Packages Only',
    'Scan: Mixed Items'
);

-- Also ensure Overdue Payment Notification is a system default
UPDATE message_templates
SET is_default = TRUE,
    user_id = NULL
WHERE template_name = 'Overdue Payment Notification';

