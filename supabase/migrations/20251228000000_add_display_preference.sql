-- Add display preference column to contacts table
-- This allows staff to control how each customer's name appears throughout the system

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS display_name_preference TEXT DEFAULT 'auto';

-- Valid values: 'company', 'person', 'both', 'auto'
-- 'auto' means smart logic (show both if available, fallback gracefully)

ALTER TABLE contacts
ADD CONSTRAINT contacts_display_preference_check 
CHECK (display_name_preference IN ('company', 'person', 'both', 'auto'));

-- Update existing rows to use 'auto' (backward compatible)
UPDATE contacts 
SET display_name_preference = 'auto' 
WHERE display_name_preference IS NULL;

COMMENT ON COLUMN contacts.display_name_preference IS 
'How to display customer name: company, person, both, or auto (smart logic)';

