-- Drop the strict check constraint to allow RESTAURANT and CUSTOMER wallets
ALTER TABLE wallet_account DROP CONSTRAINT IF EXISTS chk_wallet_owner_type;
