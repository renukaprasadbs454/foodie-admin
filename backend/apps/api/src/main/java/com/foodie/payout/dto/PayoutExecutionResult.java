package com.foodie.payout.dto;

import com.foodie.common.enums.PayoutStatus;

public record PayoutExecutionResult(
        String providerPayoutId,
        String providerReferenceId,
        String providerStatus,
        PayoutStatus mappedStatus,
        String failureReason,
        boolean isSynchronousFailure
) {
    public static PayoutExecutionResult processing(String providerPayoutId, String providerReferenceId, String providerStatus) {
        return new PayoutExecutionResult(providerPayoutId, providerReferenceId, providerStatus, PayoutStatus.PROCESSING, null, false);
    }

    public static PayoutExecutionResult completed(String providerPayoutId, String providerReferenceId, String providerStatus) {
        return new PayoutExecutionResult(providerPayoutId, providerReferenceId, providerStatus, PayoutStatus.COMPLETED, null, false);
    }

    public static PayoutExecutionResult failed(String providerPayoutId, String providerStatus, String failureReason) {
        return new PayoutExecutionResult(providerPayoutId, null, providerStatus, PayoutStatus.FAILED, failureReason, true);
    }
}
