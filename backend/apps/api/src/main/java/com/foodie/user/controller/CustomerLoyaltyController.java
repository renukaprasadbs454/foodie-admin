package com.foodie.user.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import com.foodie.user.dto.response.CustomerLoyaltyResponseDto;
import com.foodie.user.service.LoyaltyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers/loyalty")
@Tag(name = "Customer — Loyalty Points")
public class CustomerLoyaltyController {

    private final LoyaltyService loyaltyService;

    public CustomerLoyaltyController(LoyaltyService loyaltyService) {
        this.loyaltyService = loyaltyService;
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get customer loyalty points balance, tier, and points ledger history")
    public ResponseEntity<ApiResponse<CustomerLoyaltyResponseDto>> getLoyaltyProfile(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(loyaltyService.getLoyaltyProfile(principal.userId())));
    }

    @PostMapping("/convert-to-wallet")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Convert accumulated loyalty points to customer wallet balance (100 pts = ₹10)")
    public ResponseEntity<ApiResponse<CustomerLoyaltyResponseDto>> convertPointsToWallet(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam int points) {
        return ResponseEntity.ok(ApiResponse.success(loyaltyService.convertPointsToWallet(principal.userId(), points)));
    }
}
