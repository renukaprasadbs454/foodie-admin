package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record DeliveryLocationResponseDto(
        BigDecimal latitude,
        BigDecimal longitude,
        Instant recordedAt
) {}
