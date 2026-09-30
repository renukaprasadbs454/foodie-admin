package com.foodie.payout;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.payout.config.PayoutProperties;
import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.provider.PayoutProviderRouter;
import com.foodie.payout.provider.cashfree.CashfreePayoutProvider;
import com.foodie.payout.provider.razorpay.RazorpayPayoutProvider;
import com.foodie.wallet.entity.Payout;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PayoutProviderTest {

    private PayoutProperties properties;
    private ObjectMapper objectMapper;
    private RazorpayPayoutProvider razorpayProvider;
    private CashfreePayoutProvider cashfreeProvider;
    private PayoutProviderRouter router;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        properties = new PayoutProperties();
        properties.setMode("stub");
        properties.getRazorpay().setWebhookSecret("test_razorpay_secret");
        properties.getCashfree().setWebhookSecret("test_cashfree_secret");

        razorpayProvider = new RazorpayPayoutProvider(properties, objectMapper);
        cashfreeProvider = new CashfreePayoutProvider(properties, objectMapper);
        router = new PayoutProviderRouter(properties, List.of(razorpayProvider, cashfreeProvider));
    }

    @Test
    void providerRouter_switchesBetweenProviders() {
        properties.setProvider("RAZORPAY");
        assertThat(router.getActiveProvider().getProviderType()).isEqualTo(PayoutProviderType.RAZORPAY);

        properties.setProvider("CASHFREE");
        assertThat(router.getActiveProvider().getProviderType()).isEqualTo(PayoutProviderType.CASHFREE);
    }

    @Test
    void razorpayProvider_stubExecution_returnsProcessingResult() {
        Payout payout = Payout.request(UUID.randomUUID(), new BigDecimal("250.00"), "User A", "12345", "IFSC001", "Bank A");
        PayoutExecutionResult result = razorpayProvider.executePayout(payout, "idem-test-1");

        assertThat(result.mappedStatus()).isEqualTo(PayoutStatus.PROCESSING);
        assertThat(result.providerPayoutId()).startsWith("pout_stub_");
    }

    @Test
    void cashfreeProvider_stubExecution_returnsProcessingResult() {
        Payout payout = Payout.request(UUID.randomUUID(), new BigDecimal("180.00"), "User B", "67890", "IFSC002", "Bank B");
        PayoutExecutionResult result = cashfreeProvider.executePayout(payout, "idem-test-2");

        assertThat(result.mappedStatus()).isEqualTo(PayoutStatus.PROCESSING);
        assertThat(result.providerPayoutId()).startsWith("CF_stub_");
    }

    @Test
    void razorpayWebhookSignature_validatesCorrectly() {
        String payload = "{\"event\":\"payout.processed\",\"id\":\"evt_1\"}";
        // Calculate HMAC SHA256 using test secret "test_razorpay_secret"
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec("test_razorpay_secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : raw) sb.append(String.format("%02x", b));
            String signature = sb.toString();

            boolean valid = razorpayProvider.verifyWebhookSignature(payload, Map.of("X-Razorpay-Signature", signature));
            assertThat(valid).isTrue();

            boolean invalid = razorpayProvider.verifyWebhookSignature(payload, Map.of("X-Razorpay-Signature", "wrong_signature"));
            assertThat(invalid).isFalse();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    @Test
    void cashfreeWebhookSignature_validatesCorrectly() {
        String payload = "{\"transferId\":\"CF_1\",\"status\":\"SUCCESS\"}";
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec("test_cashfree_secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : raw) sb.append(String.format("%02x", b));
            String signature = sb.toString();

            boolean valid = cashfreeProvider.verifyWebhookSignature(payload, Map.of("X-Cf-Signature", signature));
            assertThat(valid).isTrue();

            boolean invalid = cashfreeProvider.verifyWebhookSignature(payload, Map.of("X-Cf-Signature", "wrong_sig"));
            assertThat(invalid).isFalse();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    @Test
    void statusMapping_mapsAllStatusesCorrectly() {
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("processed")).isEqualTo(PayoutStatus.COMPLETED);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("success")).isEqualTo(PayoutStatus.COMPLETED);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("rejected")).isEqualTo(PayoutStatus.FAILED);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("failed")).isEqualTo(PayoutStatus.FAILED);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("reversed")).isEqualTo(PayoutStatus.FAILED);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("queued")).isEqualTo(PayoutStatus.PROCESSING);
        assertThat(RazorpayPayoutProvider.mapRazorpayStatus("processing")).isEqualTo(PayoutStatus.PROCESSING);

        assertThat(CashfreePayoutProvider.mapCashfreeStatus("SUCCESS")).isEqualTo(PayoutStatus.COMPLETED);
        assertThat(CashfreePayoutProvider.mapCashfreeStatus("FAILED")).isEqualTo(PayoutStatus.FAILED);
        assertThat(CashfreePayoutProvider.mapCashfreeStatus("REJECTED")).isEqualTo(PayoutStatus.FAILED);
        assertThat(CashfreePayoutProvider.mapCashfreeStatus("PENDING")).isEqualTo(PayoutStatus.PROCESSING);
    }
}
