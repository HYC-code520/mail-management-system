-- Performance optimization indexes for Mail Management System
-- Created: December 9, 2025
-- Purpose: Speed up dashboard queries and improve overall performance

-- Index for mail_items queries (most common filters)
CREATE INDEX IF NOT EXISTS idx_mail_items_received_date 
  ON mail_items(received_date DESC);

CREATE INDEX IF NOT EXISTS idx_mail_items_status 
  ON mail_items(status);

CREATE INDEX IF NOT EXISTS idx_mail_items_contact_id 
  ON mail_items(contact_id);

CREATE INDEX IF NOT EXISTS idx_mail_items_pickup_date 
  ON mail_items(pickup_date) 
  WHERE pickup_date IS NULL; -- Partial index for pending pickups

-- Index for notification_history queries
CREATE INDEX IF NOT EXISTS idx_notification_history_mail_item_id 
  ON notification_history(mail_item_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at 
  ON notification_history(sent_at DESC);

-- Index for contacts queries
CREATE INDEX IF NOT EXISTS idx_contacts_status 
  ON contacts(status);

CREATE INDEX IF NOT EXISTS idx_contacts_created_at 
  ON contacts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_mailbox_number 
  ON contacts(mailbox_number);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_mail_items_status_received 
  ON mail_items(status, received_date DESC);

-- Index for action_history queries
CREATE INDEX IF NOT EXISTS idx_action_history_mail_item_id 
  ON action_history(mail_item_id);

-- Comment for future reference
COMMENT ON INDEX idx_mail_items_received_date IS 'Speeds up dashboard mail volume queries';
COMMENT ON INDEX idx_notification_history_mail_item_id IS 'Speeds up notification count lookups';

