TRUNCATE TABLE ledger_entry CASCADE;
TRUNCATE TABLE payout CASCADE;
UPDATE wallet_account SET balance = 0, version = 0;
