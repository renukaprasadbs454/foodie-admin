-- Migration V32: Delivery Location History
CREATE TABLE IF NOT EXISTS delivery_location_history (
    id                      UUID PRIMARY KEY,
    delivery_assignment_id   UUID REFERENCES delivery_assignment(id) ON DELETE SET NULL,
    delivery_partner_id      UUID NOT NULL REFERENCES delivery_partner(id) ON DELETE CASCADE,
    latitude                DECIMAL(10,8) NOT NULL,
    longitude               DECIMAL(11,8) NOT NULL,
    recorded_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_location_history_partner ON delivery_location_history(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_location_history_assignment ON delivery_location_history(delivery_assignment_id);
