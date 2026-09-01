package com.foodie.admin.dto.response;

import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import java.math.BigDecimal;
import java.util.List;

public record AdminPayoutDetailResponseDto(
        AdminDeliveryPayoutResponseDto payout,
        BigDecimal walletBalance,
        BigDecimal totalEarned,
        List<LedgerEntryResponseDto> ledgerHistory,
        ProviderInfoReadonly providerInfo
) {
    public record ProviderInfoReadonly(
            String providerName,
            String gatewayMode,
            String webhookStatus,
            String lastPingAt
    ) {}
}
