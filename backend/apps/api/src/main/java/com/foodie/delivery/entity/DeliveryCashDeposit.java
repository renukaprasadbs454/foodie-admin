package com.foodie.delivery.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_cash_deposit")
public class DeliveryCashDeposit extends BaseEntity {

    public enum DepositStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false)
    private DeliveryPartner deliveryPartner;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DepositStatus status;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    protected DeliveryCashDeposit() {
    }

    public static DeliveryCashDeposit create(
            DeliveryPartner deliveryPartner,
            BigDecimal amount,
            String referenceNumber) {
        DeliveryCashDeposit deposit = new DeliveryCashDeposit();
        deposit.deliveryPartner = deliveryPartner;
        deposit.amount = amount;
        deposit.status = DepositStatus.PENDING;
        deposit.referenceNumber = referenceNumber;
        return deposit;
    }

    public void approve(UUID adminId) {
        this.status = DepositStatus.APPROVED;
        this.approvedAt = Instant.now();
        this.approvedBy = adminId;
    }

    public void reject(UUID adminId, String reason) {
        this.status = DepositStatus.REJECTED;
        this.rejectionReason = reason;
        this.approvedAt = Instant.now();
        this.approvedBy = adminId;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public DepositStatus getStatus() {
        return status;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public UUID getApprovedBy() {
        return approvedBy;
    }
}
