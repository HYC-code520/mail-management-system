-- Add payment_method column to package_fees table
-- This tracks how the fee was paid (Cash, Card, Venmo, Zelle, PayPal, Check, Other)

ALTER TABLE package_fees 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN package_fees.payment_method IS 'Payment method used: Cash, Card, Venmo, Zelle, PayPal, Check, Other';
