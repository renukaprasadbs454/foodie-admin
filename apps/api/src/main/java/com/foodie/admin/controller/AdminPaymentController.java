package com.foodie.admin.controller;

import com.foodie.admin.dto.request.BulkApprovePayoutsRequestDto;
import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.AdminPayoutResponseDto;
import com.foodie.admin.dto.response.PaymentSettlementResponseDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import com.foodie.admin.service.AdminPaymentService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.OwnerType;
import com.foodie.payout.service.PayoutProcessingService;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/payments")
@Tag(name = "Admin — Payments & Settlement")
public class AdminPaymentController {

    private final AdminPaymentService adminPaymentService;
    private final com.foodie.restaurant.service.RestaurantSettlementService restaurantSettlementService;
    private final PayoutRepository payoutRepository;
    private final WalletAccountRepository walletAccountRepository;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final DeliveryPartnerLookup deliveryPartnerLookup;
    private final PayoutProcessingService payoutProcessingService;
    private final WalletService walletService;

    public AdminPaymentController(
            AdminPaymentService adminPaymentService,
            com.foodie.restaurant.service.RestaurantSettlementService restaurantSettlementService,
            PayoutRepository payoutRepository,
            WalletAccountRepository walletAccountRepository,
            RestaurantSummaryProvider restaurantSummaryProvider,
            DeliveryPartnerLookup deliveryPartnerLookup,
            PayoutProcessingService payoutProcessingService,
            WalletService walletService) {
        this.adminPaymentService = adminPaymentService;
        this.restaurantSettlementService = restaurantSettlementService;
        this.payoutRepository = payoutRepository;
        this.walletAccountRepository = walletAccountRepository;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.deliveryPartnerLookup = deliveryPartnerLookup;
        this.payoutProcessingService = payoutProcessingService;
        this.walletService = walletService;
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "List payment settlements with admin escrow & split breakdown")
    public ResponseEntity<ApiResponse<List<PaymentSettlementResponseDto>>> listSettlements() {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.listSettlements()));
    }

    @GetMapping("/restaurant-settlements")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "List restaurant settlements for admin review")
    public ResponseEntity<ApiResponse<List<com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto>>> listRestaurantSettlements(
            @RequestParam(required = false) java.util.UUID restaurantId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(
                restaurantSettlementService.getAllSettlementsForAdmin(restaurantId, status)));
    }

    @PostMapping("/restaurant-settlements/disburse")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Disburse payment to restaurant with transaction reference")
    public ResponseEntity<ApiResponse<com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto>> disburseRestaurantSettlement(
            @Valid @RequestBody com.foodie.restaurant.dto.request.DisburseSettlementRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                restaurantSettlementService.disburseSettlement(request.settlementId(), request.paymentReference())));
    }

    @GetMapping("/payouts")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "List payouts optionally filtered by partner type")
    public ResponseEntity<ApiResponse<List<AdminPayoutResponseDto>>> listPayouts(
            @RequestParam(required = false) OwnerType ownerType) {
        List<Payout> payouts;
        if (ownerType != null) {
            payouts = payoutRepository.findByOwnerType(ownerType);
        } else {
            payouts = payoutRepository.findAllByOrderByCreatedAtDesc();
        }

        List<AdminPayoutResponseDto> dtos = payouts.stream().map(p -> {
            String ownerName = p.getAccountHolderName();
            String partnerPhone = "";
            UUID partnerId = null;
            String accHolder = p.getAccountHolderName();
            String accNumber = p.getAccountNumber();
            String ifsc = p.getIfscCode();
            String bName = p.getBankName();

            WalletAccount acc = walletAccountRepository.findById(p.getWalletAccountId()).orElse(null);
            if (acc != null) {
                partnerId = acc.getOwnerId();
                if (acc.getOwnerType() == OwnerType.RESTAURANT) {
                    ownerName = restaurantSummaryProvider.findByRestaurantId(acc.getOwnerId())
                            .map(RestaurantSummaryProvider.RestaurantSummary::name)
                            .orElse(ownerName);
                } else if (acc.getOwnerType() == OwnerType.DELIVERY_PARTNER) {
                    var summary = deliveryPartnerLookup.findPartnerSummaryById(acc.getOwnerId());
                    if (summary.isPresent()) {
                        ownerName = summary.get().fullName();
                        partnerPhone = summary.get().phoneNumber() != null ? summary.get().phoneNumber() : "";
                    } else {
                        ownerName = deliveryPartnerLookup.findPartnerNameById(acc.getOwnerId()).orElse(ownerName);
                    }

                    var bankDetails = deliveryPartnerLookup.findBankDetailsByPartnerId(acc.getOwnerId());
                    if (bankDetails.isPresent()) {
                        var b = bankDetails.get();
                        if ((accHolder == null || accHolder.isBlank() || "Saved in Profile".equalsIgnoreCase(accHolder)) && b.accountHolderName() != null && !b.accountHolderName().isBlank()) {
                            accHolder = b.accountHolderName();
                        }
                        if ((accNumber == null || accNumber.isBlank() || "****".equals(accNumber)) && b.accountNumber() != null && !b.accountNumber().isBlank()) {
                            accNumber = b.accountNumber();
                        }
                        if ((ifsc == null || ifsc.isBlank() || "****".equals(ifsc)) && b.ifscCode() != null && !b.ifscCode().isBlank()) {
                            ifsc = b.ifscCode();
                        }
                        if ((bName == null || bName.isBlank() || "Saved in Profile".equalsIgnoreCase(bName)) && b.bankName() != null && !b.bankName().isBlank()) {
                            bName = b.bankName();
                        }
                    }
                }
            }
            return new AdminPayoutResponseDto(
                    p.getId(),
                    p.getWalletAccountId(),
                    partnerId,
                    p.getAmount(),
                    p.getStatus().name(),
                    accHolder,
                    accNumber,
                    ifsc,
                    bName,
                    p.getProvider() != null ? p.getProvider() : "CASHFREE",
                    p.getProviderPayoutId(),
                    p.getProviderReferenceId(),
                    p.getProviderStatus(),
                    p.getBankRef(),
                    p.getFailureReason(),
                    p.getProcessedAt(),
                    p.getCompletedAt(),
                    p.getCreatedAt(),
                    p.getUpdatedAt(),
                    ownerName,
                    partnerPhone);
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/payouts/{payoutId}")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Get payout details")
    public ResponseEntity<ApiResponse<AdminPayoutResponseDto>> getPayoutDetails(
            @org.springframework.web.bind.annotation.PathVariable UUID payoutId) {
        Payout p = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new com.foodie.common.exception.ResourceNotFoundException("Payout not found: " + payoutId));
        String ownerName = p.getAccountHolderName();
        String partnerPhone = "";
        UUID partnerId = null;
        String accHolder = p.getAccountHolderName();
        String accNumber = p.getAccountNumber();
        String ifsc = p.getIfscCode();
        String bName = p.getBankName();

        WalletAccount acc = walletAccountRepository.findById(p.getWalletAccountId()).orElse(null);
        if (acc != null) {
            partnerId = acc.getOwnerId();
            if (acc.getOwnerType() == OwnerType.RESTAURANT) {
                ownerName = restaurantSummaryProvider.findByRestaurantId(acc.getOwnerId())
                        .map(RestaurantSummaryProvider.RestaurantSummary::name)
                        .orElse(ownerName);
            } else if (acc.getOwnerType() == OwnerType.DELIVERY_PARTNER) {
                var summary = deliveryPartnerLookup.findPartnerSummaryById(acc.getOwnerId());
                if (summary.isPresent()) {
                    ownerName = summary.get().fullName();
                    partnerPhone = summary.get().phoneNumber() != null ? summary.get().phoneNumber() : "";
                } else {
                    ownerName = deliveryPartnerLookup.findPartnerNameById(acc.getOwnerId()).orElse(ownerName);
                }

                var bankDetails = deliveryPartnerLookup.findBankDetailsByPartnerId(acc.getOwnerId());
                if (bankDetails.isPresent()) {
                    var b = bankDetails.get();
                    if ((accHolder == null || accHolder.isBlank() || "Saved in Profile".equalsIgnoreCase(accHolder)) && b.accountHolderName() != null && !b.accountHolderName().isBlank()) {
                        accHolder = b.accountHolderName();
                    }
                    if ((accNumber == null || accNumber.isBlank() || "****".equals(accNumber)) && b.accountNumber() != null && !b.accountNumber().isBlank()) {
                        accNumber = b.accountNumber();
                    }
                    if ((ifsc == null || ifsc.isBlank() || "****".equals(ifsc)) && b.ifscCode() != null && !b.ifscCode().isBlank()) {
                        ifsc = b.ifscCode();
                    }
                    if ((bName == null || bName.isBlank() || "Saved in Profile".equalsIgnoreCase(bName)) && b.bankName() != null && !b.bankName().isBlank()) {
                        bName = b.bankName();
                    }
                }
            }
        }
        return ResponseEntity.ok(ApiResponse.success(new AdminPayoutResponseDto(
                p.getId(),
                p.getWalletAccountId(),
                partnerId,
                p.getAmount(),
                p.getStatus().name(),
                accHolder,
                accNumber,
                ifsc,
                bName,
                p.getProvider() != null ? p.getProvider() : "CASHFREE",
                p.getProviderPayoutId(),
                p.getProviderReferenceId(),
                p.getProviderStatus(),
                p.getBankRef(),
                p.getFailureReason(),
                p.getProcessedAt(),
                p.getCompletedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                ownerName,
                partnerPhone)));
    }

    @PostMapping("/payouts/{payoutId}/approve")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Approve delivery partner payout request")
    public ResponseEntity<ApiResponse<com.foodie.wallet.dto.response.PayoutResponseDto>> approveSinglePayout(
            @org.springframework.web.bind.annotation.PathVariable UUID payoutId) {
        return ResponseEntity.ok(ApiResponse.success(walletService.approvePayout(payoutId)));
    }

    @PostMapping("/payouts/{payoutId}/reject")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Reject delivery partner payout request")
    public ResponseEntity<ApiResponse<com.foodie.wallet.dto.response.PayoutResponseDto>> rejectSinglePayout(
            @org.springframework.web.bind.annotation.PathVariable UUID payoutId,
            @RequestBody(required = false) com.foodie.admin.dto.request.RejectPayoutRequestDto request) {
        String reason = request != null ? request.reason() : "Rejected by Admin";
        return ResponseEntity.ok(ApiResponse.success(walletService.rejectPayout(payoutId, reason)));
    }

    @PostMapping("/payouts/approve")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Bulk approve payouts")
    public ResponseEntity<ApiResponse<String>> approvePayouts(
            @Valid @RequestBody BulkApprovePayoutsRequestDto request) {
        for (java.util.UUID payoutId : request.payoutIds()) {
            walletService.approvePayout(payoutId);
        }
        return ResponseEntity
                .ok(ApiResponse.success("Approved " + request.payoutIds().size() + " payouts."));
    }

    @GetMapping("/commission-rules")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Get active commission and platform fee rules")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> getCommissionRules() {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.getCommissionRules()));
    }

    @PostMapping("/commission-rules")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Update active commission and platform fee rules")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> updateCommissionRules(
            @Valid @RequestBody CommissionConfigDto config) {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.updateCommissionRules(config)));
    }

    @PostMapping("/calculate-split")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Calculate payment split breakdown for given subtotal and delivery fee")
    public ResponseEntity<ApiResponse<PaymentSplitBreakdownDto>> calculateSplit(
            @RequestParam(defaultValue = "0.00") BigDecimal foodSubtotal,
            @RequestParam(defaultValue = "0.00") BigDecimal deliveryFee) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPaymentService.calculateSplit(foodSubtotal, deliveryFee)));
    }
}
