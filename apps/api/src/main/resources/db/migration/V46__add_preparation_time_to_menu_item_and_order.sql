-- Add preparation_time to menu_item table
ALTER TABLE menu_item
ADD COLUMN preparation_time VARCHAR(255);

-- Add preparation_time to orders table
ALTER TABLE orders
ADD COLUMN preparation_time VARCHAR(255);
