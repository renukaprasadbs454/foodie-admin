package com.foodie.coupon.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.service.impl.CouponServiceImpl;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/restaurant/coupons")
@Tag(name = "Restaurant — Campaign")
@Validated
public class RestaurantCouponController {

    private final CouponServiceImpl couponService;

    public RestaurantCouponController(CouponServiceImpl couponService) {
        this.couponService = couponService;
    }

    @PostMapping
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Request a new campaign/coupon (Pending Approval)")
    public ResponseEntity<ApiResponse<CouponResponseDto>> createCampaign(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateCouponRequestDto request) {
        
        // Force status to PENDING or let the service handle it?
        // Service right now just assumes CreateCouponRequestDto fields
        // Since we didn't add approvalStatus to CreateCouponRequestDto, we can use a wrapper or modify service.
        CouponResponseDto response = couponService.createForRestaurant(request, principal.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
