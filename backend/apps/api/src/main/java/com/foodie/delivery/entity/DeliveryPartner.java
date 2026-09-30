package com.foodie.delivery.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.KycStatus;
import com.foodie.common.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "delivery_partner")
public class DeliveryPartner extends BaseEntity {

    @Column(name = "user_credential_id", nullable = false, unique = true, updatable = false)
    private UUID userCredentialId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    @Column(name = "profile_image_key", length = 500)
    private String profileImageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false, length = 20)
    private KycStatus kycStatus;

    @Column(name = "is_online", nullable = false)
    private boolean online;

    @Column(name = "kyc_rejection_reason", length = 500)
    private String kycRejectionReason;

    @Column(name = "cash_in_hand", nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal cashInHand = java.math.BigDecimal.ZERO;

    @Column(name = "max_cash_in_hand_limit", nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal maxCashInHandLimit = new java.math.BigDecimal("2000.00");

    @Column(name = "account_holder_name", length = 100)
    private String accountHolderName;

    @Column(name = "account_number", length = 100)
    private String accountNumber;

    @Column(name = "ifsc_code", length = 30)
    private String ifscCode;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    protected DeliveryPartner() {
    }

    public static DeliveryPartner create(
            UUID userCredentialId,
            String fullName,
            VehicleType vehicleType,
            String vehicleNumber) {
        DeliveryPartner partner = new DeliveryPartner();
        partner.userCredentialId = userCredentialId;
        partner.fullName = fullName;
        partner.vehicleType = vehicleType;
        partner.vehicleNumber = vehicleNumber;
        partner.kycStatus = KycStatus.PENDING;
        partner.online = false;
        partner.cashInHand = java.math.BigDecimal.ZERO;
        partner.maxCashInHandLimit = new java.math.BigDecimal("2000.00");
        return partner;
    }

    public void updateProfile(String fullName, VehicleType vehicleType, String vehicleNumber) {
        this.fullName = fullName;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
    }

    public void setProfileImageKey(String profileImageKey) {
        this.profileImageKey = profileImageKey;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public void verifyKyc() {
        this.kycStatus = KycStatus.VERIFIED;
        this.kycRejectionReason = null;
    }

    public void rejectKyc(String reason) {
        this.kycStatus = KycStatus.REJECTED;
        this.kycRejectionReason = reason;
        this.online = false;
    }

    public String getKycRejectionReason() {
        return kycRejectionReason;
    }

    public void setKycRejectionReason(String kycRejectionReason) {
        this.kycRejectionReason = kycRejectionReason;
    }

    public void addCash(java.math.BigDecimal amount) {
        if (amount != null && amount.compareTo(java.math.BigDecimal.ZERO) > 0) {
            this.cashInHand = this.cashInHand.add(amount);
        }
    }

    public void deductCash(java.math.BigDecimal amount) {
        if (amount != null && amount.compareTo(java.math.BigDecimal.ZERO) > 0) {
            this.cashInHand = this.cashInHand.subtract(amount).max(java.math.BigDecimal.ZERO);
        }
    }

    public boolean isCashLimitExceeded() {
        return this.cashInHand.compareTo(this.maxCashInHandLimit) >= 0;
    }

    public java.math.BigDecimal getCashInHand() {
        return cashInHand;
    }

    public void setCashInHand(java.math.BigDecimal cashInHand) {
        this.cashInHand = cashInHand;
    }

    public java.math.BigDecimal getMaxCashInHandLimit() {
        return maxCashInHandLimit;
    }

    public void setMaxCashInHandLimit(java.math.BigDecimal maxCashInHandLimit) {
        this.maxCashInHandLimit = maxCashInHandLimit;
    }

    public UUID getUserCredentialId() {
        return userCredentialId;
    }

    public String getFullName() {
        return fullName;
    }

    public VehicleType getVehicleType() {
        return vehicleType;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public String getProfileImageKey() {
        return profileImageKey;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }

    public boolean isOnline() {
        return online;
    }

    public void updateBankDetails(String accountHolderName, String accountNumber, String ifscCode, String bankName) {
        if (accountHolderName != null) this.accountHolderName = accountHolderName;
        if (accountNumber != null) this.accountNumber = accountNumber;
        if (ifscCode != null) this.ifscCode = ifscCode;
        if (bankName != null) this.bankName = bankName;
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
