package com.foodie.wallet.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.service.WalletService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
@Tag(name = "Wallet")
public class WalletController {

        private final WalletService walletService;
        private final com.foodie.payment.service.PaymentService paymentService;

        public WalletController(WalletService walletService, com.foodie.payment.service.PaymentService paymentService) {
                this.walletService = walletService;
                this.paymentService = paymentService;
        }

        @GetMapping("/balance")
        @PreAuthorize("hasAnyRole('DELIVERY_PARTNER', 'CUSTOMER')")
        @Operation(summary = "Get my wallet balance (cached derived value)")
        public ResponseEntity<ApiResponse<WalletBalanceResponseDto>> getBalance(
                        @AuthenticationPrincipal AuthPrincipal principal) {
                return ResponseEntity.ok(ApiResponse
                                .success(walletService.getBalance(principal.userId(), principal.userType())));
        }

        @GetMapping("/ledger")
        @PreAuthorize("hasAnyRole('DELIVERY_PARTNER', 'CUSTOMER')")
        @Operation(summary = "Get my ledger history")
        public ResponseEntity<ApiResponse<List<LedgerEntryResponseDto>>> getLedger(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size,
                        @RequestParam(required = false) String sort,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtFrom,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtTo) {
                var result = walletService.getLedger(
                                principal.userId(), principal.userType(), page, size, sort, createdAtFrom, createdAtTo);
                return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
        }

        @PostMapping("/payout-requests")
        @PreAuthorize("hasRole('DELIVERY_PARTNER')")
        @Operation(summary = "Request a payout (REQUESTED only — pending admin approval)")
        public ResponseEntity<ApiResponse<PayoutResponseDto>> requestPayout(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @Valid @RequestBody PayoutRequestDto request,
                        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
                return ResponseEntity.status(HttpStatus.ACCEPTED)
                                .body(ApiResponse.success(
                                                walletService.requestPayout(principal.userId(), request,
                                                                idempotencyKey)));
        }

        @GetMapping("/payouts")
        @PreAuthorize("hasRole('DELIVERY_PARTNER')")
        @Operation(summary = "Get my payout withdrawal history")
        public ResponseEntity<ApiResponse<List<PayoutResponseDto>>> getPayouts(
                        @AuthenticationPrincipal AuthPrincipal principal) {
                return ResponseEntity.ok(ApiResponse.success(
                                walletService.getPayouts(principal.userId(), principal.userType())));
        }

        @GetMapping("/payouts/{payoutId}")
        @PreAuthorize("hasRole('DELIVERY_PARTNER')")
        @Operation(summary = "Get specific payout details")
        public ResponseEntity<ApiResponse<PayoutResponseDto>> getPayoutDetail(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @org.springframework.web.bind.annotation.PathVariable java.util.UUID payoutId) {
                return ResponseEntity.ok(ApiResponse.success(
                                walletService.getPayoutDetail(principal.userId(), principal.userType(), payoutId)));
        }

        @PostMapping("/payouts/{payoutId}/complete")
        @PreAuthorize("hasRole('DELIVERY_PARTNER')")
        @Operation(summary = "Complete an approved payout withdrawal")
        public ResponseEntity<ApiResponse<PayoutResponseDto>> completePayout(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @org.springframework.web.bind.annotation.PathVariable java.util.UUID payoutId) {
                return ResponseEntity.ok(ApiResponse.success(
                                walletService.completeApprovedPayout(principal.userId(), payoutId)));
        }

        @PostMapping("/topup/initiate")
        @PreAuthorize("hasRole('CUSTOMER')")
        @Operation(summary = "Initiate wallet top-up payment via Razorpay")
        public ResponseEntity<ApiResponse<com.foodie.payment.dto.response.PaymentInitiationResponseDto>> initiateTopup(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestParam java.math.BigDecimal amount,
                        @RequestHeader(value = "Idempotency-Key") String idempotencyKey) {
                return ResponseEntity.ok(ApiResponse.success(
                                paymentService.initiateWalletTopup(principal.userId(), amount, idempotencyKey)));
        }

        @PostMapping("/topup/verify")
        @PreAuthorize("hasRole('CUSTOMER')")
        @Operation(summary = "Verify Razorpay payment signature and credit customer wallet")
        public ResponseEntity<ApiResponse<Boolean>> verifyTopup(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @Valid @RequestBody com.foodie.payment.dto.request.VerifyPaymentRequestDto request) {
                return ResponseEntity.ok(ApiResponse.success(
                                paymentService.verifyWalletTopup(principal.userId(), request)));
        }
}
