package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderRepository;
import com.foodie.shared.contract.OrderRestaurantAmountQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class OrderRestaurantAmountQueryImpl implements OrderRestaurantAmountQuery {

    private final OrderRepository orderRepository;

    public OrderRestaurantAmountQueryImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RestaurantOrderAmount> findAmountByOrderId(UUID orderId) {
        return orderRepository.findById(orderId)
                .map(order -> new RestaurantOrderAmount(
                        order.getRestaurantId(),
                        order.getSubtotal(),
                        order.getTaxAmount()));
    }
}
