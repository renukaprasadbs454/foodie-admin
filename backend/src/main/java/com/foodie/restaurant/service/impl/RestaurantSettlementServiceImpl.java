package com.foodie.restaurant.service.impl;

import com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto;
import com.foodie.restaurant.service.RestaurantSettlementService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RestaurantSettlementServiceImpl implements RestaurantSettlementService {

    @Override
    public List<RestaurantSettlementResponseDto> getAllSettlementsForAdmin(UUID restaurantId, String status) {
        List<RestaurantSettlementResponseDto> list = new ArrayList<>();
        list.add(new RestaurantSettlementResponseDto(
                UUID.fromString("77777777-7777-7777-7777-777777777001"),
                restaurantId != null ? restaurantId : UUID.fromString("55555555-5555-5555-5555-555555555001"),
                "Meghana Foods",
                new BigDecimal("124500.00"),
                new BigDecimal("18675.00"),
                new BigDecimal("105825.00"),
                status != null ? status : "PENDING",
                null,
                Instant.now().minusSeconds(86400 * 7),
                Instant.now(),
                null,
                Instant.now().minusSeconds(86400)
        ));
        return list;
    }

    @Override
    public RestaurantSettlementResponseDto disburseSettlement(UUID settlementId, String paymentReference) {
        return new RestaurantSettlementResponseDto(
                settlementId != null ? settlementId : UUID.fromString("77777777-7777-7777-7777-777777777001"),
                UUID.fromString("55555555-5555-5555-5555-555555555001"),
                "Meghana Foods",
                new BigDecimal("124500.00"),
                new BigDecimal("18675.00"),
                new BigDecimal("105825.00"),
                "DISBURSED",
                paymentReference,
                Instant.now().minusSeconds(86400 * 7),
                Instant.now(),
                Instant.now(),
                Instant.now().minusSeconds(86400)
        );
    }
}
