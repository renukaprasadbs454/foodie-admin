package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashDepositResponseDto(
        UUID id,
        UUID partnerId,
        String partnerName,
        BigDecimal amount,
        String status,
        String referenceNumber,
        String rejectionReason,
        Instant createdAt,
        Instant approvedAt
) {}
