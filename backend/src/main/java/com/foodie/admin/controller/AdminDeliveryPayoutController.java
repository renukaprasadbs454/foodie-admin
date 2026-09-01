package com.foodie.admin.controller;

import com.foodie.admin.dto.response.AdminDeliveryPayoutResponseDto;
import com.foodie.admin.dto.response.AdminPayoutDetailResponseDto;
import com.foodie.admin.dto.response.AdminPayoutReconciliationDto;
import com.foodie.admin.service.AdminDeliveryPayoutService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.wallet.service.WalletService.PageResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/delivery-payouts")
@Tag(name = "Admin — Delivery Partner Payouts & Reconciliation")
public class AdminDeliveryPayoutController {

    private final AdminDeliveryPayoutService adminDeliveryPayoutService;

    public AdminDeliveryPayoutController(AdminDeliveryPayoutService adminDeliveryPayoutService) {
        this.adminDeliveryPayoutService = adminDeliveryPayoutService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'SETTLEMENT', 'VIEW')")
    @Operation(summary = "List delivery partner payouts with search, filters, and pagination")
    public ResponseEntity<ApiResponse<List<AdminDeliveryPayoutResponseDto>>> listPayouts(
            @RequestParam(required = false) String partnerQuery,
            @RequestParam(required = false) UUID payoutId,
            @RequestParam(required = false) PayoutStatus status,
            @RequestParam(required = false) PayoutProvider provider,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResult<AdminDeliveryPayoutResponseDto> result = adminDeliveryPayoutService.listPayouts(
                partnerQuery, payoutId, status, provider, dateFrom, dateTo, page, size);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'SETTLEMENT', 'VIEW')")
    @Operation(summary = "Get detailed delivery payout view with wallet and ledger investigation history")
    public ResponseEntity<ApiResponse<AdminPayoutDetailResponseDto>> getPayoutDetail(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminDeliveryPayoutService.getPayoutDetail(id)));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'SETTLEMENT', 'UPDATE')")
    @Operation(summary = "Retry an eligible failed delivery payout")
    public ResponseEntity<ApiResponse<AdminDeliveryPayoutResponseDto>> retryPayout(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminDeliveryPayoutService.retryPayout(id)));
    }

    @GetMapping("/reconciliation")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'SETTLEMENT', 'VIEW')")
    @Operation(summary = "Get payout reconciliation status overview and discrepancy details")
    public ResponseEntity<ApiResponse<AdminPayoutReconciliationDto>> getReconciliationOverview() {
        return ResponseEntity.ok(ApiResponse.success(adminDeliveryPayoutService.getReconciliationOverview()));
    }
}
