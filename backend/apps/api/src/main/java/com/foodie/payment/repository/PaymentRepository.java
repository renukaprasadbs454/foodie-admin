package com.foodie.payment.repository;

import com.foodie.payment.entity.Payment;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

        Optional<Payment> findByOrderId(UUID orderId);

        Optional<Payment> findByIdempotencyKey(String idempotencyKey);

        Optional<Payment> findByCashfreeOrderId(String cashfreeOrderId);

        Optional<Payment> findByPaymentSessionId(String paymentSessionId);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Payment p SET p.status = com.foodie.common.enums.PaymentStatus.CAPTURED, p.cashfreeOrderId = COALESCE(:cfId, p.cashfreeOrderId), p.capturedAt = :now WHERE p.id = :id AND p.status IN (com.foodie.common.enums.PaymentStatus.PENDING, com.foodie.common.enums.PaymentStatus.FAILED)")
        int atomicMarkCaptured(@org.springframework.data.repository.query.Param("id") UUID id,
                        @org.springframework.data.repository.query.Param("cfId") String cfId,
                        @org.springframework.data.repository.query.Param("now") java.time.Instant now);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Payment p SET p.status = com.foodie.common.enums.PaymentStatus.FAILED, p.cashfreeOrderId = COALESCE(:cfId, p.cashfreeOrderId) WHERE p.id = :id AND p.status = com.foodie.common.enums.PaymentStatus.PENDING")
        int atomicMarkFailed(@org.springframework.data.repository.query.Param("id") UUID id,
                        @org.springframework.data.repository.query.Param("cfId") String cfId);
}
