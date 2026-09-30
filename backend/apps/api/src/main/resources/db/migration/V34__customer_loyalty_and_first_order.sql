-- Migration V34: Customer Loyalty Points & First Order Discount
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id              UUID PRIMARY KEY,
    customer_id     UUID NOT NULL UNIQUE REFERENCES customer(id) ON DELETE CASCADE,
    points_balance  INT NOT NULL DEFAULT 0,
    loyalty_tier    VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_points_balance CHECK (points_balance >= 0)
);

CREATE TABLE IF NOT EXISTS loyalty_point_ledger (
    id                  UUID PRIMARY KEY,
    customer_loyalty_id UUID NOT NULL REFERENCES customer_loyalty(id) ON DELETE CASCADE,
    points              INT NOT NULL,
    entry_type          VARCHAR(10) NOT NULL,
    reference_type      VARCHAR(30) NOT NULL,
    reference_id        UUID NOT NULL,
    description         VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_loyalty_entry_type CHECK (entry_type IN ('EARN', 'REDEEM')),
    CONSTRAINT chk_loyalty_points CHECK (points > 0)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer ON loyalty_point_ledger(customer_loyalty_id);

ALTER TABLE coupon
    ADD COLUMN IF NOT EXISTS is_first_order_only BOOLEAN NOT NULL DEFAULT FALSE;
