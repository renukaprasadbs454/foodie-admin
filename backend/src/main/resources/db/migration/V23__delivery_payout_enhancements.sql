-- Module 9 & Admin: Delivery Partner Payout Enhancements
-- Add provider, failure_reason, reconciliation_status, processed_at columns to payout table

ALTER TABLE payout ADD COLUMN provider VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE payout ADD COLUMN failure_reason VARCHAR(255);
ALTER TABLE payout ADD COLUMN reconciliation_status VARCHAR(40) NOT NULL DEFAULT 'MATCHED';
ALTER TABLE payout ADD COLUMN processed_at TIMESTAMPTZ;

CREATE INDEX idx_payout_provider ON payout(provider);
CREATE INDEX idx_payout_reconcil ON payout(reconciliation_status);
