package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.DarkstoreInventoryTx;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreInventoryTxRepository extends JpaRepository<DarkstoreInventoryTx, UUID> {

    List<DarkstoreInventoryTx> findByDarkstoreProductIdOrderByCreatedAtDesc(UUID darkstoreProductId);
}
