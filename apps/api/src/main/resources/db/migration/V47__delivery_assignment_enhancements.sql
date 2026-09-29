-- Migration V47: Enhance order status check constraint, delivery assignment status check constraint, and add timing columns to order table

ALTER TABLE "order" DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE "order" ADD CONSTRAINT chk_order_status CHECK (status IN (
    'PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'WAITING_FOR_DELIVERY_PARTNER',
    'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'REJECTED', 'CANCELLED'
));

ALTER TABLE delivery_assignment DROP CONSTRAINT IF EXISTS chk_delivery_assignment_status;
ALTER TABLE delivery_assignment ADD CONSTRAINT chk_delivery_assignment_status CHECK (status IN (
    'OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REJECTED'
));

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS food_ready_at TIMESTAMPTZ;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assignment_scheduled_at TIMESTAMPTZ;
