package com.foodie.menu.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record FullMenuResponseDto(
                UUID restaurantId,
                List<MenuCategoryDto> categories) {
        public record MenuCategoryDto(
                        UUID categoryId,
                        String name,
                        int displayOrder,
                        List<MenuItemDto> items) {
        }

        public record MenuItemDto(
                        UUID menuItemId,
                        String name,
                        String description,
                        BigDecimal basePrice,
                        boolean isVeg,
                        String foodType,
                        boolean isAvailable,
                        String imageUrl,
                        String packageSize,
                        String preparationTime,
                        BigDecimal gstPct,
                        List<VariantResponseDto> variants) {
        }
}
