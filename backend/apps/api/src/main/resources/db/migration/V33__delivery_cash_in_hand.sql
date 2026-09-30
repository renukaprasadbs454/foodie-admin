-- Migration V33: Delivery Cash In Hand & Settlement Controls
ALTER TABLE delivery_partner
    ADD COLUMN IF NOT EXISTS cash_in_hand DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS max_cash_in_hand_limit DECIMAL(10,2) NOT NULL DEFAULT 2000.00;

CREATE TABLE IF NOT EXISTS delivery_cash_deposit (
    id                   UUID PRIMARY KEY,
    delivery_partner_id   UUID NOT NULL REFERENCES delivery_partner(id) ON DELETE CASCADE,
    amount               DECIMAL(10,2) NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reference_number     VARCHAR(100),
    rejection_reason     VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at          TIMESTAMPTZ,
    approved_by          UUID,
    CONSTRAINT chk_cash_deposit_amount CHECK (amount > 0),
    CONSTRAINT chk_cash_deposit_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_cash_deposit_partner ON delivery_cash_deposit(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_cash_deposit_status ON delivery_cash_deposit(status);
