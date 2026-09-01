package com.foodie.darkstore.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "darkstore_product")
public class DarkstoreProduct extends BaseEntity {

    @Column(name = "darkstore_id", nullable = false)
    private UUID darkstoreId;

    @Column(name = "sku", nullable = false, length = 50)
    private String sku;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "selling_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "current_stock", nullable = false)
    private int currentStock = 0;

    @Column(name = "reserved_stock", nullable = false)
    private int reservedStock = 0;

    @Column(name = "min_threshold", nullable = false)
    private int minThreshold = 10;

    @Column(name = "unit", length = 20)
    private String unit = "pcs";

    @Column(name = "tax_percent", precision = 5, scale = 2)
    private BigDecimal taxPercent = BigDecimal.valueOf(5.00);

    @Column(name = "shelf_location", nullable = false, length = 50)
    private String shelfLocation;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    protected DarkstoreProduct() {
    }

    public DarkstoreProduct(UUID darkstoreId, String sku, String name, String category, String imageUrl,
                            BigDecimal price, BigDecimal sellingPrice, int currentStock, int minThreshold,
                            String unit, BigDecimal taxPercent, String shelfLocation) {
        this.darkstoreId = darkstoreId;
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.imageUrl = imageUrl;
        this.price = price;
        this.sellingPrice = sellingPrice;
        this.currentStock = currentStock;
        this.minThreshold = minThreshold;
        this.unit = unit;
        this.taxPercent = taxPercent;
        this.shelfLocation = shelfLocation;
        this.status = "ACTIVE";
    }

    public UUID getDarkstoreId() {
        return darkstoreId;
    }

    public String getSku() {
        return sku;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(int currentStock) {
        this.currentStock = currentStock;
    }

    public int getReservedStock() {
        return reservedStock;
    }

    public void setReservedStock(int reservedStock) {
        this.reservedStock = reservedStock;
    }

    public int getAvailableStock() {
        return Math.max(0, currentStock - reservedStock);
    }

    public int getMinThreshold() {
        return minThreshold;
    }

    public String getUnit() {
        return unit;
    }

    public BigDecimal getTaxPercent() {
        return taxPercent;
    }

    public String getShelfLocation() {
        return shelfLocation;
    }

    public void setShelfLocation(String shelfLocation) {
        this.shelfLocation = shelfLocation;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void adjustStock(int delta) {
        this.currentStock = Math.max(0, this.currentStock + delta);
    }
}
