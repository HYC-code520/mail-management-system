-- Fix received_date timezone issues
-- This migration corrects dates that were stored as UTC midnight
-- and converts them to the same date at noon NY time to avoid
-- off-by-one errors in the dashboard charts

-- Update all received_date values to be at noon NY time on the same date
UPDATE mail_items
SET received_date = (
  -- Extract the date part and set it to noon in NY timezone
  (DATE(received_date AT TIME ZONE 'America/New_York') || ' 12:00:00')::timestamp AT TIME ZONE 'America/New_York'
)
WHERE received_date IS NOT NULL;

























