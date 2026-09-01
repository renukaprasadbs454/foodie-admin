package com.foodie.admin.dto.response;

import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.enums.ReconciliationStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminDeliveryPayoutResponseDto(
        UUID id,
        UUID walletAccountId,
        UUID partnerId,
        String partnerName,
        String partnerPhone,
        BigDecimal amount,
        PayoutStatus status,
        PayoutProvider provider,
        String bankRef,
        String failureReason,
        Instant requestedAt,
        Instant processedAt,
        ReconciliationStatus reconciliationStatus,
        boolean retryEligible,
        String accountHolderName,
        String accountNumber,
        String ifscCode,
        String bankName
) {
}
