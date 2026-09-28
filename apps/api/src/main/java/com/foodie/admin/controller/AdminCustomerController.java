package com.foodie.admin.controller;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.dto.ApiResponse;
import com.foodie.user.entity.Customer;
import com.foodie.user.repository.CustomerLoyaltyRepository;
import com.foodie.user.repository.CustomerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.foodie.common.enums.UserType;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.RoleRepository;

@RestController
@RequestMapping("/api/v1/admin/customers")
@Tag(name = "Admin — Customers")
public class AdminCustomerController {

    private final CustomerRepository customerRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final CustomerLoyaltyRepository customerLoyaltyRepository;
    private final AdminUserRepository adminUserRepository;
    private final RoleRepository roleRepository;

    public AdminCustomerController(
            CustomerRepository customerRepository,
            UserCredentialRepository userCredentialRepository,
            CustomerLoyaltyRepository customerLoyaltyRepository,
            AdminUserRepository adminUserRepository,
            RoleRepository roleRepository) {
        this.customerRepository = customerRepository;
        this.userCredentialRepository = userCredentialRepository;
        this.customerLoyaltyRepository = customerLoyaltyRepository;
        this.adminUserRepository = adminUserRepository;
        this.roleRepository = roleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedInitialCustomersIfEmpty() {
        if (adminUserRepository.count() == 0) {
            System.out.println("Seeding Initial Admin User in Database...");
            Role superAdminRole = roleRepository.findByName(AdminRoleName.SUPER_ADMIN)
                    .orElseGet(() -> roleRepository.save(Role.ref(UUID.fromString("11111111-1111-1111-1111-111111111001"), AdminRoleName.SUPER_ADMIN)));
            
            UUID adminCredId = UUID.fromString("33333333-3333-3333-3333-333333333001");
            UserCredential adminCred = userCredentialRepository.findById(adminCredId).orElseGet(() -> {
                UserCredential uc = UserCredential.phoneSignup("+919999999999", UserType.ADMIN);
                return userCredentialRepository.save(uc);
            });

            AdminUser admin = AdminUser.create(adminCred.getId(), superAdminRole, "Bootstrap Super Admin");
            adminUserRepository.save(admin);
            System.out.println("Seeded Super Admin User successfully!");
        }
        if (customerRepository.count() == 0) {
            System.out.println("Seeding Initial Customers in Database...");

            UserCredential cred1 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919876543210", UserType.CUSTOMER));
            Customer c1 = Customer.createInitial(cred1.getId(), "ananya.sharma@example.com");
            c1.updateProfile("Ananya Sharma", "ananya.sharma@example.com");
            customerRepository.save(c1);

            UserCredential cred2 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919876543211", UserType.CUSTOMER));
            Customer c2 = Customer.createInitial(cred2.getId(), "rahul.verma@example.com");
            c2.updateProfile("Rahul Verma", "rahul.verma@example.com");
            customerRepository.save(c2);

            UserCredential cred3 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919876543212", UserType.CUSTOMER));
            Customer c3 = Customer.createInitial(cred3.getId(), "priya.nair@example.com");
            c3.updateProfile("Priya Nair", "priya.nair@example.com");
            customerRepository.save(c3);

            UserCredential cred4 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919876543213", UserType.CUSTOMER));
            Customer c4 = Customer.createInitial(cred4.getId(), "karthik.gowda@example.com");
            c4.updateProfile("Karthik Gowda", "karthik.gowda@example.com");
            customerRepository.save(c4);

            System.out.println("Seeded 4 Initial Customers successfully!");
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all registered customers for admin dashboard")
    public ResponseEntity<ApiResponse<CustomerDashboardResponse>> getAllCustomers() {
        List<Customer> customers = customerRepository.findAll();
        List<UserCredential> credentials = userCredentialRepository.findAllById(
                customers.stream().map(Customer::getUserCredentialId).collect(Collectors.toList()));

        Map<UUID, UserCredential> credMap = credentials.stream()
                .collect(Collectors.toMap(UserCredential::getId, c -> c));

        List<AdminCustomerDto> dtos = customers.stream().map(c -> {
            UserCredential cred = credMap.get(c.getUserCredentialId());
            String phone = cred != null && cred.getPhoneNumber() != null ? cred.getPhoneNumber() : "Unknown";
            String email = c.getEmail() != null ? c.getEmail() : (cred != null ? cred.getEmail() : "Unknown");
            boolean isActive = cred == null || cred.isActive();
            String joinedDate = c.getCreatedAt() != null ? c.getCreatedAt().toString().substring(0, 10) : "unknown";
            
            var loyaltyOpt = customerLoyaltyRepository.findByCustomerId(c.getId());
            String tier = loyaltyOpt.map(l -> l.getLoyaltyTier().name()).orElse("BRONZE");

            return new AdminCustomerDto(
                    c.getId().toString(),
                    c.getFullName(),
                    email,
                    phone,
                    0,
                    0.0,
                    0,
                    isActive ? "ACTIVE" : "SUSPENDED",
                    joinedDate,
                    joinedDate,
                    tier);
        }).collect(Collectors.toList());

        long activeCount = dtos.stream().filter(c -> "ACTIVE".equals(c.accountStatus())).count();
        long suspendedCount = dtos.stream().filter(c -> "SUSPENDED".equals(c.accountStatus())).count();

        CustomerSummary summary = new CustomerSummary(
                dtos.size(),
                (int) activeCount,
                (int) suspendedCount,
                0.0);

        CustomerDashboardResponse response = new CustomerDashboardResponse(
                summary,
                dtos,
                dtos.size(),
                0);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    public record AdminCustomerDto(
            String id,
            String name,
            String email,
            String phone,
            int totalOrders,
            double totalSpend,
            int savedAddressesCount,
            String accountStatus,
            String joinedDate,
            String lastOrderDate,
            String loyaltyTier) {
    }

    public record CustomerSummary(int totalRegistered, int activeAccounts, int suspendedAccounts,
            double averageCustomerLtv) {
    }

    public record CustomerDashboardResponse(CustomerSummary summary, List<AdminCustomerDto> customers, int total,
            int openTicketsCount) {
    }
}
