package com.foodie.user.dto.response;

import java.time.Instant;
import java.util.UUID;

public record LoyaltyLedgerItemDto(
        UUID id,
        int points,
        String entryType,
        String referenceType,
        UUID referenceId,
        String description,
        Instant createdAt
) {}
