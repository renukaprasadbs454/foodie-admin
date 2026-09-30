package com.foodie.wallet.dto.response;

import com.foodie.common.enums.PayoutStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutResponseDto(
        UUID payoutId,
        PayoutStatus status,
        BigDecimal amount,
        Instant requestedDate,
        Instant processedDate,
        String accountHolderName,
        String accountNumber,
        String ifscCode,
        String bankName,
        String provider,
        String transactionId,
        String providerReference,
        String failureReason) {
}
