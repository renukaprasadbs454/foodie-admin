package com.foodie.coupon.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record UpdatePromotionBannerRequest(
        @NotBlank String title,
        String subtitle,
        String imageUrl,
        String ctaText,
        String ctaType,
        String ctaTarget,
        String status,
        @NotNull Integer displayOrder,
        Instant startsAt,
        Instant endsAt,
        UUID couponId,
        UUID campaignId) {
}
