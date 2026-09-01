package com.foodie.admin.controller;

import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.ApprovalRequest;
import com.foodie.admin.security.AdminAccess;
import com.foodie.admin.service.AdminApprovalService;
import com.foodie.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/approvals")
@Tag(name = "Admin — High-Risk Action Approvals")
public class AdminApprovalController {

    private final AdminApprovalService adminApprovalService;
    private final AdminAccess adminAccess;

    public AdminApprovalController(AdminApprovalService adminApprovalService, AdminAccess adminAccess) {
        this.adminApprovalService = adminApprovalService;
        this.adminAccess = adminAccess;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'SETTLEMENT', 'VIEW')")
    @Operation(summary = "List pending high-risk approval requests")
    public ResponseEntity<ApiResponse<List<ApprovalRequest>>> listPending() {
        return ResponseEntity.ok(ApiResponse.success(adminApprovalService.listPendingRequests()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN', 'FINANCE_ADMIN', 'FINANCE')")
    @Operation(summary = "Approve pending high-risk action")
    public ResponseEntity<ApiResponse<ApprovalRequest>> approve(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        AdminUser admin = adminAccess.requireAdmin(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                adminApprovalService.approveRequest(id, admin.getId())));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN', 'FINANCE_ADMIN', 'FINANCE')")
    @Operation(summary = "Reject pending high-risk action")
    public ResponseEntity<ApiResponse<ApprovalRequest>> reject(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "Rejected by admin") String reason
    ) {
        AdminUser admin = adminAccess.requireAdmin(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                adminApprovalService.rejectRequest(id, admin.getId(), reason)));
    }
}
