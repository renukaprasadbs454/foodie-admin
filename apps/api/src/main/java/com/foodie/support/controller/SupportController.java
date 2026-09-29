package com.foodie.support.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.support.entity.SupportConversation;
import com.foodie.support.entity.SupportMessage;
import com.foodie.support.service.SupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/support")
@Tag(name = "Customer — Support")
@CrossOrigin(origins = "*")
public class SupportController {

    @Autowired
    private SupportService supportService;

    // Helper to extract customer ID from auth, normally handled properly by Spring
    // Security
    private String extractCustomerId() {
        // Fallback for current mocked UI
        return "CUST-MOCK-123";
    }

    @GetMapping("/conversations")
    @Operation(summary = "Get active conversation for customer")
    public ResponseEntity<ApiResponse<List<SupportConversation>>> getMyConversations() {
        return ResponseEntity.ok(ApiResponse.success(supportService.getCustomerConversations(extractCustomerId())));
    }

    @PostMapping("/conversations")
    @Operation(summary = "Create or get active conversation")
    public ResponseEntity<ApiResponse<SupportConversation>> createOrGetConversation(
            @RequestBody Map<String, String> req) {
        String category = req.getOrDefault("category", "CUSTOMER");
        String subject = req.getOrDefault("subject", "Live Agent Request");
        String orderId = req.get("orderId");

        return ResponseEntity.ok(ApiResponse.success(
                supportService.getOrCreateConversation(extractCustomerId(), category, subject, orderId)));
    }

    @PostMapping("/conversations/{id}/escalate")
    @Operation(summary = "Escalate to human agent")
    public ResponseEntity<ApiResponse<SupportConversation>> escalate(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success(supportService.escalateToAgent(id)));
    }

    @GetMapping("/conversations/{id}/messages")
    @Operation(summary = "Get messages for a conversation")
    public ResponseEntity<ApiResponse<List<SupportMessage>>> getMessages(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success(supportService.getMessages(id)));
    }

    @PostMapping("/conversations/{id}/messages")
    @Operation(summary = "Send a new message to the conversation")
    public ResponseEntity<ApiResponse<SupportMessage>> sendMessage(
            @PathVariable("id") String ticketId,
            @RequestBody Map<String, String> request) {

        String message = request.getOrDefault("message", "");
        String senderName = request.getOrDefault("senderName", "Customer");
        String senderType = request.getOrDefault("senderType", "CUSTOMER");

        SupportMessage msg = supportService.addMessage(ticketId, senderType, extractCustomerId(), senderName, message);
        return ResponseEntity.ok(ApiResponse.success(msg));
    }

    // Batch endpoint for legacy sync support if needed
    @PostMapping("/conversations/sync")
    public ResponseEntity<ApiResponse<SupportConversation>> syncConversation(@RequestBody Map<String, Object> req) {
        String category = (String) req.getOrDefault("category", "CUSTOMER");
        String subject = (String) req.getOrDefault("subject", "Support Chat");
        String orderId = (String) req.get("orderId");
        String senderName = (String) req.getOrDefault("senderName", "Customer");

        SupportConversation conv = supportService.getOrCreateConversation(extractCustomerId(), category, subject,
                orderId);

        if (req.containsKey("messages")) {
            List<Map<String, String>> messages = (List<Map<String, String>>) req.get("messages");
            for (Map<String, String> msgData : messages) {
                String content = msgData.get("message");
                if (content != null && !content.isEmpty()) {
                    String sender = "customer".equalsIgnoreCase(msgData.get("sender")) ? "CUSTOMER" : "AGENT";
                    // Only add if not exist? Just push through
                    supportService.addMessage(conv.getId(), sender, extractCustomerId(), senderName, content);
                }
            }
        }

        if ("connect_agent".equals(req.get("action"))) {
            supportService.escalateToAgent(conv.getId());
        } else if ("RESOLVED".equals(req.get("status"))) {
            supportService.resolveConversation(conv.getId());
        }

        return ResponseEntity.ok(ApiResponse.success(conv));
    }

    @PutMapping("/conversations/{id}/resolve")
    @Operation(summary = "Mark conversation as resolved")
    public ResponseEntity<ApiResponse<SupportConversation>> resolve(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success(supportService.resolveConversation(id)));
    }
}
