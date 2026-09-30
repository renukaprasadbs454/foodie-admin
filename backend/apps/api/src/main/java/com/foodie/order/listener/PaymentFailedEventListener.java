package com.foodie.order.listener;

import com.foodie.order.service.OrderService;
import com.foodie.shared.event.PaymentFailedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listens to PaymentFailedEvent from payment module to cancel the order.
 */
@Component
public class PaymentFailedEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentFailedEventListener.class);

    private final OrderService orderService;

    public PaymentFailedEventListener(OrderService orderService) {
        this.orderService = orderService;
    }

    @EventListener
    @Transactional
    public void onPaymentFailed(PaymentFailedEvent event) {
        log.info("Payment failed for order {}; marking order as CANCELLED", event.orderId());
        orderService.failAfterPayment(event.orderId());
    }
}
