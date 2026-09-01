package com.foodie.admin.service;

import com.foodie.admin.entity.ApprovalRequest;
import java.util.List;
import java.util.UUID;

public interface AdminApprovalService {

    ApprovalRequest createRequest(
            UUID adminUserId,
            String actionType,
            String resourceType,
            UUID resourceId,
            String payload,
            String reason);

    List<ApprovalRequest> listPendingRequests();

    ApprovalRequest approveRequest(UUID approvalRequestId, UUID approverAdminUserId);

    ApprovalRequest rejectRequest(UUID approvalRequestId, UUID approverAdminUserId, String reason);
}
