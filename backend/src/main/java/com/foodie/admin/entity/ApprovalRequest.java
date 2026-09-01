package com.foodie.admin.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "approval_request")
public class ApprovalRequest extends BaseEntity {

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType;

    @Column(name = "resource_id", nullable = false)
    private UUID resourceId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private AdminUser requestedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "approved_by")
    private AdminUser approvedBy;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING_APPROVAL";

    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    protected ApprovalRequest() {
    }

    public static ApprovalRequest create(
            String actionType,
            String resourceType,
            UUID resourceId,
            AdminUser requestedBy,
            String payload,
            String reason) {
        ApprovalRequest request = new ApprovalRequest();
        request.actionType = actionType;
        request.resourceType = resourceType;
        request.resourceId = resourceId;
        request.requestedBy = requestedBy;
        request.payload = payload;
        request.reason = reason;
        request.status = "PENDING_APPROVAL";
        return request;
    }

    public String getActionType() {
        return actionType;
    }

    public String getResourceType() {
        return resourceType;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public AdminUser getRequestedBy() {
        return requestedBy;
    }

    public AdminUser getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(AdminUser approvedBy) {
        this.approvedBy = approvedBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPayload() {
        return payload;
    }

    public String getReason() {
        return reason;
    }
}
