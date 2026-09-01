package com.foodie.restaurant.service;

import com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto;
import java.util.List;
import java.util.UUID;

public interface RestaurantSettlementService {
    List<RestaurantSettlementResponseDto> getAllSettlementsForAdmin(UUID restaurantId, String status);
    RestaurantSettlementResponseDto disburseSettlement(UUID settlementId, String paymentReference);
}
