package com.foodie.order.dto.response;

import java.time.Instant;
import java.util.UUID;

public record OrderMessageResponseDto(
        UUID id,
        UUID orderId,
        String senderRole,
        UUID senderId,
        String messageText,
        Instant createdAt) {
}
