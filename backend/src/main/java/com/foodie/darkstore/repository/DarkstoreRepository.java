package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.Darkstore;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreRepository extends JpaRepository<Darkstore, UUID> {

    Optional<Darkstore> findByCode(String code);
}
