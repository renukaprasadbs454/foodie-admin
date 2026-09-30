package com.foodie.delivery.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CashDepositRequestDto(
        @NotNull(message = "Amount is required.")
        @DecimalMin(value = "1.00", message = "Minimum deposit amount is 1.00.")
        BigDecimal amount,

        String referenceNumber
) {}
