package com.foodie.coupon.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "promotion_banner")
@SQLRestriction("\"deleted_at\" IS NULL")
public class PromotionBanner extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "subtitle")
    private String subtitle;

    @Column(name = "image_url", nullable = false, length = 1024)
    private String imageUrl;

    @Column(name = "cta_text")
    private String ctaText;

    public enum CtaType {
        OPEN_COUPONS, OPEN_COUPON, OPEN_RESTAURANT, OPEN_RESTAURANT_MENU, OPEN_CATEGORY, OPEN_FOOD_ITEM, OPEN_CAMPAIGN, OPEN_INTERNAL_SCREEN, EXTERNAL_URL
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "cta_type")
    private CtaType ctaType;

    @Column(name = "cta_target")
    private String ctaTarget;

    public enum Status {
        ACTIVE, DEACTIVATED, DRAFT, ARCHIVED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.ACTIVE;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "coupon_id")
    private UUID couponId;

    @Column(name = "campaign_id")
    private UUID campaignId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected PromotionBanner() {
    }

    public static PromotionBanner create(
            String title, String subtitle, String imageUrl,
            String ctaText, CtaType ctaType, String ctaTarget,
            Status status, int displayOrder,
            Instant startsAt, Instant endsAt,
            UUID couponId, UUID campaignId) {
        PromotionBanner banner = new PromotionBanner();
        banner.title = title;
        banner.subtitle = subtitle;
        banner.imageUrl = imageUrl;
        banner.ctaText = ctaText;
        banner.ctaType = ctaType;
        banner.ctaTarget = ctaTarget;
        banner.status = status != null ? status : Status.ACTIVE;
        banner.displayOrder = displayOrder;
        banner.startsAt = startsAt;
        banner.endsAt = endsAt;
        banner.couponId = couponId;
        banner.campaignId = campaignId;
        return banner;
    }

    public void update(
            String title, String subtitle, String imageUrl,
            String ctaText, CtaType ctaType, String ctaTarget,
            Status status, int displayOrder,
            Instant startsAt, Instant endsAt,
            UUID couponId, UUID campaignId) {
        this.title = title;
        this.subtitle = subtitle;
        if (imageUrl != null && !imageUrl.isBlank()) {
            this.imageUrl = imageUrl;
        }
        this.ctaText = ctaText;
        this.ctaType = ctaType;
        this.ctaTarget = ctaTarget;
        this.status = status;
        this.displayOrder = displayOrder;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.couponId = couponId;
        this.campaignId = campaignId;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.status = Status.ARCHIVED;
    }

    // Getters
    public String getTitle() { return title; }
    public String getSubtitle() { return subtitle; }
    public String getImageUrl() { return imageUrl; }
    public String getCtaText() { return ctaText; }
    public CtaType getCtaType() { return ctaType; }
    public String getCtaTarget() { return ctaTarget; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public int getDisplayOrder() { return displayOrder; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public UUID getCouponId() { return couponId; }
    public UUID getCampaignId() { return campaignId; }
    public Long getVersion() { return version; }
    public Instant getDeletedAt() { return deletedAt; }
}
