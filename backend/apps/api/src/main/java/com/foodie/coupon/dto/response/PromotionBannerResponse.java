package com.foodie.coupon.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PromotionBannerResponse(
        UUID id,
        String title,
        String subtitle,
        String imageUrl,
        String ctaText,
        String ctaType,
        String ctaTarget,
        String status,
        int displayOrder,
        Instant startsAt,
        Instant endsAt,
        UUID couponId,
        UUID campaignId) {
}
