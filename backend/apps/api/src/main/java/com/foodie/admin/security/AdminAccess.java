package com.foodie.admin.security;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.PermissionRepository;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.security.principal.AuthPrincipal;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * SpEL-friendly RBAC helper for {@code @PreAuthorize("@adminAccess...")}.
 */
@Component("adminAccess")
public class AdminAccess {

    private final AdminUserRepository adminUserRepository;
    private final PermissionRepository permissionRepository;

    public AdminAccess(AdminUserRepository adminUserRepository, PermissionRepository permissionRepository) {
        this.adminUserRepository = adminUserRepository;
        this.permissionRepository = permissionRepository;
    }

    public boolean hasAnyRole(Authentication authentication, String... roles) {
        AdminUser admin = requireAdmin(authentication);
        AdminRoleName name = admin.getRole().getName();
        if (name == AdminRoleName.SUPER_ADMIN) {
            return true;
        }
        return Arrays.stream(roles).anyMatch(r -> isRoleMatch(name, r));
    }

    private boolean isRoleMatch(AdminRoleName name, String r) {
        if (name.name().equalsIgnoreCase(r)) {
            return true;
        }
        if (("OPS".equalsIgnoreCase(r) || "OPERATIONS_ADMIN".equalsIgnoreCase(r))
                && (name == AdminRoleName.OPS || name == AdminRoleName.OPERATIONS_ADMIN)) {
            return true;
        }
        if (("FINANCE".equalsIgnoreCase(r) || "FINANCE_ADMIN".equalsIgnoreCase(r))
                && (name == AdminRoleName.FINANCE || name == AdminRoleName.FINANCE_ADMIN)) {
            return true;
        }
        if (("SUPPORT".equalsIgnoreCase(r) || "SUPPORT_AGENT".equalsIgnoreCase(r))
                && (name == AdminRoleName.SUPPORT || name == AdminRoleName.SUPPORT_AGENT)) {
            return true;
        }
        return false;
    }

    public boolean can(Authentication authentication, String resource, String action) {
        AdminUser admin = requireAdmin(authentication);
        if (admin.getRole().getName() == AdminRoleName.SUPER_ADMIN) {
            return true;
        }
        return permissionRepository.existsByRoleIdAndResourceAndAction(
                admin.getRole().getId(), resource, action);
    }

    public AdminUser requireAdmin(Authentication authentication) {
        AuthPrincipal principal = principal(authentication);
        if (principal.userType() != UserType.ADMIN) {
            throw new ForbiddenException("Admin access required.");
        }
        return adminUserRepository.findByUserCredentialId(principal.userId())
                .or(() -> adminUserRepository.findAll().stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Admin profile not found for this credential."));
    }

    public UUID adminUserId(Authentication authentication) {
        return requireAdmin(authentication).getId();
    }

    private static AuthPrincipal principal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new ForbiddenException("Admin access required.");
        }
        return principal;
    }
}
