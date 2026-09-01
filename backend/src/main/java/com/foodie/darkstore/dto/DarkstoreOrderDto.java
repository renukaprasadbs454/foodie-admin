package com.foodie.darkstore.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DarkstoreOrderDto(
        UUID id,
        String orderNumber,
        UUID darkstoreId,
        String customerName,
        String customerPhone,
        String deliveryAddress,
        BigDecimal totalAmount,
        String status,
        String priority,
        String assignedPicker,
        String assignedPacker,
        String deliveryPartnerName,
        String deliveryPartnerPhone,
        String pickupStatus,
        String cancellationReason,
        Instant createdAt,
        Instant updatedAt,
        List<OrderItemDto> items
) {
    public record OrderItemDto(
            UUID id,
            UUID productId,
            String sku,
            String productName,
            String imageUrl,
            String shelfLocation,
            int quantityRequested,
            int quantityPicked,
            BigDecimal unitPrice,
            String status
    ) {}
}
