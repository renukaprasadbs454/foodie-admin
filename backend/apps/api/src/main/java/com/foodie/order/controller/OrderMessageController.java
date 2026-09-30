package com.foodie.order.controller;

import com.foodie.order.dto.request.CreateOrderMessageRequestDto;
import com.foodie.order.dto.response.OrderMessageResponseDto;
import com.foodie.order.entity.OrderMessage;
import com.foodie.order.repository.OrderMessageRepository;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.foodie.security.principal.AuthPrincipal;

@RestController
@RequestMapping("/api/v1/orders/{orderId}/messages")
public class OrderMessageController {

    private final OrderMessageRepository orderMessageRepository;

    public OrderMessageController(OrderMessageRepository orderMessageRepository) {
        this.orderMessageRepository = orderMessageRepository;
    }

    @GetMapping
    public ResponseEntity<List<OrderMessageResponseDto>> getMessages(@PathVariable UUID orderId) {
        List<OrderMessage> messages = orderMessageRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
        List<OrderMessageResponseDto> dtos = messages.stream()
                .map(m -> new OrderMessageResponseDto(
                        m.getId(), m.getOrderId(), m.getSenderRole(), m.getSenderId(), m.getMessageText(),
                        m.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<OrderMessageResponseDto> sendMessage(
            @PathVariable UUID orderId,
            @Valid @RequestBody CreateOrderMessageRequestDto req,
            @AuthenticationPrincipal AuthPrincipal principal) {

        OrderMessage msg = OrderMessage.create(orderId, req.senderRole(), principal.userId(), req.messageText());
        msg = orderMessageRepository.save(msg);

        OrderMessageResponseDto dto = new OrderMessageResponseDto(
                msg.getId(), msg.getOrderId(), msg.getSenderRole(), msg.getSenderId(), msg.getMessageText(),
                msg.getCreatedAt());
        return ResponseEntity.ok(dto);
    }
}
