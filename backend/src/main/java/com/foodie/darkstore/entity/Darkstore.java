package com.foodie.darkstore.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "darkstore")
public class Darkstore extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "delivery_radius_km", nullable = false, precision = 4, scale = 2)
    private BigDecimal deliveryRadiusKm = BigDecimal.valueOf(3.50);

    @Column(name = "serviceable_areas", length = 255)
    private String serviceableAreas;

    @Column(name = "open_time", length = 20)
    private String openTime = "06:00 AM";

    @Column(name = "close_time", length = 20)
    private String closeTime = "11:00 PM";

    @Column(name = "staff_count", nullable = false)
    private int staffCount = 8;

    protected Darkstore() {
    }

    public Darkstore(String code, String name, String address, String phone, BigDecimal deliveryRadiusKm, String serviceableAreas) {
        this.code = code;
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.deliveryRadiusKm = deliveryRadiusKm;
        this.serviceableAreas = serviceableAreas;
        this.status = "OPEN";
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getPhone() {
        return phone;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getDeliveryRadiusKm() {
        return deliveryRadiusKm;
    }

    public void setDeliveryRadiusKm(BigDecimal deliveryRadiusKm) {
        this.deliveryRadiusKm = deliveryRadiusKm;
    }

    public String getServiceableAreas() {
        return serviceableAreas;
    }

    public void setServiceableAreas(String serviceableAreas) {
        this.serviceableAreas = serviceableAreas;
    }

    public String getOpenTime() {
        return openTime;
    }

    public void setOpenTime(String openTime) {
        this.openTime = openTime;
    }

    public String getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(String closeTime) {
        this.closeTime = closeTime;
    }

    public int getStaffCount() {
        return staffCount;
    }

    public void setStaffCount(int staffCount) {
        this.staffCount = staffCount;
    }
}
