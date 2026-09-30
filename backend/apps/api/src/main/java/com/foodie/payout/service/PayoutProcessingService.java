package com.foodie.payout.service;

import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.enums.PayoutProviderType;
import java.util.Map;
import java.util.UUID;

public interface PayoutProcessingService {

    PayoutExecutionResult processPayout(UUID payoutId, String idempotencyKey);

    void handleWebhook(PayoutProviderType providerType, String rawBody, Map<String, String> headers);

    void checkAndUpdateStatus(UUID payoutId);
}
