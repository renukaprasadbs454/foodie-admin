ALTER TABLE refund_request ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment' AND column_name='payment_session_id') THEN
        ALTER TABLE payment ALTER COLUMN payment_session_id DROP NOT NULL;
    END IF;
END $$;
