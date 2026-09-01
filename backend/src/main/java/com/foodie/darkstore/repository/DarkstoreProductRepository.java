package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.DarkstoreProduct;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreProductRepository extends JpaRepository<DarkstoreProduct, UUID> {

    List<DarkstoreProduct> findByDarkstoreId(UUID darkstoreId);

    Optional<DarkstoreProduct> findByDarkstoreIdAndSku(UUID darkstoreId, String sku);
}
