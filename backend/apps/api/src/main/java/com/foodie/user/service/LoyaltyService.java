package com.foodie.user.service;

import com.foodie.user.dto.response.CustomerLoyaltyResponseDto;
import java.math.BigDecimal;
import java.util.UUID;

public interface LoyaltyService {

    CustomerLoyaltyResponseDto getLoyaltyProfile(UUID userCredentialId);

    void processOrderDeliveryLoyaltyPoints(UUID orderId, UUID customerId, BigDecimal orderTotal);

    CustomerLoyaltyResponseDto convertPointsToWallet(UUID userCredentialId, int pointsToConvert);
}
