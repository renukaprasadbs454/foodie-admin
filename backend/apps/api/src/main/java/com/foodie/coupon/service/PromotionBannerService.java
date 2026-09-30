package com.foodie.coupon.service;

import com.foodie.coupon.dto.request.CreatePromotionBannerRequest;
import com.foodie.coupon.dto.request.UpdatePromotionBannerRequest;
import com.foodie.coupon.dto.response.PromotionBannerResponse;
import java.util.List;
import java.util.UUID;

public interface PromotionBannerService {
    List<PromotionBannerResponse> getActiveBanners();

    List<PromotionBannerResponse> getAllBanners();

    PromotionBannerResponse getBanner(UUID id);

    PromotionBannerResponse createBanner(CreatePromotionBannerRequest request);

    PromotionBannerResponse updateBanner(UUID id, UpdatePromotionBannerRequest request);

    void deleteBanner(UUID id);

    PromotionBannerResponse activateBanner(UUID id);

    PromotionBannerResponse deactivateBanner(UUID id);
}
