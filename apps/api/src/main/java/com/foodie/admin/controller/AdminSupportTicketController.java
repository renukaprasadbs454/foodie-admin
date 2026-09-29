package com.foodie.admin.controller;

import com.foodie.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/v1/admin/support-tickets")
@Tag(name = "Admin — Support Tickets")
@CrossOrigin(origins = "*")
public class AdminSupportTicketController {

    public record ChatMessageDto(
            String id,
            String enquiryId,
            String sender,
            String senderName,
            String message,
            String timestamp
    ) {}

    public record SupportTicketDto(
            String id,
            String category,
            String senderName,
            String senderEmail,
            String senderPhone,
            String subject,
            String message,
            String timestamp,
            String status,
            String priority,
            String replyMessage,
            List<ChatMessageDto> messages,
            String resolvedAt,
            String orderId
    ) {}

    private final Map<String, SupportTicketDto> ticketStore = new ConcurrentHashMap<>();

    public AdminSupportTicketController() {
        // Initialize default tickets
        SupportTicketDto t1 = new SupportTicketDto(
                "ENQ-901",
                "CUSTOMER",
                "Ananya Sharma",
                "ananya.s@gmail.com",
                "+91 98765 12345",
                "Delayed Refund for Order #ORD-9821",
                "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.",
                "15 mins ago",
                "OPEN",
                "HIGH",
                null,
                new CopyOnWriteArrayList<>(List.of(
                        new ChatMessageDto("msg-101", "ENQ-901", "customer", "Ananya Sharma", "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.", "15 mins ago")
                )),
                null,
                "ORD-9821"
        );

        SupportTicketDto t2 = new SupportTicketDto(
                "ENQ-902",
                "CUSTOMER",
                "Vikram Mehta",
                "vikram.m@yahoo.com",
                "+91 98123 45678",
                "Unable to apply promo code WELCOME100",
                "The promo code states invalid even though I am placing my first order.",
                "40 mins ago",
                "IN_PROGRESS",
                "MEDIUM",
                "Our tech team is validating your first order eligibility status.",
                new CopyOnWriteArrayList<>(List.of(
                        new ChatMessageDto("msg-201", "ENQ-902", "customer", "Vikram Mehta", "The promo code states invalid even though I am placing my first order.", "40 mins ago"),
                        new ChatMessageDto("msg-202", "ENQ-902", "admin", "Admin Support", "Our tech team is validating your first order eligibility status.", "25 mins ago")
                )),
                null,
                null
        );

        ticketStore.put(t1.id(), t1);
        ticketStore.put(t2.id(), t2);
    }

    @GetMapping
    @Operation(summary = "Get all support tickets")
    public ResponseEntity<ApiResponse<List<SupportTicketDto>>> getAllTickets() {
        List<SupportTicketDto> list = new ArrayList<>(ticketStore.values());
        list.sort((a, b) -> b.id().compareTo(a.id()));
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get support ticket by ID")
    public ResponseEntity<ApiResponse<SupportTicketDto>> getTicketById(@PathVariable("id") String id) {
        SupportTicketDto ticket = ticketStore.get(id);
        if (ticket == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(ticket));
    }

    @PostMapping
    @Operation(summary = "Create or submit a support ticket / message")
    public ResponseEntity<ApiResponse<SupportTicketDto>> createTicket(@RequestBody Map<String, String> request) {
        String id = request.getOrDefault("id", "ENQ-" + (100 + (int)(Math.random() * 900)));
        String category = request.getOrDefault("category", "CUSTOMER");
        String senderName = request.getOrDefault("senderName", "Customer User");
        String senderEmail = request.getOrDefault("senderEmail", "customer@foodie.com");
        String senderPhone = request.getOrDefault("senderPhone", "+91 98765 43210");
        String subject = request.getOrDefault("subject", "Support Enquiry");
        String message = request.getOrDefault("message", "");
        String orderId = request.get("orderId");
        String nowStr = "Just now";

        ChatMessageDto msgObj = new ChatMessageDto(
                "msg-" + System.currentTimeMillis(),
                id,
                "customer",
                senderName,
                message,
                nowStr
        );

        SupportTicketDto existing = ticketStore.get(id);
        SupportTicketDto savedTicket;

        if (existing != null) {
            List<ChatMessageDto> updatedMsgs = new ArrayList<>(existing.messages() != null ? existing.messages() : List.of());
            updatedMsgs.add(msgObj);
            savedTicket = new SupportTicketDto(
                    existing.id(),
                    existing.category(),
                    existing.senderName(),
                    existing.senderEmail(),
                    existing.senderPhone(),
                    existing.subject(),
                    message,
                    nowStr,
                    "OPEN",
                    "HIGH",
                    existing.replyMessage(),
                    updatedMsgs,
                    null,
                    existing.orderId() != null ? existing.orderId() : orderId
            );
        } else {
            savedTicket = new SupportTicketDto(
                    id,
                    category,
                    senderName,
                    senderEmail,
                    senderPhone,
                    subject,
                    message,
                    nowStr,
                    "OPEN",
                    "HIGH",
                    null,
                    List.of(msgObj),
                    null,
                    orderId
            );
        }

        ticketStore.put(id, savedTicket);
        return ResponseEntity.ok(ApiResponse.success(savedTicket));
    }

    @PostMapping("/{id}/reply")
    @Operation(summary = "Reply to customer support ticket")
    public ResponseEntity<ApiResponse<SupportTicketDto>> replyToTicket(
            @PathVariable("id") String ticketId,
            @RequestBody Map<String, String> request) {

        String replyMessage = request.getOrDefault("message", "");
        String senderName = request.getOrDefault("senderName", "Admin Support");
        String nowStr = "Just now";

        SupportTicketDto existing = ticketStore.get(ticketId);
        if (existing == null) {
            // Create default
            existing = new SupportTicketDto(
                    ticketId, "CUSTOMER", "Customer", "customer@example.com", "+91 98765 43210",
                    "Support Inquiry", replyMessage, nowStr, "IN_PROGRESS", "MEDIUM", replyMessage, List.of(), null, null
            );
        }

        ChatMessageDto replyMsgObj = new ChatMessageDto(
                "msg-admin-" + System.currentTimeMillis(),
                ticketId,
                "admin",
                senderName,
                replyMessage,
                nowStr
        );

        List<ChatMessageDto> updatedMsgs = new ArrayList<>(existing.messages() != null ? existing.messages() : List.of());
        updatedMsgs.add(replyMsgObj);

        SupportTicketDto updatedTicket = new SupportTicketDto(
                existing.id(),
                existing.category(),
                existing.senderName(),
                existing.senderEmail(),
                existing.senderPhone(),
                existing.subject(),
                existing.message(),
                existing.timestamp(),
                "IN_PROGRESS",
                existing.priority(),
                replyMessage,
                updatedMsgs,
                null,
                existing.orderId()
        );

        ticketStore.put(ticketId, updatedTicket);
        return ResponseEntity.ok(ApiResponse.success(updatedTicket));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update support ticket status")
    public ResponseEntity<ApiResponse<SupportTicketDto>> updateTicketStatus(
            @PathVariable("id") String ticketId,
            @RequestBody Map<String, String> request) {

        String status = request.getOrDefault("status", "RESOLVED");
        SupportTicketDto existing = ticketStore.get(ticketId);
        if (existing != null) {
            SupportTicketDto updated = new SupportTicketDto(
                    existing.id(), existing.category(), existing.senderName(), existing.senderEmail(),
                    existing.senderPhone(), existing.subject(), existing.message(), existing.timestamp(),
                    status, existing.priority(), existing.replyMessage(), existing.messages(),
                    status.equals("RESOLVED") ? Instant.now().toString() : null, existing.orderId()
            );
            ticketStore.put(ticketId, updated);
            return ResponseEntity.ok(ApiResponse.success(updated));
        }

        return ResponseEntity.notFound().build();
    }
}
