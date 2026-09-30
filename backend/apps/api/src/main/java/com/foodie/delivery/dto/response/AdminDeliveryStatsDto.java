package com.foodie.delivery.dto.response;

import java.math.BigDecimal;

public record AdminDeliveryStatsDto(
        long totalFleet,
        long onlineCount,
        long pendingKycCount,
        long verifiedCount,
        long rejectedKycCount,
        BigDecimal totalCashInHand
) {}
