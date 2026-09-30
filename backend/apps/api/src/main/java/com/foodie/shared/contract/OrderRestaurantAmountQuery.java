package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface OrderRestaurantAmountQuery {

    Optional<RestaurantOrderAmount> findAmountByOrderId(UUID orderId);

    record RestaurantOrderAmount(
            UUID restaurantId,
            BigDecimal subtotal,
            BigDecimal taxAmount) {
    }
}
