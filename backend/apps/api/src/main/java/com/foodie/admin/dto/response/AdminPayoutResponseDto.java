package com.foodie.admin.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminPayoutResponseDto(
        UUID id,
        UUID walletAccountId,
        UUID partnerId,
        BigDecimal amount,
        String status,
        String accountHolderName,
        String accountNumber,
        String ifscCode,
        String bankName,
        String provider,
        String providerPayoutId,
        String providerReferenceId,
        String providerStatus,
        String bankRef,
        String failureReason,
        Instant processedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt,
        String ownerName,
        String partnerPhone
) {
}
