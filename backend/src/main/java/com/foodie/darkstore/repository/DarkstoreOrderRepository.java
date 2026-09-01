package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.DarkstoreOrder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreOrderRepository extends JpaRepository<DarkstoreOrder, UUID> {

    List<DarkstoreOrder> findByDarkstoreIdOrderByCreatedAtDesc(UUID darkstoreId);

    Optional<DarkstoreOrder> findByOrderNumber(String orderNumber);
}
