package com.foodie.darkstore.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DarkstoreProductDto(
        UUID id,
        UUID darkstoreId,
        String sku,
        String name,
        String category,
        String imageUrl,
        BigDecimal price,
        BigDecimal sellingPrice,
        int currentStock,
        int reservedStock,
        int availableStock,
        int minThreshold,
        String unit,
        BigDecimal taxPercent,
        String shelfLocation,
        String status,
        boolean isLowStock,
        boolean isOutOfStock,
        Instant createdAt,
        Instant updatedAt
) {
}
