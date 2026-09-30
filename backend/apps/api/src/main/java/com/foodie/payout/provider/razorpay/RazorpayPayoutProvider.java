package com.foodie.payout.provider.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.exception.ExternalServiceException;
import com.foodie.payout.config.PayoutProperties;
import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.dto.PayoutStatusResult;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.provider.PayoutProvider;
import com.foodie.wallet.entity.Payout;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class RazorpayPayoutProvider implements PayoutProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpayPayoutProvider.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;

    private final PayoutProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public RazorpayPayoutProvider(PayoutProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String keyId = properties.getRazorpay().getKeyId();
        String keySecret = properties.getRazorpay().getKeySecret();
        String basic = Base64.getEncoder().encodeToString(
                (keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
        this.restClient = RestClient.builder()
                .baseUrl(properties.getRazorpay().getApiBaseUrl())
                .defaultHeader("Authorization", "Basic " + basic)
                .build();
    }

    @Override
    public PayoutProviderType getProviderType() {
        return PayoutProviderType.RAZORPAY;
    }

    @Override
    public PayoutExecutionResult executePayout(Payout payout, String idempotencyKey) {
        if ("stub".equalsIgnoreCase(properties.getMode())) {
            return executeStubPayout(payout, idempotencyKey);
        }
        return executeWithRetry("executePayout", () -> executeLivePayout(payout, idempotencyKey));
    }

    @Override
    public PayoutStatusResult checkPayoutStatus(String providerPayoutId) {
        if ("stub".equalsIgnoreCase(properties.getMode())) {
            return PayoutStatusResult.completed(providerPayoutId, "STUB_UTR_" + providerPayoutId, "processed");
        }
        return executeWithRetry("checkPayoutStatus", () -> {
            try {
                String json = restClient.get()
                        .uri("/payouts/{id}", providerPayoutId)
                        .retrieve()
                        .body(String.class);
                JsonNode root = objectMapper.readTree(json == null ? "{}" : json);
                String id = root.path("id").asText(providerPayoutId);
                String status = root.path("status").asText("processing");
                String utr = root.path("utr").asText(null);
                String failureReason = root.path("failure_reason").asText(null);
                PayoutStatus mapped = mapRazorpayStatus(status);
                return new PayoutStatusResult(id, utr, status, mapped, failureReason);
            } catch (Exception ex) {
                log.error("Failed to query Razorpay payout status for {}", providerPayoutId, ex);
                throw new ExternalServiceException("Failed to check Razorpay payout status.");
            }
        });
    }

    @Override
    public boolean verifyWebhookSignature(String rawBody, Map<String, String> headers) {
        if (rawBody == null || headers == null) {
            return false;
        }
        String signature = headers.getOrDefault("X-Razorpay-Signature",
                headers.getOrDefault("x-razorpay-signature", ""));
        if (signature.isBlank()) {
            return false;
        }
        try {
            String secret = properties.getRazorpay().getWebhookSecret();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(String.format("%02x", b));
            }
            String expected = sb.toString();
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception ex) {
            log.error("Error computing Razorpay webhook HMAC signature", ex);
            return false;
        }
    }

    private PayoutExecutionResult executeLivePayout(Payout payout, String idempotencyKey) {
        long amountPaise = payout.getAmount().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("account_number", properties.getRazorpay().getAccountNumber());
        body.put("amount", amountPaise);
        body.put("currency", "INR");
        body.put("mode", "IMPS");
        body.put("purpose", "payout");

        Map<String, Object> fundAccount = new LinkedHashMap<>();
        fundAccount.put("account_type", "bank_account");
        Map<String, String> bankAccount = new LinkedHashMap<>();
        bankAccount.put("name", payout.getAccountHolderName() != null ? payout.getAccountHolderName() : "Delivery Partner");
        bankAccount.put("ifsc", payout.getIfscCode() != null ? payout.getIfscCode() : "");
        bankAccount.put("account_number", payout.getAccountNumber() != null ? payout.getAccountNumber() : "");
        fundAccount.put("bank_account", bankAccount);

        Map<String, String> contact = new LinkedHashMap<>();
        contact.put("name", payout.getAccountHolderName() != null ? payout.getAccountHolderName() : "Delivery Partner");
        contact.put("type", "delivery_partner");
        contact.put("reference_id", payout.getId().toString());
        fundAccount.put("contact", contact);

        body.put("fund_account", fundAccount);
        String idStr = payout.getId() != null ? payout.getId().toString() : UUID.randomUUID().toString();
        body.put("notes", Map.of("payoutId", idStr, "walletAccountId", payout.getWalletAccountId() != null ? payout.getWalletAccountId().toString() : ""));

        try {
            var requestSpec = restClient.post()
                    .uri("/payouts")
                    .contentType(MediaType.APPLICATION_JSON);

            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                requestSpec.header("X-Payout-Idempotency", idempotencyKey.trim());
            }

            String json = requestSpec.body(body).retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(json == null ? "{}" : json);

            String providerPayoutId = root.path("id").asText("pout_" + payout.getId().toString().replace("-", "").substring(0, 14));
            String rawStatus = root.path("status").asText("processing");
            String utr = root.path("utr").asText(null);
            String failureReason = root.path("failure_reason").asText(null);

            PayoutStatus mappedStatus = mapRazorpayStatus(rawStatus);
            if (mappedStatus == PayoutStatus.FAILED) {
                return PayoutExecutionResult.failed(providerPayoutId, rawStatus, failureReason != null ? failureReason : "Razorpay payout rejected");
            }
            if (mappedStatus == PayoutStatus.COMPLETED) {
                return PayoutExecutionResult.completed(providerPayoutId, utr, rawStatus);
            }
            return PayoutExecutionResult.processing(providerPayoutId, utr, rawStatus);
        } catch (RestClientResponseException ex) {
            int statusCode = ex.getStatusCode().value();
            log.error("Razorpay HTTP {} on /payouts: {}", statusCode, ex.getResponseBodyAsString());
            if (statusCode >= 500 || statusCode == 408 || statusCode == 429) {
                throw new ExternalServiceException("Razorpay payout service unavailable (" + statusCode + ")");
            }
            try {
                JsonNode errNode = objectMapper.readTree(ex.getResponseBodyAsString());
                String description = errNode.path("error").path("description").asText(ex.getMessage());
                return PayoutExecutionResult.failed(null, "REJECTED", description);
            } catch (Exception parseEx) {
                return PayoutExecutionResult.failed(null, "REJECTED", "Razorpay payout request rejected: " + ex.getMessage());
            }
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Razorpay payout call failed unexpectedly", ex);
            throw new ExternalServiceException("Razorpay payout call failed (timeout).");
        }
    }

    private PayoutExecutionResult executeStubPayout(Payout payout, String idempotencyKey) {
        String idStr = payout.getId() != null ? payout.getId().toString().replace("-", "") : UUID.randomUUID().toString().replace("-", "");
        String providerPayoutId = "pout_stub_" + (idStr.length() >= 14 ? idStr.substring(0, 14) : idStr);
        log.info("Stub Razorpay payout processed id={} amount={}", providerPayoutId, payout.getAmount());
        return PayoutExecutionResult.processing(providerPayoutId, "UTR_STUB_" + System.currentTimeMillis(), "processing");
    }

    public static PayoutStatus mapRazorpayStatus(String rawStatus) {
        if (rawStatus == null) {
            return PayoutStatus.PROCESSING;
        }
        return switch (rawStatus.toLowerCase().trim()) {
            case "processed", "success" -> PayoutStatus.COMPLETED;
            case "rejected", "failed", "reversed", "cancelled" -> PayoutStatus.FAILED;
            case "queued", "pending", "processing" -> PayoutStatus.PROCESSING;
            default -> PayoutStatus.PROCESSING;
        };
    }

    private <T> T executeWithRetry(String operation, ProviderCall<T> call) {
        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                return call.run();
            } catch (ExternalServiceException ex) {
                lastException = ex;
                if (attempt == MAX_RETRY_ATTEMPTS || !isRetryable(ex)) {
                    throw ex;
                }
                log.warn("Razorpay payout {} attempt {} failed (retryable): {}", operation, attempt, ex.getMessage());
                sleepBackoff(attempt);
            } catch (RuntimeException ex) {
                lastException = ex;
                if (attempt == MAX_RETRY_ATTEMPTS) {
                    throw new ExternalServiceException("Razorpay payout request failed after retries.");
                }
                log.warn("Razorpay payout {} attempt {} failed: {}", operation, attempt, ex.getMessage());
                sleepBackoff(attempt);
            }
        }
        throw lastException != null ? lastException : new ExternalServiceException("Razorpay payout request failed.");
    }

    private static boolean isRetryable(ExternalServiceException ex) {
        String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
        return msg.contains("timeout") || msg.contains("5xx") || msg.contains("unavailable") || msg.contains("429");
    }

    private static void sleepBackoff(int attempt) {
        try {
            Thread.sleep(100L * (1L << (attempt - 1)));
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new ExternalServiceException("Razorpay payout request interrupted.");
        }
    }

    @FunctionalInterface
    private interface ProviderCall<T> {
        T run();
    }
}
