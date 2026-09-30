package com.foodie.delivery.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.DeliveryDocType;
import com.foodie.common.enums.DocumentVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_partner_document")
public class DeliveryPartnerDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false, updatable = false)
    private DeliveryPartner deliveryPartner;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 20)
    private DeliveryDocType docType;

    @Column(name = "s3_key", nullable = false, length = 500)
    private String s3Key;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private DocumentVerificationStatus verificationStatus;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "remarks", length = 500)
    private String remarks;

    protected DeliveryPartnerDocument() {
    }

    public static DeliveryPartnerDocument create(
            DeliveryPartner deliveryPartner,
            DeliveryDocType docType,
            String s3Key
    ) {
        DeliveryPartnerDocument document = new DeliveryPartnerDocument();
        document.deliveryPartner = deliveryPartner;
        document.docType = docType;
        document.s3Key = s3Key;
        document.verificationStatus = DocumentVerificationStatus.PENDING;
        return document;
    }

    public void updateDocument(String s3Key) {
        this.s3Key = s3Key;
        this.verificationStatus = DocumentVerificationStatus.PENDING;
        this.verifiedBy = null;
        this.verifiedAt = null;
        this.remarks = null;
    }

    public void verify(UUID verifiedBy) {
        this.verificationStatus = DocumentVerificationStatus.VERIFIED;
        this.verifiedBy = verifiedBy;
        this.verifiedAt = Instant.now();
    }

    public void reject(UUID verifiedBy, String remarks) {
        this.verificationStatus = DocumentVerificationStatus.REJECTED;
        this.verifiedBy = verifiedBy;
        this.verifiedAt = Instant.now();
        this.remarks = remarks;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public DeliveryDocType getDocType() {
        return docType;
    }

    public String getS3Key() {
        return s3Key;
    }

    public DocumentVerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }
}

