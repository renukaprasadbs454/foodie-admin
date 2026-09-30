package com.foodie.wallet.mapper;

import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.entity.LedgerEntry;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;

public final class WalletMapper {

    private WalletMapper() {
    }

    public static WalletBalanceResponseDto toBalance(WalletAccount account) {
        return new WalletBalanceResponseDto(account.getId(), account.getBalance());
    }

    public static LedgerEntryResponseDto toLedger(LedgerEntry entry, String status) {
        return new LedgerEntryResponseDto(
                entry.getId(),
                entry.getEntryType(),
                entry.getAmount(),
                entry.getReferenceType(),
                entry.getReferenceId(),
                status,
                entry.getCreatedAt());
    }

    public static PayoutResponseDto toPayout(Payout payout) {
        return new PayoutResponseDto(
                payout.getId(),
                payout.getStatus(),
                payout.getAmount(),
                payout.getCreatedAt(),
                payout.getProcessedAt() != null ? payout.getProcessedAt() : payout.getCompletedAt(),
                payout.getAccountHolderName(),
                payout.getAccountNumber(),
                payout.getIfscCode(),
                payout.getBankName(),
                payout.getProvider() != null ? payout.getProvider() : "CASHFREE",
                payout.getProviderPayoutId(),
                payout.getProviderReferenceId() != null ? payout.getProviderReferenceId() : payout.getBankRef(),
                payout.getFailureReason());
    }
}
