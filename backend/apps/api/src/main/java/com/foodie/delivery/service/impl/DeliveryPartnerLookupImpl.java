package com.foodie.delivery.service.impl;

import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryPartnerLookupImpl implements DeliveryPartnerLookup {

    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public DeliveryPartnerLookupImpl(DeliveryPartnerRepository deliveryPartnerRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findPartnerIdByUserCredentialId(UUID userCredentialId) {
        return deliveryPartnerRepository.findByUserCredentialId(userCredentialId)
                .map(partner -> partner.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.existsById(deliveryPartnerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findUserCredentialIdByPartnerId(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.findById(deliveryPartnerId)
                .map(partner -> partner.getUserCredentialId());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> findPartnerNameById(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.findById(deliveryPartnerId)
                .map(partner -> partner.getFullName());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PartnerSummary> findPartnerSummaryById(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.findById(deliveryPartnerId)
                .map(partner -> new PartnerSummary(
                        partner.getId(),
                        partner.getUserCredentialId(),
                        partner.getFullName(),
                        ""
                ));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PartnerBankDetails> findBankDetailsByPartnerId(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.findById(deliveryPartnerId)
                .map(partner -> new PartnerBankDetails(
                        partner.getAccountHolderName(),
                        partner.getAccountNumber(),
                        partner.getIfscCode(),
                        partner.getBankName()
                ));
    }
}
