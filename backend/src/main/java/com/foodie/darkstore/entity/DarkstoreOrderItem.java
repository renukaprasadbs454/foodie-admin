package com.foodie.darkstore.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "darkstore_order_item")
public class DarkstoreOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "darkstore_order_id", nullable = false)
    @JsonIgnore
    private DarkstoreOrder darkstoreOrder;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "sku", nullable = false, length = 50)
    private String sku;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "shelf_location", nullable = false, length = 50)
    private String shelfLocation;

    @Column(name = "quantity_requested", nullable = false)
    private int quantityRequested;

    @Column(name = "quantity_picked", nullable = false)
    private int quantityPicked = 0;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "status", length = 20)
    private String status = "PENDING"; // PENDING, PICKED, UNAVAILABLE, SUBSTITUTED

    protected DarkstoreOrderItem() {
    }

    public DarkstoreOrderItem(UUID productId, String sku, String productName, String imageUrl,
                               String shelfLocation, int quantityRequested, BigDecimal unitPrice) {
        this.productId = productId;
        this.sku = sku;
        this.productName = productName;
        this.imageUrl = imageUrl;
        this.shelfLocation = shelfLocation;
        this.quantityRequested = quantityRequested;
        this.unitPrice = unitPrice;
        this.quantityPicked = 0;
        this.status = "PENDING";
    }

    public DarkstoreOrder getDarkstoreOrder() {
        return darkstoreOrder;
    }

    public void setDarkstoreOrder(DarkstoreOrder darkstoreOrder) {
        this.darkstoreOrder = darkstoreOrder;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getSku() {
        return sku;
    }

    public String getProductName() {
        return productName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getShelfLocation() {
        return shelfLocation;
    }

    public int getQuantityRequested() {
        return quantityRequested;
    }

    public int getQuantityPicked() {
        return quantityPicked;
    }

    public void setQuantityPicked(int quantityPicked) {
        this.quantityPicked = quantityPicked;
        if (quantityPicked >= quantityRequested) {
            this.status = "PICKED";
        }
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
