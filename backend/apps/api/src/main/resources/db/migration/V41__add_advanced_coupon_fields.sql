ALTER TABLE coupon ADD COLUMN funder_type VARCHAR(30) DEFAULT 'FOODIE';
ALTER TABLE coupon ADD COLUMN coupon_type VARCHAR(30) DEFAULT 'GENERIC';
ALTER TABLE coupon ADD COLUMN benefit_mode VARCHAR(30) DEFAULT 'FLAT';

-- Backfill existing data
UPDATE coupon SET funder_type = 'FOODIE' WHERE funder_type IS NULL;
UPDATE coupon SET coupon_type = CASE WHEN is_first_order_only = true THEN 'RESTAURANT_FIRST_ORDER' ELSE 'GENERIC' END WHERE coupon_type IS NULL;
UPDATE coupon SET benefit_mode = CASE WHEN discount_type = 'FLAT' THEN 'FLAT' ELSE 'PERCENTAGE' END WHERE benefit_mode IS NULL;
