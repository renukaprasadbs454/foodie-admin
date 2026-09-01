package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.DarkstoreOrderItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreOrderItemRepository extends JpaRepository<DarkstoreOrderItem, UUID> {

    List<DarkstoreOrderItem> findByDarkstoreOrderId(UUID darkstoreOrderId);
}
