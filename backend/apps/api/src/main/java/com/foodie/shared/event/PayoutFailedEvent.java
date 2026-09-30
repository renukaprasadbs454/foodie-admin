package com.foodie.shared.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutFailedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID payoutId,
        UUID walletAccountId,
        UUID deliveryPartnerId,
        BigDecimal amount,
        String provider,
        String failureReason
) implements DomainEvent {

    public static PayoutFailedEvent of(
            UUID payoutId,
            UUID walletAccountId,
            UUID deliveryPartnerId,
            BigDecimal amount,
            String provider,
            String failureReason
    ) {
        return new PayoutFailedEvent(
                UUID.randomUUID(),
                Instant.now(),
                payoutId,
                walletAccountId,
                deliveryPartnerId,
                amount,
                provider,
                failureReason
        );
    }
}
