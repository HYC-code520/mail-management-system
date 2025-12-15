-- Fixed UPDATE query (removed syntax error)
-- This adds notification dates to picked-up items that don't have them

UPDATE mail_items 
SET last_notified = pickup_date - INTERVAL '2 days'
WHERE status = 'Picked Up' 
  AND pickup_date IS NOT NULL
  AND last_notified IS NULL
  AND pickup_date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 20;

-- After running, check how many were updated:
SELECT 
  COUNT(*) as total_picked_up,
  COUNT(last_notified) as has_notification,
  COUNT(*) - COUNT(last_notified) as missing_notification
FROM mail_items
WHERE status = 'Picked Up';
