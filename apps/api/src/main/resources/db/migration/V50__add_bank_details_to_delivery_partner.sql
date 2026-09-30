-- Add bank details columns to delivery_partner table
ALTER TABLE delivery_partner ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(100);
ALTER TABLE delivery_partner ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
ALTER TABLE delivery_partner ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(30);
ALTER TABLE delivery_partner ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
