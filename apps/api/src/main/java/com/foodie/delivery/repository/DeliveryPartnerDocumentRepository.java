package com.foodie.delivery.repository;

import com.foodie.common.enums.DeliveryDocType;
import com.foodie.delivery.entity.DeliveryPartnerDocument;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryPartnerDocumentRepository extends JpaRepository<DeliveryPartnerDocument, UUID> {
    List<DeliveryPartnerDocument> findByDeliveryPartnerId(UUID deliveryPartnerId);
    Optional<DeliveryPartnerDocument> findByDeliveryPartnerIdAndDocType(UUID deliveryPartnerId, DeliveryDocType docType);
}

