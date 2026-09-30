package com.foodie.user.repository;

import com.foodie.user.entity.CustomerLoyalty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerLoyaltyRepository extends JpaRepository<CustomerLoyalty, UUID> {

    Optional<CustomerLoyalty> findByCustomerId(UUID customerId);
}
