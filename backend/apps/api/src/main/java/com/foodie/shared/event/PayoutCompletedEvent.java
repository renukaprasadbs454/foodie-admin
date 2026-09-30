package com.foodie.shared.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutCompletedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID payoutId,
        UUID walletAccountId,
        UUID deliveryPartnerId,
        BigDecimal amount,
        String provider,
        String providerPayoutId,
        String bankRef
) implements DomainEvent {

    public static PayoutCompletedEvent of(
            UUID payoutId,
            UUID walletAccountId,
            UUID deliveryPartnerId,
            BigDecimal amount,
            String provider,
            String providerPayoutId,
            String bankRef
    ) {
        return new PayoutCompletedEvent(
                UUID.randomUUID(),
                Instant.now(),
                payoutId,
                walletAccountId,
                deliveryPartnerId,
                amount,
                provider,
                providerPayoutId,
                bankRef
        );
    }
}
