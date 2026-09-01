package com.foodie.admin.service;

import com.foodie.admin.dto.response.AdminDeliveryPayoutResponseDto;
import com.foodie.admin.dto.response.AdminPayoutDetailResponseDto;
import com.foodie.admin.dto.response.AdminPayoutReconciliationDto;
import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.wallet.service.WalletService.PageResult;
import java.time.Instant;
import java.util.UUID;

public interface AdminDeliveryPayoutService {

    PageResult<AdminDeliveryPayoutResponseDto> listPayouts(
            String partnerQuery,
            UUID payoutId,
            PayoutStatus status,
            PayoutProvider provider,
            Instant dateFrom,
            Instant dateTo,
            int page,
            int size
    );

    AdminPayoutDetailResponseDto getPayoutDetail(UUID payoutId);

    AdminDeliveryPayoutResponseDto retryPayout(UUID payoutId);

    AdminPayoutReconciliationDto getReconciliationOverview();
}
