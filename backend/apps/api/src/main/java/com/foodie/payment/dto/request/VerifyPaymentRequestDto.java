package com.foodie.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record VerifyPaymentRequestDto(
        @NotNull(message = "orderId is required")
        UUID orderId,

        String cashfreeOrderId
) {
}
