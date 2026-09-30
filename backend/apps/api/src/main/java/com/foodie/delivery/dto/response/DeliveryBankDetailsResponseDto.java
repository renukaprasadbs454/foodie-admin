package com.foodie.delivery.dto.response;

public record DeliveryBankDetailsResponseDto(
        String accountHolderName,
        String accountNumber,
        String ifscCode,
        String bankName
) {
}
