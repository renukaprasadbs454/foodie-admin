-- Create order_message table for in-app order messaging
CREATE TABLE IF NOT EXISTS order_message (
    id          UUID            PRIMARY KEY,
    order_id    UUID            NOT NULL,
    sender_role VARCHAR(50)     NOT NULL,
    sender_id   UUID            NOT NULL,
    message_text VARCHAR(1000)  NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT fk_order_message_order FOREIGN KEY (order_id) REFERENCES "order" (id)
);

CREATE INDEX IF NOT EXISTS idx_order_message_order_id ON order_message (order_id);
