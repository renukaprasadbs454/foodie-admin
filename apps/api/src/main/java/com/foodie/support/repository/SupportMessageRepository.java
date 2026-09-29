package com.foodie.support.repository;

import com.foodie.support.entity.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, String> {
    List<SupportMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}
