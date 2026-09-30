package com.foodie.coupon.mapper;

import com.foodie.coupon.dto.response.PromotionBannerResponse;
import com.foodie.coupon.entity.PromotionBanner;
import org.springframework.stereotype.Component;

@Component
public class PromotionBannerMapper {
    public PromotionBannerResponse toResponse(PromotionBanner entity) {
        return new PromotionBannerResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getSubtitle(),
                entity.getImageUrl(),
                entity.getCtaText(),
                entity.getCtaType() != null ? entity.getCtaType().name() : null,
                entity.getCtaTarget(),
                entity.getStatus().name(),
                entity.getDisplayOrder(),
                entity.getStartsAt(),
                entity.getEndsAt(),
                entity.getCouponId(),
                entity.getCampaignId());
    }
}
