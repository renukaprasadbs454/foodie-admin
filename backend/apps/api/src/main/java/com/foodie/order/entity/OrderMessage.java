package com.foodie.order.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_message")
public class OrderMessage extends BaseEntity {

    @Column(name = "order_id", nullable = false, updatable = false)
    private UUID orderId;

    @Column(name = "sender_role", nullable = false, length = 50, updatable = false)
    private String senderRole; // CUSTOMER, RESTAURANT, ADMIN

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(name = "message_text", nullable = false, length = 1000, updatable = false)
    private String messageText;

    protected OrderMessage() {
    }

    public static OrderMessage create(UUID orderId, String senderRole, UUID senderId, String messageText) {
        OrderMessage msg = new OrderMessage();
        msg.orderId = orderId;
        msg.senderRole = senderRole;
        msg.senderId = senderId;
        msg.messageText = messageText;
        return msg;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getSenderRole() {
        return senderRole;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public String getMessageText() {
        return messageText;
    }
}
