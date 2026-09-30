DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment' AND column_name='razorpay_order_id') THEN
        ALTER TABLE payment RENAME COLUMN razorpay_order_id TO payment_session_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment' AND column_name='razorpay_payment_id') THEN
        ALTER TABLE payment RENAME COLUMN razorpay_payment_id TO cashfree_order_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refund_request' AND column_name='razorpay_refund_id') THEN
        ALTER TABLE refund_request RENAME COLUMN razorpay_refund_id TO cashfree_refund_id;
    END IF;
END $$;
