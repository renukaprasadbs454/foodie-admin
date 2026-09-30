package com.foodie.delivery;

import com.foodie.common.enums.VehicleType;
import com.foodie.delivery.dto.request.DeliveryBankDetailsRequestDto;
import com.foodie.delivery.dto.response.DeliveryBankDetailsResponseDto;
import com.foodie.delivery.entity.DeliveryPartner;
import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.delivery.service.impl.DeliveryPartnerLookupImpl;
import com.foodie.delivery.service.impl.DeliveryServiceImpl;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryBankDetailsTest {

    @Mock
    private DeliveryPartnerRepository deliveryPartnerRepository;

    @InjectMocks
    private DeliveryServiceImpl deliveryService;

    @InjectMocks
    private DeliveryPartnerLookupImpl deliveryPartnerLookup;

    private UUID userCredentialId;
    private DeliveryPartner partner;

    @BeforeEach
    void setUp() {
        userCredentialId = UUID.randomUUID();
        partner = DeliveryPartner.create(userCredentialId, "Ravi Kumar", VehicleType.BIKE, "KA01AB1234");
    }

    @Test
    void testSaveAndRetrieveBankDetails() {
        when(deliveryPartnerRepository.findByUserCredentialId(userCredentialId))
                .thenReturn(Optional.of(partner));
        when(deliveryPartnerRepository.save(any(DeliveryPartner.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryBankDetailsRequestDto request = new DeliveryBankDetailsRequestDto(
                "Ravi Kumar",
                "123456789012",
                "HDFC0001234",
                "HDFC Bank"
        );

        DeliveryBankDetailsResponseDto saved = deliveryService.updateBankDetails(userCredentialId, request);

        assertThat(saved.accountHolderName()).isEqualTo("Ravi Kumar");
        assertThat(saved.accountNumber()).isEqualTo("123456789012");
        assertThat(saved.ifscCode()).isEqualTo("HDFC0001234");
        assertThat(saved.bankName()).isEqualTo("HDFC Bank");

        DeliveryBankDetailsResponseDto fetched = deliveryService.getBankDetails(userCredentialId);
        assertThat(fetched.accountHolderName()).isEqualTo("Ravi Kumar");
        assertThat(fetched.accountNumber()).isEqualTo("123456789012");
        assertThat(fetched.ifscCode()).isEqualTo("HDFC0001234");
        assertThat(fetched.bankName()).isEqualTo("HDFC Bank");
    }

    @Test
    void testDeliveryPartnerLookupFindsBankDetails() {
        partner.updateBankDetails("Ravi Kumar", "987654321098", "SBIN0001234", "State Bank of India");
        when(deliveryPartnerRepository.findById(partner.getId())).thenReturn(Optional.of(partner));

        Optional<DeliveryPartnerLookup.PartnerBankDetails> details = deliveryPartnerLookup.findBankDetailsByPartnerId(partner.getId());

        assertThat(details).isPresent();
        assertThat(details.get().accountHolderName()).isEqualTo("Ravi Kumar");
        assertThat(details.get().accountNumber()).isEqualTo("987654321098");
        assertThat(details.get().ifscCode()).isEqualTo("SBIN0001234");
        assertThat(details.get().bankName()).isEqualTo("State Bank of India");
    }
}
