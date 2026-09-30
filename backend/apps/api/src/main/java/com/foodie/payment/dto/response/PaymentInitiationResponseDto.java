package com.foodie.payment.dto.response;

import java.math.BigDecimal;

public record PaymentInitiationResponseDto(
                String paymentSessionId,
                String cfOrderId,
                BigDecimal amount,
                String currency,
                String appId,
                BigDecimal walletAmountUsed,
                String status) {
}

