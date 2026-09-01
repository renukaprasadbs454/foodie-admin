package com.foodie.seeder;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.RoleRepository;
import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.enums.UserType;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AdminDataSeeder implements ApplicationRunner {

    private final UserCredentialRepository userCredentialRepository;
    private final AdminUserRepository adminUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public AdminDataSeeder(
            UserCredentialRepository userCredentialRepository,
            AdminUserRepository adminUserRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate) {
        this.userCredentialRepository = userCredentialRepository;
        this.adminUserRepository = adminUserRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        System.out.println("Starting Admin Accounts Seeder...");

        try {
            jdbcTemplate.execute("ALTER TABLE role DROP CONSTRAINT IF EXISTS chk_role_name");
            jdbcTemplate.execute("ALTER TABLE role ADD CONSTRAINT chk_role_name CHECK (name IN ('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN', 'RESTAURANT_MANAGER', 'SUPPORT_AGENT', 'AUDITOR', 'DARKSTORE_ADMIN', 'OPS', 'FINANCE', 'SUPPORT'))");
        } catch (Exception ex) {
            System.out.println("Constraint update log: " + ex.getMessage());
        }

        seedAdmin("admin@foodie.local", "+919999999991", passwordEncoder.encode("ChangeMe@123"), AdminRoleName.SUPER_ADMIN, "Bootstrap Super Admin");
        seedAdmin("Financeadmin@foodie.local", "+919999999995", passwordEncoder.encode("FoodieMinister@111"), AdminRoleName.FINANCE_ADMIN, "Finance Admin");
        seedAdmin("opsadmin@foodie.local", "+919999999996", passwordEncoder.encode("FoodieOps@222"), AdminRoleName.OPERATIONS_ADMIN, "Operations Admin");
        seedAdmin("manager@foodie.local", "+919999999997", passwordEncoder.encode("FoodieManager@333"), AdminRoleName.RESTAURANT_MANAGER, "Restaurant Manager");
        seedAdmin("support@foodie.local", "+919999999994", passwordEncoder.encode("FoodieSupport@444"), AdminRoleName.SUPPORT_AGENT, "Support Agent");
        seedAdmin("auditor@foodie.local", "+919999999993", passwordEncoder.encode("FoodieAuditor@555"), AdminRoleName.AUDITOR, "Compliance Auditor");
        seedAdmin("darkstore@foodie.local", "+919999999992", passwordEncoder.encode("DarkstoreOps@123"), AdminRoleName.DARKSTORE_ADMIN, "Darkstore Admin");

        System.out.println("Admin Accounts Seeder Completed Successfully!");
    }

    private void seedAdmin(String email, String phone, String passHash, AdminRoleName roleName, String fullName) {
        String lowerEmail = email.toLowerCase();
        UserCredential credential = userCredentialRepository.findByEmailIgnoreCaseAndUserType(lowerEmail, UserType.ADMIN)
                .orElseGet(() -> {
                    UserCredential uc = UserCredential.customerPasswordSignup(lowerEmail, phone, passHash);
                    try {
                        var field = UserCredential.class.getDeclaredField("userType");
                        field.setAccessible(true);
                        field.set(uc, UserType.ADMIN);
                    } catch (Exception ignored) {}
                    return userCredentialRepository.save(uc);
                });

        credential.updatePasswordHash(passHash);
        userCredentialRepository.save(credential);

        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(Role.ref(UUID.randomUUID(), roleName)));

        if (adminUserRepository.findByUserCredentialId(credential.getId()).isEmpty()) {
            AdminUser adminUser = AdminUser.create(credential.getId(), role, fullName);
            adminUserRepository.save(adminUser);
        }
    }
}
