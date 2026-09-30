package com.foodie.payment.service;

import com.foodie.payment.dto.request.RefundPaymentRequestDto;
import com.foodie.payment.dto.response.PaymentInitiationResponseDto;
import com.foodie.payment.dto.response.RefundInitiationResponseDto;
import java.util.UUID;

import com.foodie.payment.dto.request.VerifyPaymentRequestDto;

public interface PaymentService {

    PaymentInitiationResponseDto initiate(UUID userCredentialId, UUID orderId, String idempotencyKey,
            boolean useWallet);

    boolean verifyPayment(UUID userCredentialId, VerifyPaymentRequestDto request);

    void handleWebhook(String rawBody, String signatureHeader, String timestamp);

    RefundInitiationResponseDto refund(
            UUID paymentId,
            RefundPaymentRequestDto request,
            UUID actorId,
            boolean systemActor);

    PaymentInitiationResponseDto initiateWalletTopup(UUID userCredentialId, java.math.BigDecimal amount, String idempotencyKey);

    boolean verifyWalletTopup(UUID userCredentialId, VerifyPaymentRequestDto request);
}
