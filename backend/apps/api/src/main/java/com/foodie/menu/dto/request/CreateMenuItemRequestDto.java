package com.foodie.menu.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateMenuItemRequestDto(
        UUID categoryId,
        String name,
        String description,
        BigDecimal basePrice,
        Boolean isVeg,
        String foodType,
        String packageSize,
        String preparationTime,
        BigDecimal gstPct) {
    public CreateMenuItemRequestDto(
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            Boolean isVeg,
            String foodType) {
        this(categoryId, name, description, basePrice, isVeg, foodType, null, null, null);
    }

    public CreateMenuItemRequestDto(
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            Boolean isVeg) {
        this(categoryId, name, description, basePrice, isVeg, isVeg != null ? (isVeg ? "VEG" : "NON_VEG") : null, null,
                null, null);
    }

    public boolean resolveIsVeg() {
        if (foodType != null) {
            return "VEG".equalsIgnoreCase(foodType);
        }
        return Boolean.TRUE.equals(isVeg);
    }

    public String resolveFoodType() {
        if (foodType != null) {
            return foodType.toUpperCase();
        }
        return Boolean.TRUE.equals(isVeg) ? "VEG" : "NON_VEG";
    }
}
