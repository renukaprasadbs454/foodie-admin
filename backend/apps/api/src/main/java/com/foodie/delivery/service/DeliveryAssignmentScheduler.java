package com.foodie.delivery.service;

import com.foodie.common.enums.OrderStatus;
import com.foodie.order.entity.Order;
import com.foodie.order.repository.OrderRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DeliveryAssignmentScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeliveryAssignmentScheduler.class);

    private final OrderRepository orderRepository;
    private final DeliveryService deliveryService;

    public DeliveryAssignmentScheduler(
            OrderRepository orderRepository,
            DeliveryService deliveryService) {
        this.orderRepository = orderRepository;
        this.deliveryService = deliveryService;
    }

    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void processScheduledAssignments() {
        Instant now = Instant.now();
        List<OrderStatus> eligibleStatuses = List.of(
                OrderStatus.CONFIRMED,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.WAITING_FOR_DELIVERY_PARTNER,
                OrderStatus.READY_FOR_PICKUP
        );

        List<Order> unassignedOrders = orderRepository.findByStatusInAndDeliveryPartnerIdIsNull(eligibleStatuses);

        for (Order order : unassignedOrders) {
            Instant scheduledAt = order.getAssignmentScheduledAt();
            if (scheduledAt == null || !scheduledAt.isAfter(now)) {
                try {
                    log.info("Scheduler processing delivery assignment for order {}", order.getId());
                    deliveryService.createAssignmentForOrder(order.getId());
                } catch (Exception ex) {
                    log.error("Failed scheduled assignment attempt for order {}: {}", order.getId(), ex.getMessage());
                }
            }
        }
    }
}
