package com.foodie.wallet;

import com.foodie.common.enums.OwnerType;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.WalletAccountRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class WalletAccountTest {

    @Autowired
    private WalletAccountRepository repo;

    @Test
    public void testSave() {
        try {
            WalletAccount account = WalletAccount.open(OwnerType.RESTAURANT, UUID.randomUUID());
            repo.saveAndFlush(account);
            System.out.println("SUCCESSFULLY SAVED WALLET ACCOUNT!");
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("FAILED TO SAVE: " + e.getMessage());
            throw e;
        }
    }
}
