package com.foodie.payment.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments/webhook")
@Tag(name = "Payment Webhook")
public class CashfreeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(CashfreeWebhookController.class);

    private final PaymentService paymentService;

    public CashfreeWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping({ "/cashfree" })
    @Operation(summary = "Cashfree webhook")
    public ResponseEntity<ApiResponse<Void>> cashfreeWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-webhook-signature", required = false) String signature,
            @RequestHeader(value = "x-webhook-timestamp", required = false) String timestamp) {
        log.info("Receiving Cashfree webhook traffic...");
        paymentService.handleWebhook(rawBody, signature, timestamp);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
