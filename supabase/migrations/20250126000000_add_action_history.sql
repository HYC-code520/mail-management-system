-- Create action_history table to track ALL actions on mail items
-- This provides a complete audit trail of status changes, updates, and notes

CREATE TABLE IF NOT EXISTS action_history (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_item_id UUID NOT NULL REFERENCES mail_items(mail_item_id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'status_change', 'created', 'updated', 'notified'
    action_description TEXT NOT NULL, -- Human-readable description: "Marked as Picked Up", "Forwarded to address", etc.
    previous_value TEXT, -- Previous status/value (for status changes)
    new_value TEXT, -- New status/value (for status changes)
    performed_by TEXT NOT NULL, -- Staff member who performed the action
    notes TEXT, -- Optional notes from staff
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_action_history_mail_item ON action_history(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_action_history_timestamp ON action_history(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_action_history_type ON action_history(action_type);

-- Enable RLS
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read/write action history for their organization
CREATE POLICY "Users can view action history"
    ON action_history
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create action history"
    ON action_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE action_history IS 'Complete audit trail of all actions performed on mail items';
COMMENT ON COLUMN action_history.action_type IS 'Type of action: status_change, created, updated, notified';
COMMENT ON COLUMN action_history.action_description IS 'Human-readable description of the action taken';
COMMENT ON COLUMN action_history.previous_value IS 'Previous value before the action (for status changes)';
COMMENT ON COLUMN action_history.new_value IS 'New value after the action (for status changes)';
COMMENT ON COLUMN action_history.performed_by IS 'Name or email of staff member who performed the action';
COMMENT ON COLUMN action_history.notes IS 'Optional notes or context provided by staff member';

-- Migration: Convert existing notification_history to action_history
-- This ensures we don't lose historical data
INSERT INTO action_history (
    mail_item_id,
    action_type,
    action_description,
    performed_by,
    notes,
    action_timestamp
)
SELECT 
    mail_item_id,
    'notified' as action_type,
    CONCAT('Customer notified via ', notification_method) as action_description,
    notified_by as performed_by,
    notes,
    notified_at as action_timestamp
FROM notification_history
ON CONFLICT DO NOTHING;






















