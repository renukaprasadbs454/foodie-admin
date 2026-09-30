-- Add CUSTOMER to wallet owner type
ALTER TABLE wallet_account DROP CONSTRAINT IF EXISTS chk_wallet_owner_type;
ALTER TABLE wallet_account ADD CONSTRAINT chk_wallet_owner_type CHECK (owner_type IN ('DELIVERY_PARTNER', 'PLATFORM', 'CUSTOMER', 'RESTAURANT'));

-- Support wallet_amount in payment
ALTER TABLE payment ADD COLUMN IF NOT EXISTS wallet_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE payment ALTER COLUMN razorpay_order_id DROP NOT NULL;
ALTER TABLE payment DROP CONSTRAINT IF EXISTS chk_payment_amount;
ALTER TABLE payment ADD CONSTRAINT chk_payment_amount CHECK (amount >= 0);

