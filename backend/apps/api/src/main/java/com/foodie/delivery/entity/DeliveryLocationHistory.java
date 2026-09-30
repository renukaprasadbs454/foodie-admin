package com.foodie.delivery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_location_history")
public class DeliveryLocationHistory {

    @Id
    private UUID id;

    @Column(name = "delivery_assignment_id")
    private UUID deliveryAssignmentId;

    @Column(name = "delivery_partner_id", nullable = false)
    private UUID deliveryPartnerId;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    protected DeliveryLocationHistory() {
    }

    public static DeliveryLocationHistory create(
            UUID deliveryAssignmentId,
            UUID deliveryPartnerId,
            BigDecimal latitude,
            BigDecimal longitude) {
        DeliveryLocationHistory entity = new DeliveryLocationHistory();
        entity.id = UUID.randomUUID();
        entity.deliveryAssignmentId = deliveryAssignmentId;
        entity.deliveryPartnerId = deliveryPartnerId;
        entity.latitude = latitude;
        entity.longitude = longitude;
        entity.recordedAt = Instant.now();
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getDeliveryAssignmentId() {
        return deliveryAssignmentId;
    }

    public UUID getDeliveryPartnerId() {
        return deliveryPartnerId;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
