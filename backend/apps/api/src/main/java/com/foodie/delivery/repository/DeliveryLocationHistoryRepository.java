package com.foodie.delivery.repository;

import com.foodie.delivery.entity.DeliveryLocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeliveryLocationHistoryRepository extends JpaRepository<DeliveryLocationHistory, UUID> {

    List<DeliveryLocationHistory> findByDeliveryAssignmentIdOrderByRecordedAtAsc(UUID deliveryAssignmentId);

    Optional<DeliveryLocationHistory> findFirstByDeliveryPartnerIdOrderByRecordedAtDesc(UUID deliveryPartnerId);
}
