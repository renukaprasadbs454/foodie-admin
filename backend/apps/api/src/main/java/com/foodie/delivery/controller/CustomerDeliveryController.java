package com.foodie.delivery.controller;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.DeliveryAssignmentStatus;
import com.foodie.delivery.dto.response.ActiveDeliveryPartnerResponseDto;
import com.foodie.delivery.entity.DeliveryAssignment;
import com.foodie.delivery.entity.DeliveryPartner;
import com.foodie.delivery.repository.DeliveryAssignmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/orders")
public class CustomerDeliveryController {

    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final UserCredentialRepository userCredentialRepository;

    public CustomerDeliveryController(
            DeliveryAssignmentRepository deliveryAssignmentRepository,
            UserCredentialRepository userCredentialRepository) {
        this.deliveryAssignmentRepository = deliveryAssignmentRepository;
        this.userCredentialRepository = userCredentialRepository;
    }

    /**
     * Returns live delivery partner details for a given order.
     * Only returns data when an assignment has been ACCEPTED (or beyond) by a partner.
     */
    @GetMapping("/{orderId}/delivery-partner")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<ActiveDeliveryPartnerResponseDto>> getDeliveryPartnerForOrder(
            @PathVariable UUID orderId) {

        Optional<DeliveryAssignment> assignmentOpt = deliveryAssignmentRepository.findByOrderId(orderId);

        if (assignmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(ActiveDeliveryPartnerResponseDto.unassigned()));
        }

        DeliveryAssignment assignment = assignmentOpt.get();

        // Only expose partner once they've accepted — OFFERED means not yet confirmed
        if (assignment.getStatus() == DeliveryAssignmentStatus.OFFERED
                || assignment.getStatus() == DeliveryAssignmentStatus.CANCELLED) {
            return ResponseEntity.ok(ApiResponse.success(ActiveDeliveryPartnerResponseDto.unassigned()));
        }

        DeliveryPartner partner = assignment.getDeliveryPartner();
        String mobileNumber = userCredentialRepository.findById(partner.getUserCredentialId())
                .map(UserCredential::getPhoneNumber)
                .orElse("Unknown");

        ActiveDeliveryPartnerResponseDto dto = new ActiveDeliveryPartnerResponseDto(
                partner.getId(),
                partner.getFullName(),
                partner.getVehicleNumber() != null ? partner.getVehicleNumber() : "Bike",
                mobileNumber,
                "4.9",  // Rating not yet persisted — placeholder
                0       // Completed order count not yet tracked on DeliveryPartner entity
        );

        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/{orderId}/location")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<com.foodie.delivery.dto.response.DeliveryLocationResponseDto>> getDeliveryLocationForOrder(
            @PathVariable UUID orderId,
            @org.springframework.beans.factory.annotation.Autowired com.foodie.delivery.service.DeliveryService deliveryService) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getLatestLocationForOrder(orderId)));
    }
}
