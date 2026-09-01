package com.foodie.darkstore.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DarkstoreProfileDto(
        UUID id,
        String code,
        String name,
        String address,
        String phone,
        String status,
        BigDecimal deliveryRadiusKm,
        String serviceableAreas,
        String openTime,
        String closeTime,
        int staffCount,
        long activeOrdersCount,
        long totalProductsCount
) {
}
