package com.foodie.user.dto.response;

import java.util.List;

public record CustomerLoyaltyResponseDto(
        int pointsBalance,
        String loyaltyTier,
        List<LoyaltyLedgerItemDto> ledgerHistory
) {}
