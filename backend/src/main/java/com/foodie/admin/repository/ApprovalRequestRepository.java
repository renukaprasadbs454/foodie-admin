package com.foodie.admin.repository;

import com.foodie.admin.entity.ApprovalRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {

    List<ApprovalRequest> findByStatusOrderByCreatedAtDesc(String status);
}
