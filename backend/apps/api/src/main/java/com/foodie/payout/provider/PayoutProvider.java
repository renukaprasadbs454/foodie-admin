package com.foodie.payout.provider;

import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.dto.PayoutStatusResult;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.wallet.entity.Payout;
import java.util.Map;

/**
 * Common abstraction for payout providers (Razorpay, Cashfree).
 */
public interface PayoutProvider {

    PayoutProviderType getProviderType();

    /**
     * Sends payout request to provider with idempotency protection.
     */
    PayoutExecutionResult executePayout(Payout payout, String idempotencyKey);

    /**
     * Polls or verifies payout status with provider directly.
     */
    PayoutStatusResult checkPayoutStatus(String providerPayoutId);

    /**
     * Verifies webhook/callback authenticity via HMAC or signature headers.
     */
    boolean verifyWebhookSignature(String rawBody, Map<String, String> headers);
}
