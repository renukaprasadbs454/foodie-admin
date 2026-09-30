package com.foodie.infrastructure.cashfree;

import java.math.BigDecimal;

public interface CashfreePaymentClient {

    CashfreeOrderCreateResult createOrder(BigDecimal amount, String customerId, String customerPhone, String notesOrderId);

    CashfreeOrderFetchResult fetchOrder(String cashfreeOrderId);

    CashfreeRefundResult createRefund(String cashfreeOrderId, BigDecimal amount, String reason);

    record CashfreeOrderCreateResult(String paymentSessionId, String cfOrderId) {
    }

    record CashfreeOrderFetchResult(String status) {
    }

    record CashfreeRefundResult(String cfRefundId) {
    }
}
