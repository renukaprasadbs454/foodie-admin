package com.foodie.admin.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.support.entity.SupportConversation;
import com.foodie.support.entity.SupportMessage;
import com.foodie.support.service.SupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/support-tickets")
@Tag(name = "Admin — Support ")
@CrossOrigin(origins = "*")
public class AdminSupportTicketController {

    @Autowired
    private SupportService supportService;

    @GetMapping
    @Operation(summary = "Get all support tickets")
    // @PreAuthorize("hasRole('ADMIN')") - assuming standard security
    public ResponseEntity<ApiResponse<List<SupportConversation>>> getAllTickets() {
        return ResponseEntity.ok(ApiResponse.success(supportService.getAllAdminConversations()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get support ticket by ID")
    public ResponseEntity<ApiResponse<SupportConversation>> getTicketById(@PathVariable("id") String id) {
        return supportService.getConversation(id)
                .map(conv -> ResponseEntity.ok(ApiResponse.success(conv)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/messages")
    @Operation(summary = "Get messages for a conversation")
    public ResponseEntity<ApiResponse<List<SupportMessage>>> getMessages(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success(supportService.getMessages(id)));
    }

    @PostMapping("/{id}/reply")
    @Operation(summary = "Reply to customer support ticket")
    public ResponseEntity<ApiResponse<SupportMessage>> replyToTicket(
            @PathVariable("id") String ticketId,
            @RequestBody Map<String, String> request) {

        String replyMessage = request.getOrDefault("message", "");
        String senderName = request.getOrDefault("senderName", "Admin Support");

        // Use a generic admin ID or from security context
        SupportMessage msg = supportService.addMessage(ticketId, "AGENT", "ADMIN_1", senderName, replyMessage);

        return ResponseEntity.ok(ApiResponse.success(msg));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update support ticket status, e.g. Resolve")
    public ResponseEntity<ApiResponse<SupportConversation>> updateTicketStatus(
            @PathVariable("id") String ticketId,
            @RequestBody Map<String, String> request) {

        String status = request.getOrDefault("status", "RESOLVED");

        if ("RESOLVED".equals(status)) {
            return ResponseEntity.ok(ApiResponse.success(supportService.resolveConversation(ticketId)));
        }

        // Ideally handle other statuses
        return ResponseEntity.notFound().build();
    }
}
