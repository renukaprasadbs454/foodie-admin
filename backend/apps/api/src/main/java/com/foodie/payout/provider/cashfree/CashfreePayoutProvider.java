package com.foodie.payout.provider.cashfree;

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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
public class CashfreePayoutProvider implements PayoutProvider {

    private static final Logger log = LoggerFactory.getLogger(CashfreePayoutProvider.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;

    private final PayoutProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public CashfreePayoutProvider(PayoutProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(properties.getCashfree().getApiBaseUrl())
                .build();
    }

    @Override
    public PayoutProviderType getProviderType() {
        return PayoutProviderType.CASHFREE;
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
            return PayoutStatusResult.completed(providerPayoutId, "CF_UTR_" + providerPayoutId, "SUCCESS");
        }
        return executeWithRetry("checkPayoutStatus", () -> {
            try {
                String json = restClient.get()
                        .uri("/getTransferStatus?transferId={id}", providerPayoutId)
                        .retrieve()
                        .body(String.class);
                JsonNode root = objectMapper.readTree(json == null ? "{}" : json);
                JsonNode data = root.path("data").path("transfer");
                String id = data.path("transferId").asText(providerPayoutId);
                String status = data.path("status").asText(root.path("status").asText("PENDING"));
                String utr = data.path("utr").asText(data.path("referenceId").asText(null));
                String failureReason = root.path("message").asText(null);
                PayoutStatus mapped = mapCashfreeStatus(status);
                return new PayoutStatusResult(id, utr, status, mapped, failureReason);
            } catch (Exception ex) {
                log.error("Failed to check Cashfree payout status for {}", providerPayoutId, ex);
                throw new ExternalServiceException("Failed to check Cashfree payout status.");
            }
        });
    }

    @Override
    public boolean verifyWebhookSignature(String rawBody, Map<String, String> headers) {
        if (rawBody == null || headers == null) {
            return false;
        }
        String signature = headers.getOrDefault("X-Cf-Signature",
                headers.getOrDefault("x-cf-signature", headers.getOrDefault("signature", "")));
        if (signature.isBlank()) {
            return false;
        }
        try {
            String secret = properties.getCashfree().getWebhookSecret();
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
                    signature.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            log.error("Error computing Cashfree webhook HMAC signature", ex);
            return false;
        }
    }

    private PayoutExecutionResult executeLivePayout(Payout payout, String idempotencyKey) {
        String idStr = payout.getId() != null ? payout.getId().toString().replace("-", "")
                : UUID.randomUUID().toString().replace("-", "");
        String transferId = "CF_" + (idStr.length() >= 16 ? idStr.substring(0, 16) : idStr);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("transferId", transferId);
        body.put("amount", payout.getAmount().toPlainString());
        body.put("transferMode", "banktransfer");
        body.put("remarks", "Delivery partner payout " + (payout.getId() != null ? payout.getId() : ""));

        Map<String, Object> beneDetails = new LinkedHashMap<>();
        beneDetails.put("beneId", "BENE_" + idStr.substring(0, 8));
        beneDetails.put("name",
                payout.getAccountHolderName() != null && !payout.getAccountHolderName().isBlank()
                        ? payout.getAccountHolderName()
                        : "Partner");
        beneDetails.put("email", "partner@foodie.com");
        beneDetails.put("phone", "9999999999");
        beneDetails.put("bankAccount", payout.getAccountNumber() != null ? payout.getAccountNumber() : "");
        beneDetails.put("ifsc", payout.getIfscCode() != null ? payout.getIfscCode() : "");
        beneDetails.put("address1", "NA");
        body.put("beneDetails", beneDetails);

        try {
            // 1. Get Auth Token
            String authResponse = restClient.post()
                    .uri("/authorize")
                    .header("X-Client-Id", properties.getCashfree().getClientId())
                    .header("X-Client-Secret", properties.getCashfree().getClientSecret())
                    .retrieve()
                    .body(String.class);

            JsonNode authRoot = objectMapper.readTree(authResponse == null ? "{}" : authResponse);
            if (!"SUCCESS".equalsIgnoreCase(authRoot.path("status").asText())) {
                return PayoutExecutionResult.failed(null, "AUTH_ERROR",
                        authRoot.path("message").asText("Failed to authorize with Cashfree"));
            }
            String token = authRoot.path("data").path("token").asText();

            // 2. Request Transfer
            String json = restClient.post()
                    .uri("/requestAsyncTransfer")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(json == null ? "{}" : json);
            String apiStatus = root.path("status").asText("PENDING");
            String subCode = root.path("subCode").asText("200");
            JsonNode data = root.path("data");

            String providerPayoutId = data.path("transferId").asText(transferId);
            String providerReference = data.path("referenceId").asText(data.path("utr").asText(null));
            String rawStatus = data.path("status").asText(apiStatus);
            String message = root.path("message").asText("");

            if ("ERROR".equalsIgnoreCase(apiStatus) || !"200".equals(subCode)) {
                return PayoutExecutionResult.failed(providerPayoutId, rawStatus,
                        message.isBlank() ? "Cashfree payout rejected" : message);
            }

            PayoutStatus mappedStatus = mapCashfreeStatus(rawStatus);
            if (mappedStatus == PayoutStatus.FAILED) {
                return PayoutExecutionResult.failed(providerPayoutId, rawStatus,
                        message.isBlank() ? "Cashfree transfer failed" : message);
            }
            if (mappedStatus == PayoutStatus.COMPLETED) {
                return PayoutExecutionResult.completed(providerPayoutId, providerReference, rawStatus);
            }
            return PayoutExecutionResult.processing(providerPayoutId, providerReference, rawStatus);
        } catch (RestClientResponseException ex) {
            int statusCode = ex.getStatusCode().value();
            log.error("Cashfree HTTP {} on payout transfer: {}", statusCode, ex.getResponseBodyAsString());
            if (statusCode >= 500 || statusCode == 408 || statusCode == 429) {
                throw new ExternalServiceException("Cashfree payout service unavailable (" + statusCode + ")");
            }
            try {
                JsonNode errNode = objectMapper.readTree(ex.getResponseBodyAsString());
                String message = errNode.path("message").asText(ex.getMessage());
                return PayoutExecutionResult.failed(null, "ERROR", message);
            } catch (Exception parseEx) {
                return PayoutExecutionResult.failed(null, "ERROR", "Cashfree payout rejected: " + ex.getMessage());
            }
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Cashfree payout call failed unexpectedly", ex);
            throw new ExternalServiceException("Cashfree payout call failed (timeout).");
        }
    }

    private PayoutExecutionResult executeStubPayout(Payout payout, String idempotencyKey) {
        String idStr = payout.getId() != null ? payout.getId().toString().replace("-", "")
                : UUID.randomUUID().toString().replace("-", "");
        String providerPayoutId = "CF_stub_" + (idStr.length() >= 16 ? idStr.substring(0, 16) : idStr);
        log.info("Stub Cashfree payout processed id={} amount={}", providerPayoutId, payout.getAmount());
        return PayoutExecutionResult.processing(providerPayoutId, "CF_REF_" + System.currentTimeMillis(), "PENDING");
    }

    public static PayoutStatus mapCashfreeStatus(String rawStatus) {
        if (rawStatus == null) {
            return PayoutStatus.PROCESSING;
        }
        return switch (rawStatus.toUpperCase().trim()) {
            case "SUCCESS", "COMPLETED", "PROCESSED" -> PayoutStatus.COMPLETED;
            case "FAILED", "ERROR", "REJECTED", "REVERSED" -> PayoutStatus.FAILED;
            case "PENDING", "PROCESSING", "RECEIVED" -> PayoutStatus.PROCESSING;
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
                log.warn("Cashfree payout {} attempt {} failed (retryable): {}", operation, attempt, ex.getMessage());
                sleepBackoff(attempt);
            } catch (RuntimeException ex) {
                lastException = ex;
                if (attempt == MAX_RETRY_ATTEMPTS) {
                    throw new ExternalServiceException("Cashfree payout request failed after retries.");
                }
                log.warn("Cashfree payout {} attempt {} failed: {}", operation, attempt, ex.getMessage());
                sleepBackoff(attempt);
            }
        }
        throw lastException != null ? lastException : new ExternalServiceException("Cashfree payout request failed.");
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
            throw new ExternalServiceException("Cashfree payout request interrupted.");
        }
    }

    @FunctionalInterface
    private interface ProviderCall<T> {
        T run();
    }
}
