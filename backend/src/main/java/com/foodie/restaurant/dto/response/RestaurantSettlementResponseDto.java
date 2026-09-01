package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RestaurantSettlementResponseDto(
        UUID id,
        UUID restaurantId,
        String restaurantName,
        BigDecimal totalGrossSales,
        BigDecimal commissionAmount,
        BigDecimal netPayoutAmount,
        String status,
        String paymentReference,
        Instant periodStart,
        Instant periodEnd,
        Instant disbursedAt,
        Instant createdAt
) {
}
