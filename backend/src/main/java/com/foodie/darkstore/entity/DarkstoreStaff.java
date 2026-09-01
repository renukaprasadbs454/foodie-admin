package com.foodie.darkstore.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "darkstore_staff")
public class DarkstoreStaff extends BaseEntity {

    @Column(name = "darkstore_id", nullable = false)
    private UUID darkstoreId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "role", nullable = false, length = 30)
    private String role; // DARKSTORE_MANAGER, PICKER, PACKER, INVENTORY_STAFF

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "active_tasks_count", nullable = false)
    private int activeTasksCount = 0;

    @Column(name = "login_status", nullable = false, length = 20)
    private String loginStatus = "ONLINE";

    protected DarkstoreStaff() {
    }

    public DarkstoreStaff(UUID darkstoreId, String name, String phone, String email, String role) {
        this.darkstoreId = darkstoreId;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.role = role;
    }

    public UUID getDarkstoreId() {
        return darkstoreId;
    }

    public String getName() {
        return name;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getActiveTasksCount() {
        return activeTasksCount;
    }

    public void setActiveTasksCount(int activeTasksCount) {
        this.activeTasksCount = activeTasksCount;
    }

    public String getLoginStatus() {
        return loginStatus;
    }

    public void setLoginStatus(String loginStatus) {
        this.loginStatus = loginStatus;
    }
}
