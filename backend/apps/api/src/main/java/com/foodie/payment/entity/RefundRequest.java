package com.foodie.payment.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.RefundStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "refund_request")
public class RefundRequest extends BaseEntity {

    @Column(name = "payment_id", nullable = false, updatable = false)
    private UUID paymentId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RefundStatus status;

    @Column(name = "cashfree_refund_id", length = 255)
    private String cashfreeRefundId;

    @Column(name = "initiated_by", nullable = false, updatable = false)
    private UUID initiatedBy;

    @Column(name = "processed_at")
    private Instant processedAt;

    protected RefundRequest() {
    }

    public static RefundRequest initiate(
            UUID paymentId,
            BigDecimal amount,
            String reason,
            UUID initiatedBy,
            String cashfreeRefundId
    ) {
        RefundRequest request = new RefundRequest();
        request.paymentId = paymentId;
        request.amount = amount;
        request.reason = reason;
        request.status = RefundStatus.INITIATED;
        request.initiatedBy = initiatedBy;
        request.cashfreeRefundId = cashfreeRefundId;
        return request;
    }

    public void markProcessed() {
        this.status = RefundStatus.PROCESSED;
        this.processedAt = Instant.now();
    }

    public void markFailed() {
        this.status = RefundStatus.FAILED;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getReason() {
        return reason;
    }

    public RefundStatus getStatus() {
        return status;
    }

    public String getCashfreeRefundId() {
        return cashfreeRefundId;
    }

    public UUID getInitiatedBy() {
        return initiatedBy;
    }
}
