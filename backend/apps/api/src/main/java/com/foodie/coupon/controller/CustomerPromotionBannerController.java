package com.foodie.coupon.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.coupon.dto.response.PromotionBannerResponse;
import com.foodie.coupon.service.PromotionBannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/banners")
@Tag(name = "Customer — Promotion Banner")
public class CustomerPromotionBannerController {

    private final PromotionBannerService bannerService;

    public CustomerPromotionBannerController(PromotionBannerService bannerService) {
        this.bannerService = bannerService;
    }

    @GetMapping("/active")
    @Operation(summary = "Get active promotional banners")
    public ResponseEntity<ApiResponse<List<PromotionBannerResponse>>> getActiveBanners() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getActiveBanners()));
    }
}
