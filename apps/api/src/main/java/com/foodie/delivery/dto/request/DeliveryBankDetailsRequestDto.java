package com.foodie.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;

public record DeliveryBankDetailsRequestDto(
        @NotBlank(message = "Account holder name is required") String accountHolderName,
        @NotBlank(message = "Account number is required") String accountNumber,
        @NotBlank(message = "IFSC code is required") String ifscCode,
        @NotBlank(message = "Bank name is required") String bankName
) {
}
