package com.foodie.darkstore.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "darkstore_inventory_tx")
public class DarkstoreInventoryTx extends BaseEntity {

    @Column(name = "darkstore_product_id", nullable = false)
    private UUID darkstoreProductId;

    @Column(name = "tx_type", nullable = false, length = 30)
    private String txType; // STOCK_IN, STOCK_OUT, ADJUSTMENT, ORDER_RESERVE, ORDER_PICK

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    protected DarkstoreInventoryTx() {
    }

    public DarkstoreInventoryTx(UUID darkstoreProductId, String txType, int quantity, String reason, String createdBy) {
        this.darkstoreProductId = darkstoreProductId;
        this.txType = txType;
        this.quantity = quantity;
        this.reason = reason;
        this.createdBy = createdBy != null ? createdBy : "Darkstore Staff";
    }

    public UUID getDarkstoreProductId() {
        return darkstoreProductId;
    }

    public String getTxType() {
        return txType;
    }

    public int getQuantity() {
        return quantity;
    }

    public String getReason() {
        return reason;
    }

    public String getCreatedBy() {
        return createdBy;
    }
}
