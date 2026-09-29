package com.foodie.support.repository;

import com.foodie.support.entity.SupportConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportConversationRepository extends JpaRepository<SupportConversation, String> {
    List<SupportConversation> findByCustomerIdOrderByUpdatedAtDesc(String customerId);

    List<SupportConversation> findAllByOrderByUpdatedAtDesc();
}
