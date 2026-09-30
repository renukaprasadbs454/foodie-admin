package com.foodie.payout.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "foodie.payout")
public class PayoutProperties {

    private String provider = "CASHFREE";
    private String mode = "live";
    private RazorpayPayoutConfig razorpay = new RazorpayPayoutConfig();
    private CashfreePayoutConfig cashfree = new CashfreePayoutConfig();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public RazorpayPayoutConfig getRazorpay() {
        return razorpay;
    }

    public void setRazorpay(RazorpayPayoutConfig razorpay) {
        this.razorpay = razorpay;
    }

    public CashfreePayoutConfig getCashfree() {
        return cashfree;
    }

    public void setCashfree(CashfreePayoutConfig cashfree) {
        this.cashfree = cashfree;
    }

    public static class RazorpayPayoutConfig {
        private String accountNumber = "2323230041387700";
        private String keyId = "rzp_test_TR9mlA2zOImhpF";
        private String keySecret = "W6q8k3NDFXHcYrsaBjcgsWfN";
        private String webhookSecret = "local-razorpay-payout-webhook-secret";
        private String apiBaseUrl = "https://api.razorpay.com/v1";

        public String getAccountNumber() {
            return accountNumber;
        }

        public void setAccountNumber(String accountNumber) {
            this.accountNumber = accountNumber;
        }

        public String getKeyId() {
            return keyId;
        }

        public void setKeyId(String keyId) {
            this.keyId = keyId;
        }

        public String getKeySecret() {
            return keySecret;
        }

        public void setKeySecret(String keySecret) {
            this.keySecret = keySecret;
        }

        public String getWebhookSecret() {
            return webhookSecret;
        }

        public void setWebhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
        }

        public String getApiBaseUrl() {
            return apiBaseUrl;
        }

        public void setApiBaseUrl(String apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl;
        }
    }

    public static class CashfreePayoutConfig {
        private String clientId = "local_cashfree_client_id";
        private String clientSecret = "local_cashfree_client_secret";
        private String webhookSecret = "local-cashfree-webhook-secret";
        private String apiBaseUrl = "https://payout-api.cashfree.com/payout/v1.2";

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public void setClientSecret(String clientSecret) {
            this.clientSecret = clientSecret;
        }

        public String getWebhookSecret() {
            return webhookSecret;
        }

        public void setWebhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
        }

        public String getApiBaseUrl() {
            return apiBaseUrl;
        }

        public void setApiBaseUrl(String apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl;
        }
    }
}
