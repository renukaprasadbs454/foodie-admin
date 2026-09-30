package com.foodie.delivery.repository;

import com.foodie.delivery.entity.DeliveryCashDeposit;
import com.foodie.delivery.entity.DeliveryCashDeposit.DepositStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryCashDepositRepository extends JpaRepository<DeliveryCashDeposit, UUID> {

    List<DeliveryCashDeposit> findByDeliveryPartnerIdOrderByCreatedAtDesc(UUID deliveryPartnerId);

    List<DeliveryCashDeposit> findByStatusOrderByCreatedAtDesc(DepositStatus status);
}
