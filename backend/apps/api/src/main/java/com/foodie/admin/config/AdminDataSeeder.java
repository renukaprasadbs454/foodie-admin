package com.foodie.admin.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Order(5)
public class AdminDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminDataSeeder.class);
    private static final String BCRYPT_PASSWORD = "$2a$10$UAwCF/QkMLt.caFqCRE7yu3V4Yg3upmgTKSxT9N7PMEI2GcAqtfFy"; // ChangeMe@123

    private final JdbcTemplate jdbcTemplate;

    public AdminDataSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Ensuring admin roles and accounts are provisioned...");
        try {
            // Drop check constraint if present so all roles can be added
            try {
                jdbcTemplate.execute("ALTER TABLE role DROP CONSTRAINT IF EXISTS chk_role_name");
            } catch (Exception ignored) {
            }

            // Provision roles
            seedRole("11111111-1111-1111-1111-111111111001", "SUPER_ADMIN");
            seedRole("11111111-1111-1111-1111-111111111002", "OPS");
            seedRole("11111111-1111-1111-1111-111111111003", "FINANCE");
            seedRole("11111111-1111-1111-1111-111111111004", "SUPPORT");
            seedRole("11111111-1111-1111-1111-111111111005", "FINANCE_ADMIN");
            seedRole("11111111-1111-1111-1111-111111111006", "OPERATIONS_ADMIN");
            seedRole("11111111-1111-1111-1111-111111111007", "RESTAURANT_MANAGER");
            seedRole("11111111-1111-1111-1111-111111111008", "SUPPORT_AGENT");
            seedRole("11111111-1111-1111-1111-111111111009", "AUDITOR");
            seedRole("11111111-1111-1111-1111-111111111010", "DARKSTORE_ADMIN");

            // Seed Super Admin
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333001",
                    "+919999999999",
                    "admin@foodie.local",
                    "44444444-4444-4444-4444-444444444001",
                    "11111111-1111-1111-1111-111111111001",
                    "Super Admin"
            );

            // Seed Compliance Auditor
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333009",
                    "+919999999993",
                    "auditor@foodie.local",
                    "44444444-4444-4444-4444-444444444009",
                    "11111111-1111-1111-1111-111111111009",
                    "Compliance Auditor"
            );

            // Seed Finance Admin
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333005",
                    "+919999999995",
                    "finance@foodie.local",
                    "44444444-4444-4444-4444-444444444005",
                    "11111111-1111-1111-1111-111111111005",
                    "Finance Admin"
            );
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333015",
                    "+919999999985",
                    "financeadmin@foodie.local",
                    "44444444-4444-4444-4444-444444444015",
                    "11111111-1111-1111-1111-111111111005",
                    "Finance Admin"
            );

            // Seed Operations Admin
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333006",
                    "+919999999996",
                    "ops@foodie.local",
                    "44444444-4444-4444-4444-444444444006",
                    "11111111-1111-1111-1111-111111111006",
                    "Operations Admin"
            );
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333016",
                    "+919999999986",
                    "opsadmin@foodie.local",
                    "44444444-4444-4444-4444-444444444016",
                    "11111111-1111-1111-1111-111111111006",
                    "Operations Admin"
            );

            // Seed Restaurant Manager
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333007",
                    "+919999999997",
                    "manager@foodie.local",
                    "44444444-4444-4444-4444-444444444007",
                    "11111111-1111-1111-1111-111111111007",
                    "Restaurant Manager"
            );

            // Seed Support Agent
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333008",
                    "+919999999994",
                    "support@foodie.local",
                    "44444444-4444-4444-4444-444444444008",
                    "11111111-1111-1111-1111-111111111008",
                    "Support Agent"
            );

            // Seed Darkstore Admin
            seedAdminUser(
                    "33333333-3333-3333-3333-333333333010",
                    "+919999999992",
                    "darkstore@foodie.local",
                    "44444444-4444-4444-4444-444444444010",
                    "11111111-1111-1111-1111-111111111010",
                    "Darkstore Admin"
            );

            log.info("Admin roles and credentials verified successfully.");
        } catch (Exception e) {
            log.warn("Admin data seeding encountered a non-fatal warning: {}", e.getMessage());
        }
    }

    private void seedRole(String idStr, String roleName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM role WHERE name = ?", Integer.class, roleName);
            if (count == null || count == 0) {
                jdbcTemplate.update(
                        "INSERT INTO role (id, name) VALUES (?, ?)",
                        UUID.fromString(idStr), roleName);
            }
        } catch (Exception e) {
            log.debug("Role {} already exists or error: {}", roleName, e.getMessage());
        }
    }

    private void seedAdminUser(String credIdStr, String phone, String email, String adminUserIdStr, String roleIdStr, String fullName) {
        UUID credId = UUID.fromString(credIdStr);
        UUID adminId = UUID.fromString(adminUserIdStr);
        UUID roleId = UUID.fromString(roleIdStr);

        try {
            Integer credCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM user_credential WHERE email = ? AND user_type = 'ADMIN'",
                    Integer.class, email);

            if (credCount == null || credCount == 0) {
                jdbcTemplate.update(
                        "INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) " +
                                "VALUES (?, ?, ?, ?, 'ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        credId, phone, email, BCRYPT_PASSWORD);
            } else {
                jdbcTemplate.update(
                        "UPDATE user_credential SET password_hash = ?, active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE email = ? AND user_type = 'ADMIN'",
                        BCRYPT_PASSWORD, email);
            }

            Integer adminCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM admin_user WHERE user_credential_id = ?",
                    Integer.class, credId);

            if (adminCount == null || adminCount == 0) {
                jdbcTemplate.update(
                        "INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) " +
                                "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        adminId, credId, roleId, fullName);
            } else {
                jdbcTemplate.update(
                        "UPDATE admin_user SET role_id = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_credential_id = ?",
                        roleId, fullName, credId);
            }
        } catch (Exception e) {
            log.warn("Failed to seed admin user {}: {}", email, e.getMessage());
        }
    }
}
