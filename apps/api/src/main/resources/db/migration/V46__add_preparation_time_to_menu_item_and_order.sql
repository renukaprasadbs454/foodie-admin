-- Add preparation_time to menu_item table
ALTER TABLE menu_item
ADD COLUMN preparation_time VARCHAR(50);

-- Add preparation_time to "order" table
ALTER TABLE "order"
ADD COLUMN preparation_time INTEGER;
