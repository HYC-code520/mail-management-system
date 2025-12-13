-- Migration: Add collected_amount column to package_fees
-- Purpose: Track actual amount collected when fees are discounted
-- Date: 2025-12-13

-- Add collected_amount column to store actual payment amount
-- When a fee is discounted (e.g., $4 reduced to $3), this column stores the $3
-- Revenue calculations will use COALESCE(collected_amount, fee_amount)
ALTER TABLE package_fees ADD COLUMN IF NOT EXISTS collected_amount DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN package_fees.collected_amount IS 'Actual amount collected. NULL means full fee_amount was collected. Used when fees are discounted.';

