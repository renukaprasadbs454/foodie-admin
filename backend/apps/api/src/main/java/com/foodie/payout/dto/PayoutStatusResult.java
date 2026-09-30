package com.foodie.payout.dto;

import com.foodie.common.enums.PayoutStatus;

public record PayoutStatusResult(
        String providerPayoutId,
        String providerReferenceId,
        String providerStatus,
        PayoutStatus mappedStatus,
        String failureReason
) {
    public static PayoutStatusResult processing(String providerPayoutId, String providerReferenceId, String providerStatus) {
        return new PayoutStatusResult(providerPayoutId, providerReferenceId, providerStatus, PayoutStatus.PROCESSING, null);
    }

    public static PayoutStatusResult completed(String providerPayoutId, String providerReferenceId, String providerStatus) {
        return new PayoutStatusResult(providerPayoutId, providerReferenceId, providerStatus, PayoutStatus.COMPLETED, null);
    }

    public static PayoutStatusResult failed(String providerPayoutId, String providerStatus, String failureReason) {
        return new PayoutStatusResult(providerPayoutId, null, providerStatus, PayoutStatus.FAILED, failureReason);
    }
}
