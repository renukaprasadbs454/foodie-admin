DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment' AND column_name='payment_session_id') THEN
        ALTER TABLE payment ALTER COLUMN payment_session_id TYPE VARCHAR(255);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment' AND column_name='cashfree_order_id') THEN
        ALTER TABLE payment ALTER COLUMN cashfree_order_id TYPE VARCHAR(255);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refund_request' AND column_name='cashfree_refund_id') THEN
        ALTER TABLE refund_request ALTER COLUMN cashfree_refund_id TYPE VARCHAR(255);
    END IF;
END $$;
