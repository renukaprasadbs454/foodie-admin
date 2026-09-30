package com.foodie.payout.enums;

public enum PayoutProviderType {
    RAZORPAY,
    CASHFREE;

    public static PayoutProviderType fromString(String value) {
        if (value == null || value.isBlank()) {
            return RAZORPAY;
        }
        try {
            return PayoutProviderType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return RAZORPAY;
        }
    }
}
