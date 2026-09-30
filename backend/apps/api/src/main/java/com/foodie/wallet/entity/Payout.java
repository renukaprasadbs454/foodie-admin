package com.foodie.wallet.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.PayoutStatus;
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

    @Column(name = "bank_ref", length = 100)
    private String bankRef;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "account_holder_name")
    private String accountHolderName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "ifsc_code")
    private String ifscCode;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "provider", length = 30)
    private String provider;

    @Column(name = "provider_payout_id", length = 100)
    private String providerPayoutId;

    @Column(name = "provider_reference_id", length = 100)
    private String providerReferenceId;

    @Column(name = "provider_status", length = 50)
    private String providerStatus;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "processed_at")
    private Instant processedAt;

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
        payout.accountHolderName = accountHolderName;
        payout.accountNumber = accountNumber;
        payout.ifscCode = ifscCode;
        payout.bankName = bankName;
        return payout;
    }

    public void markProcessing(String provider, String providerPayoutId, String providerReferenceId, String providerStatus) {
        this.status = PayoutStatus.PROCESSING;
        this.provider = provider;
        if (providerPayoutId != null && !providerPayoutId.isBlank()) {
            this.providerPayoutId = providerPayoutId;
        }
        if (providerReferenceId != null && !providerReferenceId.isBlank()) {
            this.providerReferenceId = providerReferenceId;
            this.bankRef = providerReferenceId;
        }
        this.providerStatus = providerStatus;
        this.processedAt = Instant.now();
    }

    public void markCompleted(String providerReferenceId, String providerStatus) {
        this.status = PayoutStatus.COMPLETED;
        if (providerReferenceId != null && !providerReferenceId.isBlank()) {
            this.providerReferenceId = providerReferenceId;
            this.bankRef = providerReferenceId;
        }
        if (providerStatus != null && !providerStatus.isBlank()) {
            this.providerStatus = providerStatus;
        }
        this.completedAt = Instant.now();
    }

    public void markApproved() {
        this.status = PayoutStatus.APPROVED;
    }

    public void markRejected(String reason) {
        this.status = PayoutStatus.REJECTED;
        this.failureReason = reason;
    }

    public void markCompletedDirect(String ref) {
        this.status = PayoutStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.processedAt = Instant.now();
        if (ref != null && !ref.isBlank()) {
            this.bankRef = ref;
            this.providerReferenceId = ref;
        } else if (this.bankRef == null) {
            this.bankRef = "WTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }

    public void markFailed(String failureReason, String providerStatus) {
        this.status = PayoutStatus.FAILED;
        this.failureReason = failureReason;
        if (providerStatus != null && !providerStatus.isBlank()) {
            this.providerStatus = providerStatus;
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

    public String getBankRef() {
        return bankRef;
    }

    public Instant getCompletedAt() {
        return completedAt;
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

    public String getProvider() {
        return provider;
    }

    public String getProviderPayoutId() {
        return providerPayoutId;
    }

    public String getProviderReferenceId() {
        return providerReferenceId;
    }

    public String getProviderStatus() {
        return providerStatus;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }
}
