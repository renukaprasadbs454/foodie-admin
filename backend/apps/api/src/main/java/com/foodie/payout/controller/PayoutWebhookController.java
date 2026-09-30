package com.foodie.payout.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.service.PayoutProcessingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payouts/webhook")
@Tag(name = "Payout Webhook")
public class PayoutWebhookController {

    private final PayoutProcessingService payoutProcessingService;

    public PayoutWebhookController(PayoutProcessingService payoutProcessingService) {
        this.payoutProcessingService = payoutProcessingService;
    }

    @PostMapping("/razorpay")
    @Operation(summary = "Razorpay payout webhook (HMAC verified; no JWT)")
    public ResponseEntity<ApiResponse<Void>> razorpayPayoutWebhook(
            @RequestBody String rawBody,
            @RequestHeader Map<String, String> headers
    ) {
        payoutProcessingService.handleWebhook(PayoutProviderType.RAZORPAY, rawBody, headers);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/cashfree")
    @Operation(summary = "Cashfree payout webhook (HMAC verified; no JWT)")
    public ResponseEntity<ApiResponse<Void>> cashfreePayoutWebhook(
            @RequestBody String rawBody,
            @RequestHeader Map<String, String> headers
    ) {
        payoutProcessingService.handleWebhook(PayoutProviderType.CASHFREE, rawBody, headers);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
