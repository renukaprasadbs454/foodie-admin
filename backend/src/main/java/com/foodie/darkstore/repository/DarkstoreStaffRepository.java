package com.foodie.darkstore.repository;

import com.foodie.darkstore.entity.DarkstoreStaff;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DarkstoreStaffRepository extends JpaRepository<DarkstoreStaff, UUID> {

    List<DarkstoreStaff> findByDarkstoreId(UUID darkstoreId);
}
