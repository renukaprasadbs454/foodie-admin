package com.foodie.delivery.dto.response;

import com.foodie.common.enums.KycStatus;
import com.foodie.common.enums.VehicleType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminDeliveryPartnerResponseDto(
        UUID id,
        UUID userCredentialId,
        String fullName,
        String phoneNumber,
        String email,
        VehicleType vehicleType,
        String vehicleNumber,
        String profileImageUrl,
        KycStatus kycStatus,
        String kycRejectionReason,
        boolean isOnline,
        BigDecimal cashInHand,
        BigDecimal maxCashInHandLimit,
        long totalDeliveries,
        String zone,
        List<DeliveryDocumentResponseDto> documents,
        Instant createdAt
) {}
