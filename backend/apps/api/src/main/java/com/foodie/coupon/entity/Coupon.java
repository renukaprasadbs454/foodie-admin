package com.foodie.coupon.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "coupon")
@SQLRestriction("\"deleted_at\" IS NULL")
public class Coupon extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 10)
    private DiscountType discountType;

    public enum FunderType {
        FOODIE, RESTAURANT, SHARED, PARTNER
    }

    public enum CouponType {
        NEW_USER, RESTAURANT_FIRST_ORDER, REPEAT_ORDER, REACTIVATION, GENERIC, COMBO, REFERRAL, FESTIVAL
    }

    public enum BenefitMode {
        FLAT, PERCENTAGE, FREE_ITEM, COMBO, CONDITIONAL
    }

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "funder_type", length = 30)
    private FunderType funderType = FunderType.FOODIE;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", length = 30)
    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "coupon_type", length = 30)
    private CouponType couponType = CouponType.GENERIC;

    @Enumerated(EnumType.STRING)
    @Column(name = "benefit_mode", length = 30)
    private BenefitMode benefitMode = BenefitMode.FLAT;

    @Column(name = "value", nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "min_order_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(name = "usage_limit_total")
    private Integer usageLimitTotal;

    @Column(name = "usage_limit_per_user", nullable = false)
    private int usageLimitPerUser;

    @Column(name = "restaurant_id")
    private UUID restaurantId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "is_first_order_only", nullable = false)
    private boolean firstOrderOnly = false;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Coupon() {
    }

    public static Coupon create(
            String code,
            DiscountType discountType,
            String funderTypeStr,
            String couponTypeStr,
            String benefitModeStr,
            Coupon.ApprovalStatus approvalStatus,
            BigDecimal value,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscountAmount,
            Instant expiryDate,
            Integer usageLimitTotal,
            int usageLimitPerUser,
            UUID restaurantId) {
        Coupon coupon = new Coupon();
        coupon.code = code;
        coupon.discountType = discountType;

        if (funderTypeStr != null && !funderTypeStr.isBlank()) {
            try { coupon.funderType = FunderType.valueOf(funderTypeStr); } catch (Exception e) {}
        }
        if (couponTypeStr != null && !couponTypeStr.isBlank()) {
            try { coupon.couponType = CouponType.valueOf(couponTypeStr); } catch (Exception e) {}
        }
        if (benefitModeStr != null && !benefitModeStr.isBlank()) {
            try { coupon.benefitMode = BenefitMode.valueOf(benefitModeStr); } catch (Exception e) {}
        }
        if (approvalStatus != null) {
            coupon.approvalStatus = approvalStatus;
        }

        coupon.value = value;
        coupon.minOrderAmount = minOrderAmount;
        coupon.maxDiscountAmount = maxDiscountAmount;
        coupon.expiryDate = expiryDate;
        coupon.usageLimitTotal = usageLimitTotal;
        coupon.usageLimitPerUser = usageLimitPerUser;
        coupon.restaurantId = restaurantId;
        coupon.active = true;
        return coupon;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.active = false;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiryDate);
    }

    public String getCode() {
        return code;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public FunderType getFunderType() {
        return funderType;
    }

    public void setFunderType(FunderType funderType) {
        this.funderType = funderType;
    }

    public CouponType getCouponType() {
        return couponType;
    }

    public void setCouponType(CouponType type) {
        this.couponType = type;
    }

    public BenefitMode getBenefitMode() { return benefitMode; }
    public void setBenefitMode(BenefitMode benefitMode) { this.benefitMode = benefitMode; }

    public ApprovalStatus getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(ApprovalStatus approvalStatus) { this.approvalStatus = approvalStatus; }

    public BigDecimal getValue() {
        return value;
    }

    public BigDecimal getMinOrderAmount() {
        return minOrderAmount;
    }

    public BigDecimal getMaxDiscountAmount() {
        return maxDiscountAmount;
    }

    public Instant getExpiryDate() {
        return expiryDate;
    }

    public Integer getUsageLimitTotal() {
        return usageLimitTotal;
    }

    public int getUsageLimitPerUser() {
        return usageLimitPerUser;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isFirstOrderOnly() {
        return firstOrderOnly;
    }

    public void setFirstOrderOnly(boolean firstOrderOnly) {
        this.firstOrderOnly = firstOrderOnly;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
