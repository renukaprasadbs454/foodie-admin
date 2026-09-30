package com.foodie.delivery.dto.response;

import java.util.UUID;

public record ActiveDeliveryPartnerResponseDto(
        UUID partnerId,
        String fullName,
        String vehicleNumber,
        String mobileNumber,
        String signatureRating,
        int completedOrders
) {
    public static ActiveDeliveryPartnerResponseDto unassigned() {
        return new ActiveDeliveryPartnerResponseDto(
                null,
                "Assigning Delivery Partner...",
                "",
                "",
                "5.0",
                0
        );
    }
}
