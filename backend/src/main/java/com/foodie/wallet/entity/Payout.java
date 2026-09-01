package com.foodie.wallet.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.enums.ReconciliationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payout")
public class Payout extends BaseEntity {

    @Column(name = "wallet_account_id", nullable = false, updatable = false)
    private UUID walletAccountId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2, updatable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PayoutStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private PayoutProvider provider = PayoutProvider.RAZORPAY;

    @Column(name = "bank_ref", length = 100)
    private String bankRef;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status", nullable = false, length = 40)
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.MATCHED;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "account_holder_name")
    private String accountHolderName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "ifsc_code")
    private String ifscCode;

    @Column(name = "bank_name")
    private String bankName;

    protected Payout() {
    }

    public static Payout request(UUID walletAccountId, BigDecimal amount) {
        return request(walletAccountId, amount, null, null, null, null);
    }

    public static Payout request(UUID walletAccountId, BigDecimal amount, String accountHolderName,
            String accountNumber, String ifscCode, String bankName) {
        Payout payout = new Payout();
        payout.walletAccountId = walletAccountId;
        payout.amount = amount.setScale(2, RoundingMode.HALF_UP);
        payout.status = PayoutStatus.REQUESTED;
        payout.provider = PayoutProvider.RAZORPAY;
        payout.reconciliationStatus = ReconciliationStatus.MATCHED;
        payout.accountHolderName = accountHolderName;
        payout.accountNumber = accountNumber;
        payout.ifscCode = ifscCode;
        payout.bankName = bankName;
        return payout;
    }

    public void retryFailedPayout() {
        if (this.status != PayoutStatus.FAILED) {
            throw new IllegalStateException("Only FAILED payouts are eligible for retry.");
        }
        this.status = PayoutStatus.PROCESSING;
        this.failureReason = null;
        this.processedAt = Instant.now();
    }

    public void updateStatus(PayoutStatus status, String bankRef, String failureReason, ReconciliationStatus reconciliationStatus) {
        this.status = status;
        if (bankRef != null) {
            this.bankRef = bankRef;
        }
        this.failureReason = failureReason;
        if (reconciliationStatus != null) {
            this.reconciliationStatus = reconciliationStatus;
        }
        if (status == PayoutStatus.COMPLETED) {
            this.completedAt = Instant.now();
            this.processedAt = Instant.now();
        } else if (status == PayoutStatus.PROCESSING || status == PayoutStatus.FAILED) {
            this.processedAt = Instant.now();
        }
    }

    public UUID getWalletAccountId() {
        return walletAccountId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public PayoutStatus getStatus() {
        return status;
    }

    public PayoutProvider getProvider() {
        return provider != null ? provider : PayoutProvider.RAZORPAY;
    }

    public String getBankRef() {
        return bankRef;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public ReconciliationStatus getReconciliationStatus() {
        return reconciliationStatus != null ? reconciliationStatus : ReconciliationStatus.MATCHED;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getProcessedAt() {
        return processedAt != null ? processedAt : completedAt;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public String getBankName() {
        return bankName;
    }
}
