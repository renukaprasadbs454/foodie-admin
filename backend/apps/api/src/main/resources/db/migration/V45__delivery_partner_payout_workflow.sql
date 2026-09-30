-- Module 9 / Delivery Partner Payout Workflow Enhancements
-- Allows APPROVED and REJECTED statuses for multi-step approval and withdrawal workflow

ALTER TABLE payout DROP CONSTRAINT IF EXISTS chk_payout_status;
ALTER TABLE payout ADD CONSTRAINT chk_payout_status CHECK (status IN ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'));
