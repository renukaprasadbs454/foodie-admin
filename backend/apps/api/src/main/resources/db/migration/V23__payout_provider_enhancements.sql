-- Module 9 / Payout Provider Enhancements
-- Adds provider tracking, reference IDs, and failure reasons to payout table

ALTER TABLE payout ADD COLUMN IF NOT EXISTS provider VARCHAR(30);
ALTER TABLE payout ADD COLUMN IF NOT EXISTS provider_payout_id VARCHAR(100);
ALTER TABLE payout ADD COLUMN IF NOT EXISTS provider_reference_id VARCHAR(100);
ALTER TABLE payout ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);
ALTER TABLE payout ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500);
ALTER TABLE payout ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payout_provider_payout_id ON payout(provider_payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_provider_lookup ON payout(provider, provider_payout_id);
