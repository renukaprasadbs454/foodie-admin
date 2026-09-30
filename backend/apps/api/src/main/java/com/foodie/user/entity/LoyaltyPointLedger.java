package com.foodie.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loyalty_point_ledger")
public class LoyaltyPointLedger {

    public enum EntryType {
        EARN,
        REDEEM
    }

    @Id
    private UUID id;

    @Column(name = "customer_loyalty_id", nullable = false)
    private UUID customerLoyaltyId;

    @Column(name = "points", nullable = false)
    private int points;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 10)
    private EntryType entryType;

    @Column(name = "reference_type", nullable = false, length = 30)
    private String referenceType;

    @Column(name = "reference_id", nullable = false)
    private UUID referenceId;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LoyaltyPointLedger() {
    }

    public static LoyaltyPointLedger create(
            UUID customerLoyaltyId,
            int points,
            EntryType entryType,
            String referenceType,
            UUID referenceId,
            String description) {
        LoyaltyPointLedger ledger = new LoyaltyPointLedger();
        ledger.id = UUID.randomUUID();
        ledger.customerLoyaltyId = customerLoyaltyId;
        ledger.points = points;
        ledger.entryType = entryType;
        ledger.referenceType = referenceType;
        ledger.referenceId = referenceId;
        ledger.description = description;
        ledger.createdAt = Instant.now();
        return ledger;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerLoyaltyId() {
        return customerLoyaltyId;
    }

    public int getPoints() {
        return points;
    }

    public EntryType getEntryType() {
        return entryType;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public UUID getReferenceId() {
        return referenceId;
    }

    public String getDescription() {
        return description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
