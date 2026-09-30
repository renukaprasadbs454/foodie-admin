package com.foodie.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrderMessageRequestDto(
        @NotBlank @Size(max = 1000) String messageText,
        @NotBlank String senderRole) {
}
