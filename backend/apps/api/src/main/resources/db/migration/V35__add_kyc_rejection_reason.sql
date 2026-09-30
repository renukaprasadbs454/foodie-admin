-- Add kyc_rejection_reason column to delivery_partner table
ALTER TABLE delivery_partner ADD COLUMN IF NOT EXISTS kyc_rejection_reason VARCHAR(500);
