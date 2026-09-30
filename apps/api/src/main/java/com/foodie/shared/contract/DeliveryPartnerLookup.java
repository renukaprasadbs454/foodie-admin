package com.foodie.shared.contract;

import java.util.Optional;
import java.util.UUID;

/** Narrow lookup for Order visibility and Wallet partner existence checks. */
public interface DeliveryPartnerLookup {

    Optional<UUID> findPartnerIdByUserCredentialId(UUID userCredentialId);

    boolean existsById(UUID deliveryPartnerId);

    /** Used by Notification to resolve partner push recipient. */
    Optional<UUID> findUserCredentialIdByPartnerId(UUID deliveryPartnerId);

    Optional<String> findPartnerNameById(UUID deliveryPartnerId);

    record PartnerSummary(UUID partnerId, UUID userCredentialId, String fullName, String phoneNumber) {}

    default Optional<PartnerSummary> findPartnerSummaryById(UUID deliveryPartnerId) {
        return Optional.empty();
    }

    record PartnerBankDetails(
            String accountHolderName,
            String accountNumber,
            String ifscCode,
            String bankName
    ) {}

    default Optional<PartnerBankDetails> findBankDetailsByPartnerId(UUID deliveryPartnerId) {
        return Optional.empty();
    }
}

