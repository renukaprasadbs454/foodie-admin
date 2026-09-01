package com.foodie.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.ApprovalRequest;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.ApprovalRequestRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.repository.PermissionRepository;
import com.foodie.admin.security.AdminAccess;
import com.foodie.admin.service.impl.AdminApprovalServiceImpl;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.security.principal.AuthPrincipal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RbacSecurityTest {

    @Mock private AdminUserRepository adminUserRepository;
    @Mock private PermissionRepository permissionRepository;
    @Mock private ApprovalRequestRepository approvalRequestRepository;
    @Mock private AuditLogRepository auditLogRepository;

    private AdminAccess adminAccess;
    private AdminApprovalServiceImpl approvalService;

    private final UUID userCredentialId = UUID.randomUUID();
    private final UUID adminUserId = UUID.randomUUID();
    private final UUID restaurantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        adminAccess = new AdminAccess(adminUserRepository, permissionRepository);
        approvalService = new AdminApprovalServiceImpl(
                approvalRequestRepository, adminUserRepository, auditLogRepository);
    }

    @Test
    void hasPermission_superAdmin_allowsAll() {
        Role superRole = role(AdminRoleName.SUPER_ADMIN);
        AdminUser admin = AdminUser.create(userCredentialId, superRole, "Super Admin");
        when(adminUserRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(admin));

        Authentication auth = createAuth(userCredentialId, UserType.ADMIN);
        assertThat(adminAccess.hasPermission(auth, "payment.view")).isTrue();
        assertThat(adminAccess.hasPermission(auth, "settlement.release")).isTrue();
        assertThat(adminAccess.hasPermission(auth, "ledger.adjust")).isTrue();
    }

    @Test
    void hasPermission_financeAdmin_allowsFinanceDisallowsOpsMutations() {
        Role financeRole = role(AdminRoleName.FINANCE_ADMIN);
        AdminUser admin = AdminUser.create(userCredentialId, financeRole, "Finance Admin");
        ReflectionTestUtils.setField(admin, "id", adminUserId);
        when(adminUserRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(admin));

        when(permissionRepository.existsByRoleIdAndResourceAndAction(financeRole.getId(), "PAYMENT", "VIEW"))
                .thenReturn(true);
        when(permissionRepository.existsByRoleIdAndResourceAndAction(financeRole.getId(), "ORDER", "UPDATE"))
                .thenReturn(false);

        Authentication auth = createAuth(userCredentialId, UserType.ADMIN);
        assertThat(adminAccess.hasPermission(auth, "payment.view")).isTrue();
        assertThat(adminAccess.hasPermission(auth, "order.update")).isFalse();
    }

    @Test
    void isRestaurantScopeAllowed_restaurantManager_ownRestaurantAllowed() {
        Role mgrRole = role(AdminRoleName.RESTAURANT_MANAGER);
        AdminUser mgr = AdminUser.create(userCredentialId, mgrRole, "Manager", restaurantId);
        when(adminUserRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(mgr));

        Authentication auth = createAuth(userCredentialId, UserType.ADMIN);
        assertThat(adminAccess.isRestaurantScopeAllowed(auth, restaurantId)).isTrue();
        assertThat(adminAccess.isRestaurantScopeAllowed(auth, UUID.randomUUID())).isFalse();
    }

    @Test
    void requireAdmin_customerUserType_throws403() {
        Authentication auth = createAuth(userCredentialId, UserType.CUSTOMER);
        assertThatThrownBy(() -> adminAccess.requireAdmin(auth))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Admin access required");
    }

    @Test
    void highRiskApproval_createApproveRejectWorkflow() {
        Role financeRole = role(AdminRoleName.FINANCE_ADMIN);
        AdminUser admin = AdminUser.create(userCredentialId, financeRole, "Finance Admin");
        ReflectionTestUtils.setField(admin, "id", adminUserId);
        when(adminUserRepository.findById(adminUserId)).thenReturn(Optional.of(admin));

        UUID reqId = UUID.randomUUID();
        ApprovalRequest request = ApprovalRequest.create(
                "SETTLEMENT_RELEASE", "SETTLEMENT", UUID.randomUUID(), admin, null, "Manual release");
        ReflectionTestUtils.setField(request, "id", reqId);

        when(approvalRequestRepository.save(any(ApprovalRequest.class))).thenReturn(request);
        when(approvalRequestRepository.findById(reqId)).thenReturn(Optional.of(request));

        ApprovalRequest created = approvalService.createRequest(
                adminUserId, "SETTLEMENT_RELEASE", "SETTLEMENT", UUID.randomUUID(), null, "Manual release");
        assertThat(created.getStatus()).isEqualTo("PENDING_APPROVAL");

        ApprovalRequest approved = approvalService.approveRequest(reqId, adminUserId);
        assertThat(approved.getStatus()).isEqualTo("APPROVED");
        verify(auditLogRepository, org.mockito.Mockito.atLeastOnce()).save(any());
    }

    private Authentication createAuth(UUID credentialId, UserType userType) {
        AuthPrincipal principal = new AuthPrincipal(credentialId, userType);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private static Role role(AdminRoleName name) {
        return Role.ref(UUID.randomUUID(), name);
    }
}
