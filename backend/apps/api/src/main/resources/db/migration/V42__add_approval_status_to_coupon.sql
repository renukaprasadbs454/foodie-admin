ALTER TABLE coupon ADD COLUMN approval_status VARCHAR(30) DEFAULT 'APPROVED';

-- Backfill existing data
UPDATE coupon SET approval_status = 'APPROVED' WHERE approval_status IS NULL;
