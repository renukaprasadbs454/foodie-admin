package com.foodie.wallet.config;

import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.user.repository.CustomerRepository;
import com.foodie.wallet.service.WalletService;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.UUID;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.LedgerReferenceType;

@Configuration
public class DevWalletSeeder {
    
    private final UserCredentialRepository credRepo;
    private final CustomerRepository custRepo;
    private final WalletService walletService;

    public DevWalletSeeder(UserCredentialRepository credRepo, CustomerRepository custRepo, WalletService walletService) {
        this.credRepo = credRepo;
        this.custRepo = custRepo;
        this.walletService = walletService;
    }

    @PostConstruct
    public void seed() {
        try {
            credRepo.findByPhoneNumberAndUserType("9686753394", com.foodie.common.enums.UserType.CUSTOMER).ifPresent(cred -> {
                custRepo.findByUserCredentialId(cred.getId()).ifPresent(customer -> {
                    System.out.println("Seeding 10 Rs to " + customer.getId());
                    walletService.credit(
                        OwnerType.CUSTOMER, 
                        customer.getId(), 
                        new BigDecimal("10.00"), 
                        LedgerReferenceType.INCENTIVE, 
                        UUID.randomUUID()
                    );
                });
            });
        } catch (Exception e) {
            System.err.println("Wallet seed error: " + e.getMessage());
        }
    }
}
