-- ##############################################################
-- ##        Package Storage Fee Tracking System              ##
-- ##############################################################
-- This migration adds package_fees table and supporting
-- infrastructure for tracking storage fees on packages.
--
-- Business Rules:
-- - Tier 2 customers: $15/month includes 1-day FREE storage
-- - Storage fees: $2 per day per package (starting Day 2)
-- - 30-day abandonment: Mail left 30+ days is abandoned
-- - Fee waiving: Supported with reason tracking
-- - Payment: Full payment at pickup only

-- ##############################################################
-- ##             STEP 1: CREATE PACKAGE_FEES TABLE           ##
-- ##############################################################

CREATE TABLE IF NOT EXISTS package_fees (
  fee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_item_id UUID REFERENCES mail_items(mail_item_id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(contact_id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Fee calculation fields
  fee_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  days_charged INTEGER DEFAULT 0 NOT NULL,
  daily_rate DECIMAL(10,2) DEFAULT 2.00 NOT NULL,
  grace_period_days INTEGER DEFAULT 1 NOT NULL,
  
  -- Status tracking
  fee_status TEXT DEFAULT 'pending' NOT NULL CHECK (fee_status IN ('pending', 'paid', 'waived')),
  
  -- Payment information
  paid_date TIMESTAMPTZ,
  payment_method TEXT, -- 'cash', 'card', 'venmo', 'zelle', etc.
  
  -- Waiving information
  waived_date TIMESTAMPTZ,
  waived_by UUID REFERENCES users(id),
  waive_reason TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ##############################################################
-- ##             STEP 2: CREATE INDEXES                      ##
-- ##############################################################

-- Index for looking up fees by mail item
CREATE INDEX idx_package_fees_mail_item ON package_fees(mail_item_id);

-- Index for looking up fees by contact (for customer revenue history)
CREATE INDEX idx_package_fees_contact ON package_fees(contact_id);

-- Index for filtering by status (pending, paid, waived)
CREATE INDEX idx_package_fees_status ON package_fees(fee_status);

-- Index for user-level queries (all fees for a user)
CREATE INDEX idx_package_fees_user ON package_fees(user_id);

-- Composite index for dashboard queries (user + pending status)
CREATE INDEX idx_package_fees_user_pending ON package_fees(user_id, fee_status) 
  WHERE fee_status = 'pending';

-- ##############################################################
-- ##           STEP 3: ENABLE ROW LEVEL SECURITY             ##
-- ##############################################################

ALTER TABLE package_fees ENABLE ROW LEVEL SECURITY;

-- ##############################################################
-- ##             STEP 4: CREATE RLS POLICIES                 ##
-- ##############################################################

-- Users can view, create, update, and delete fees for their own contacts
CREATE POLICY "Users can manage fees for their contacts" ON package_fees
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ##############################################################
-- ##          STEP 5: CREATE UPDATE TRIGGER                  ##
-- ##############################################################

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before any update
CREATE TRIGGER package_fees_updated_at
  BEFORE UPDATE ON package_fees
  FOR EACH ROW 
  EXECUTE FUNCTION update_package_fees_updated_at();

-- ##############################################################
-- ##             STEP 6: ADD HELPFUL COMMENTS                ##
-- ##############################################################

COMMENT ON TABLE package_fees IS 'Tracks storage fees for packages. Tier 2 customers get 1-day free storage, then $2/day per package.';
COMMENT ON COLUMN package_fees.fee_amount IS 'Current calculated fee amount in dollars';
COMMENT ON COLUMN package_fees.days_charged IS 'Total days since package received (including grace period)';
COMMENT ON COLUMN package_fees.daily_rate IS 'Rate per day after grace period (default $2.00)';
COMMENT ON COLUMN package_fees.grace_period_days IS 'Number of free days (default 1 day)';
COMMENT ON COLUMN package_fees.fee_status IS 'Status: pending (owed), paid (collected), waived (forgiven)';
COMMENT ON COLUMN package_fees.waive_reason IS 'Reason for waiving fee (required when waived)';

-- ##############################################################
-- ##                 MIGRATION COMPLETE                      ##
-- ##############################################################

-- ✅ Created package_fees table with all necessary columns
-- ✅ Created indexes for performance
-- ✅ Enabled RLS and created security policies
-- ✅ Created trigger for automatic updated_at timestamp
-- ✅ Added comments for documentation

