package com.foodie.user.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "customer_loyalty")
public class CustomerLoyalty extends BaseEntity {

    public enum LoyaltyTier {
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    @Column(name = "customer_id", nullable = false, unique = true, updatable = false)
    private UUID customerId;

    @Column(name = "points_balance", nullable = false)
    private int pointsBalance;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier", nullable = false, length = 20)
    private LoyaltyTier loyaltyTier;

    protected CustomerLoyalty() {
    }

    public static CustomerLoyalty create(UUID customerId) {
        CustomerLoyalty loyalty = new CustomerLoyalty();
        loyalty.customerId = customerId;
        loyalty.pointsBalance = 0;
        loyalty.loyaltyTier = LoyaltyTier.BRONZE;
        return loyalty;
    }

    public void addPoints(int points) {
        if (points > 0) {
            this.pointsBalance += points;
            recalculateTier();
        }
    }

    public void deductPoints(int points) {
        if (points > 0 && this.pointsBalance >= points) {
            this.pointsBalance -= points;
            recalculateTier();
        }
    }

    public void recalculateTier() {
        if (this.pointsBalance >= 5000) {
            this.loyaltyTier = LoyaltyTier.PLATINUM;
        } else if (this.pointsBalance >= 2000) {
            this.loyaltyTier = LoyaltyTier.GOLD;
        } else if (this.pointsBalance >= 500) {
            this.loyaltyTier = LoyaltyTier.SILVER;
        } else {
            this.loyaltyTier = LoyaltyTier.BRONZE;
        }
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public int getPointsBalance() {
        return pointsBalance;
    }

    public LoyaltyTier getLoyaltyTier() {
        return loyaltyTier;
    }
}
