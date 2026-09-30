package com.foodie.user.repository;

import com.foodie.user.entity.LoyaltyPointLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoyaltyPointLedgerRepository extends JpaRepository<LoyaltyPointLedger, UUID> {

    List<LoyaltyPointLedger> findByCustomerLoyaltyIdOrderByCreatedAtDesc(UUID customerLoyaltyId);
}
