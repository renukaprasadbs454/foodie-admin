package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record LivePartnerLocationDto(
        UUID partnerId,
        String fullName,
        String vehicleNumber,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean isOnline,
        BigDecimal cashInHand,
        boolean isCashLimitExceeded
) {}
