package com.foodie.admin.service.impl;

import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.ApprovalRequest;
import com.foodie.admin.entity.AuditLog;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.ApprovalRequestRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.service.AdminApprovalService;
import com.foodie.common.exception.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminApprovalServiceImpl implements AdminApprovalService {

    private final ApprovalRequestRepository approvalRequestRepository;
    private final AdminUserRepository adminUserRepository;
    private final AuditLogRepository auditLogRepository;

    public AdminApprovalServiceImpl(
            ApprovalRequestRepository approvalRequestRepository,
            AdminUserRepository adminUserRepository,
            AuditLogRepository auditLogRepository) {
        this.approvalRequestRepository = approvalRequestRepository;
        this.adminUserRepository = adminUserRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional
    public ApprovalRequest createRequest(
            UUID adminUserId,
            String actionType,
            String resourceType,
            UUID resourceId,
            String payload,
            String reason) {
        AdminUser requester = adminUserRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found"));

        ApprovalRequest request = ApprovalRequest.create(
                actionType, resourceType, resourceId, requester, payload, reason);
        ApprovalRequest saved = approvalRequestRepository.save(request);

        auditLogRepository.save(AuditLog.append(
                adminUserId,
                "APPROVAL_REQUEST_CREATED:" + actionType,
                resourceType,
                resourceId,
                null,
                "{\"approvalRequestId\":\"" + saved.getId() + "\",\"status\":\"PENDING_APPROVAL\"}"
        ));

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApprovalRequest> listPendingRequests() {
        return approvalRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING_APPROVAL");
    }

    @Override
    @Transactional
    public ApprovalRequest approveRequest(UUID approvalRequestId, UUID approverAdminUserId) {
        ApprovalRequest request = approvalRequestRepository.findById(approvalRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found"));
        AdminUser approver = adminUserRepository.findById(approverAdminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver admin user not found"));

        request.setStatus("APPROVED");
        request.setApprovedBy(approver);
        ApprovalRequest saved = approvalRequestRepository.save(request);

        auditLogRepository.save(AuditLog.append(
                approverAdminUserId,
                "APPROVAL_REQUEST_APPROVED:" + request.getActionType(),
                request.getResourceType(),
                request.getResourceId(),
                "{\"status\":\"PENDING_APPROVAL\"}",
                "{\"status\":\"APPROVED\",\"approvedBy\":\"" + approverAdminUserId + "\"}"
        ));

        return saved;
    }

    @Override
    @Transactional
    public ApprovalRequest rejectRequest(UUID approvalRequestId, UUID approverAdminUserId, String reason) {
        ApprovalRequest request = approvalRequestRepository.findById(approvalRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found"));
        AdminUser approver = adminUserRepository.findById(approverAdminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver admin user not found"));

        request.setStatus("REJECTED");
        request.setApprovedBy(approver);
        ApprovalRequest saved = approvalRequestRepository.save(request);

        auditLogRepository.save(AuditLog.append(
                approverAdminUserId,
                "APPROVAL_REQUEST_REJECTED:" + request.getActionType(),
                request.getResourceType(),
                request.getResourceId(),
                "{\"status\":\"PENDING_APPROVAL\"}",
                "{\"status\":\"REJECTED\",\"reason\":\"" + reason + "\"}"
        ));

        return saved;
    }
}
