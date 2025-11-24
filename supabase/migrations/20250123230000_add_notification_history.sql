-- Create notification_history table to track all customer notifications
-- This provides an audit trail of when and how customers were contacted about their mail

CREATE TABLE IF NOT EXISTS notification_history (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_item_id UUID NOT NULL REFERENCES mail_items(mail_item_id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    notified_by TEXT NOT NULL, -- Staff member who sent the notification
    notification_method TEXT DEFAULT 'Email', -- Email, Phone, Text, In-Person, WeChat
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT, -- Optional additional details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_history_mail_item ON notification_history(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_contact ON notification_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_date ON notification_history(notified_at);

-- Enable RLS
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read/write notification history for their organization
CREATE POLICY "Users can view notification history"
    ON notification_history
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create notification history"
    ON notification_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Update mail_items table to add last_notified field if it doesn't exist
-- This will be automatically updated when a notification is logged
ALTER TABLE mail_items 
ADD COLUMN IF NOT EXISTS last_notified TIMESTAMPTZ;

-- Create a function to automatically update last_notified when notification is added
CREATE OR REPLACE FUNCTION update_mail_item_last_notified()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mail_items 
    SET last_notified = NEW.notified_at
    WHERE mail_item_id = NEW.mail_item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_notified
DROP TRIGGER IF EXISTS trigger_update_last_notified ON notification_history;
CREATE TRIGGER trigger_update_last_notified
    AFTER INSERT ON notification_history
    FOR EACH ROW
    EXECUTE FUNCTION update_mail_item_last_notified();

COMMENT ON TABLE notification_history IS 'Tracks all customer notifications with audit trail of who, when, and how customers were contacted';
COMMENT ON COLUMN notification_history.notified_by IS 'Name or email of staff member who sent the notification';
COMMENT ON COLUMN notification_history.notification_method IS 'Method used: Email, Phone, Text, In-Person, WeChat';
COMMENT ON COLUMN notification_history.notes IS 'Optional additional context about the notification';

