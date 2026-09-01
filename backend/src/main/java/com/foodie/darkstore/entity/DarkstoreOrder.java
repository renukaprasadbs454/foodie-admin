package com.foodie.darkstore.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "darkstore_order")
public class DarkstoreOrder extends BaseEntity {

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @Column(name = "darkstore_id", nullable = false)
    private UUID darkstoreId;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 30)
    private String customerPhone;

    @Column(name = "delivery_address", nullable = false, length = 255)
    private String deliveryAddress;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "NEW"; // NEW, ACCEPTED, PICKING, PACKING, READY_FOR_DISPATCH, DISPATCHED, DELIVERED, CANCELLED

    @Column(name = "priority", length = 20)
    private String priority = "NORMAL"; // HIGH, NORMAL, EXPRESS

    @Column(name = "assigned_picker", length = 100)
    private String assignedPicker;

    @Column(name = "assigned_packer", length = 100)
    private String assignedPacker;

    @Column(name = "delivery_partner_name", length = 100)
    private String deliveryPartnerName;

    @Column(name = "delivery_partner_phone", length = 30)
    private String deliveryPartnerPhone;

    @Column(name = "pickup_status", length = 30)
    private String pickupStatus = "WAITING_FOR_PARTNER";

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @OneToMany(mappedBy = "darkstoreOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DarkstoreOrderItem> items = new ArrayList<>();

    protected DarkstoreOrder() {
    }

    public DarkstoreOrder(String orderNumber, UUID darkstoreId, String customerName, String customerPhone,
                          String deliveryAddress, BigDecimal totalAmount, String priority) {
        this.orderNumber = orderNumber;
        this.darkstoreId = darkstoreId;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.deliveryAddress = deliveryAddress;
        this.totalAmount = totalAmount;
        this.priority = priority != null ? priority : "NORMAL";
        this.status = "NEW";
        this.pickupStatus = "WAITING_FOR_PARTNER";
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public UUID getDarkstoreId() {
        return darkstoreId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public String getAssignedPicker() {
        return assignedPicker;
    }

    public void setAssignedPicker(String assignedPicker) {
        this.assignedPicker = assignedPicker;
    }

    public String getAssignedPacker() {
        return assignedPacker;
    }

    public void setAssignedPacker(String assignedPacker) {
        this.assignedPacker = assignedPacker;
    }

    public String getDeliveryPartnerName() {
        return deliveryPartnerName;
    }

    public void setDeliveryPartnerName(String deliveryPartnerName) {
        this.deliveryPartnerName = deliveryPartnerName;
    }

    public String getDeliveryPartnerPhone() {
        return deliveryPartnerPhone;
    }

    public void setDeliveryPartnerPhone(String deliveryPartnerPhone) {
        this.deliveryPartnerPhone = deliveryPartnerPhone;
    }

    public String getPickupStatus() {
        return pickupStatus;
    }

    public void setPickupStatus(String pickupStatus) {
        this.pickupStatus = pickupStatus;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public List<DarkstoreOrderItem> getItems() {
        return items;
    }

    public void addItem(DarkstoreOrderItem item) {
        items.add(item);
        item.setDarkstoreOrder(this);
    }
}
