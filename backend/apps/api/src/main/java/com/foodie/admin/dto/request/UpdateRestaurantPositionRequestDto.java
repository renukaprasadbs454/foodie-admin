package com.foodie.admin.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record UpdateRestaurantPositionRequestDto(
        @NotNull(message = "Restaurant ID is required") UUID restaurantId,
        @NotNull(message = "Position is required") Integer position
) {
}
