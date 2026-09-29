package com.foodie.support.service;

import com.foodie.support.entity.SupportConversation;
import com.foodie.support.entity.SupportMessage;
import com.foodie.support.repository.SupportConversationRepository;
import com.foodie.support.repository.SupportMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SupportService {

    @Autowired
    private SupportConversationRepository conversationRepository;

    @Autowired
    private SupportMessageRepository messageRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    public SupportConversation getOrCreateConversation(String customerId, String category, String subject,
            String orderId) {
        // Return existing active conversation if any, else create new
        List<SupportConversation> activeConversations = conversationRepository
                .findByCustomerIdOrderByUpdatedAtDesc(customerId)
                .stream().filter(c -> !c.getStatus().equals("RESOLVED") && !c.getStatus().equals("CLOSED"))
                .toList();

        if (!activeConversations.isEmpty()) {
            return activeConversations.get(0);
        }

        SupportConversation conv = new SupportConversation();
        conv.setId("ENQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        conv.setCustomerId(customerId);
        conv.setStatus("AI_ACTIVE");
        conv.setCategory(category);
        conv.setSubject(subject);
        conv.setOrderId(orderId);

        SupportConversation saved = conversationRepository.save(conv);
        broadcastConversationUpdate(saved);
        return saved;
    }

    public List<SupportConversation> getAllAdminConversations() {
        return conversationRepository.findAllByOrderByUpdatedAtDesc();
    }

    public List<SupportConversation> getCustomerConversations(String customerId) {
        return conversationRepository.findByCustomerIdOrderByUpdatedAtDesc(customerId);
    }

    public Optional<SupportConversation> getConversation(String id) {
        return conversationRepository.findById(id);
    }

    public List<SupportMessage> getMessages(String conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Transactional
    public SupportMessage addMessage(String conversationId, String senderType, String senderId, String senderName,
            String content) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        SupportMessage msg = new SupportMessage();
        msg.setId("MSG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        msg.setConversationId(conversationId);
        msg.setSenderType(senderType); // "CUSTOMER", "AI", "AGENT", "SYSTEM"
        msg.setSenderId(senderId);
        msg.setSenderName(senderName);
        msg.setMessageType("TEXT");
        msg.setContent(content);

        SupportMessage savedMsg = messageRepository.save(msg);

        conv.setLastMessageAt(Instant.now());
        conv.setUpdatedAt(Instant.now());

        // If agent responds, ensure status is AGENT_ACTIVE
        if ("AGENT".equals(senderType) && !conv.getStatus().equals("RESOLVED")) {
            conv.setStatus("AGENT_ACTIVE");
            if (conv.getAssignedAgentId() == null) {
                conv.setAssignedAgentId(senderId);
            }
        }

        SupportConversation savedConv = conversationRepository.save(conv);

        // Broadcast realtime events
        broadcastMessage(savedMsg);
        broadcastConversationUpdate(savedConv);

        return savedMsg;
    }

    @Transactional
    public SupportConversation escalateToAgent(String conversationId) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        conv.setStatus("WAITING_FOR_AGENT");
        conv.setUpdatedAt(Instant.now());
        SupportConversation saved = conversationRepository.save(conv);

        broadcastConversationUpdate(saved);

        // Add implicit system message
        addMessage(conversationId, "SYSTEM", "SYSTEM", "Foodie System", "Escalated to human agent. Please wait.");

        return saved;
    }

    @Transactional
    public SupportConversation assignAgent(String conversationId, String agentId) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        conv.setStatus("ASSIGNED");
        conv.setAssignedAgentId(agentId);
        conv.setUpdatedAt(Instant.now());
        SupportConversation saved = conversationRepository.save(conv);

        broadcastConversationUpdate(saved);
        return saved;
    }

    @Transactional
    public SupportConversation resolveConversation(String conversationId) {
        SupportConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        conv.setStatus("RESOLVED");
        conv.setResolvedAt(Instant.now());
        conv.setUpdatedAt(Instant.now());
        SupportConversation saved = conversationRepository.save(conv);

        broadcastConversationUpdate(saved);
        return saved;
    }

    private void broadcastMessage(SupportMessage msg) {
        messagingTemplate.convertAndSend("/topic/support/" + msg.getConversationId(), msg);
    }

    private void broadcastConversationUpdate(SupportConversation conv) {
        messagingTemplate.convertAndSend("/topic/admin/support", conv);
        messagingTemplate.convertAndSend("/topic/customer/" + conv.getCustomerId() + "/support", conv);
    }
}
