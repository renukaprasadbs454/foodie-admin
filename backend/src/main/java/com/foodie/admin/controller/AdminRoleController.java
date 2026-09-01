package com.foodie.admin.controller;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.Permission;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.PermissionRepository;
import com.foodie.admin.repository.RoleRepository;
import com.foodie.admin.security.AdminAccess;
import com.foodie.admin.service.AdminService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/roles")
@Tag(name = "Admin — Role & Permission Management")
public class AdminRoleController {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AdminUserRepository adminUserRepository;
    private final AdminAccess adminAccess;
    private final AdminService adminService;

    public AdminRoleController(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            AdminUserRepository adminUserRepository,
            AdminAccess adminAccess,
            AdminService adminService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.adminUserRepository = adminUserRepository;
        this.adminAccess = adminAccess;
        this.adminService = adminService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN')")
    @Operation(summary = "List all admin roles")
    public ResponseEntity<ApiResponse<List<Role>>> listRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleRepository.findAll()));
    }

    @GetMapping("/{roleId}/permissions")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN')")
    @Operation(summary = "List permissions for a specific role")
    public ResponseEntity<ApiResponse<List<Permission>>> listRolePermissions(@PathVariable UUID roleId) {
        return ResponseEntity.ok(ApiResponse.success(permissionRepository.findByRoleId(roleId)));
    }

    public record AssignRoleRequest(AdminRoleName roleName, UUID restaurantId) {}

    @PostMapping("/users/{adminUserId}/role")
    @Transactional
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN')")
    @Operation(summary = "Assign role and optional restaurant scope to an admin user")
    public ResponseEntity<ApiResponse<Map<String, String>>> assignUserRole(
            Authentication authentication,
            @PathVariable UUID adminUserId,
            @RequestBody AssignRoleRequest request
    ) {
        AdminUser caller = adminAccess.requireAdmin(authentication);
        if (caller.getRole().getName() != AdminRoleName.SUPER_ADMIN) {
            throw new ForbiddenException("Only SUPER_ADMIN may reassign user roles.");
        }
        AdminUser target = adminUserRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found."));

        Role newRole = roleRepository.findByName(request.roleName())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found."));

        target.setRestaurantId(request.restaurantId());
        adminUserRepository.save(target);

        adminService.recordAudit(
                caller.getId(),
                "ROLE_ASSIGNED",
                "ADMIN_USER",
                target.getId(),
                Map.of("role", target.getRole().getName().name()),
                Map.of("role", newRole.getName().name(), "restaurantId", request.restaurantId() != null ? request.restaurantId().toString() : "null")
        );

        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Role updated successfully")));
    }
}
