package com.foodie.whatsapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/whatsapp")
@Tag(name = "WhatsApp Webhook")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    @Value("${foodie.whatsapp.verify-token:${whatsapp.verify-token:foodie_whatsapp_verify_token_2026}}")
    private String verifyToken;

    @GetMapping
    @Operation(summary = "Verify WhatsApp Webhook")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {

        log.info("Received WhatsApp Webhook verification request. mode={}, token={}, challenge={}", mode, token,
                challenge);

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("WhatsApp Webhook verified successfully.");
            return ResponseEntity.ok(challenge);
        } else {
            log.warn("WhatsApp Webhook verification failed. Expected token: {}, but got: {}", verifyToken, token);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
        }
    }

    @PostMapping
    @Operation(summary = "Receive WhatsApp Webhook Events")
    public ResponseEntity<Void> receiveEvent(@RequestBody String payload) {
        log.info("Received WhatsApp Webhook POST Event:\n{}", payload);
        // Process status events or incoming messages here
        return ResponseEntity.ok().build();
    }
}
