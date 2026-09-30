-- Module 10: Notification Text Adjustments
-- Fix text for ORDER_CONFIRMED to not say "by the restaurant", as CONFIRMED is a system state prior to restaurant acceptance.

UPDATE notification_template 
SET title_template = 'Order successfully placed',
    body_template = 'Your order {{orderNumber}} has been securely received and forwarded to the restaurant.',
    updated_at = now()
WHERE event_type = 'ORDER_CONFIRMED' AND channel = 'PUSH';
