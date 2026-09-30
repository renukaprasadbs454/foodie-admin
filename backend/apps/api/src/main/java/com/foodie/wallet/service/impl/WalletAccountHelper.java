package com.foodie.wallet.service.impl;

import com.foodie.common.enums.OwnerType;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.WalletAccountRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class WalletAccountHelper {

    private final WalletAccountRepository walletAccountRepository;

    public WalletAccountHelper(WalletAccountRepository walletAccountRepository) {
        this.walletAccountRepository = walletAccountRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public WalletAccount createAccountSafely(OwnerType ownerType, UUID ownerId) {
        return walletAccountRepository.save(WalletAccount.open(ownerType, ownerId));
    }
}
