package com.foodie.admin.controller;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.DeliveryAssignmentStatus;
import com.foodie.common.enums.KycStatus;
import com.foodie.common.enums.VehicleType;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.delivery.dto.response.AdminDeliveryPartnerResponseDto;
import com.foodie.delivery.dto.response.AdminDeliveryPartnersPageDto;
import com.foodie.delivery.dto.response.AdminDeliveryStatsDto;
import com.foodie.delivery.dto.response.CashDepositResponseDto;
import com.foodie.delivery.dto.response.DeliveryDocumentResponseDto;
import com.foodie.delivery.dto.response.DeliveryProfileResponseDto;
import com.foodie.delivery.dto.response.LivePartnerLocationDto;
import com.foodie.delivery.entity.DeliveryPartner;
import com.foodie.delivery.entity.DeliveryPartnerDocument;
import com.foodie.delivery.mapper.DeliveryMapper;
import com.foodie.delivery.repository.DeliveryAssignmentRepository;
import com.foodie.delivery.repository.DeliveryPartnerDocumentRepository;
import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.delivery.service.DeliveryService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/admin/delivery-partners", "/api/v1/admin/delivery"})
@Tag(name = "Admin — Delivery & Fleet")
public class AdminDeliveryController {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryPartnerDocumentRepository deliveryPartnerDocumentRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final com.foodie.admin.repository.AdminUserRepository adminUserRepository;
    private final DeliveryService deliveryService;
    private final DeliveryMapper deliveryMapper;

    public AdminDeliveryController(
            DeliveryPartnerRepository deliveryPartnerRepository,
            DeliveryPartnerDocumentRepository deliveryPartnerDocumentRepository,
            DeliveryAssignmentRepository deliveryAssignmentRepository,
            UserCredentialRepository userCredentialRepository,
            com.foodie.admin.repository.AdminUserRepository adminUserRepository,
            DeliveryService deliveryService,
            DeliveryMapper deliveryMapper) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryPartnerDocumentRepository = deliveryPartnerDocumentRepository;
        this.deliveryAssignmentRepository = deliveryAssignmentRepository;
        this.userCredentialRepository = userCredentialRepository;
        this.adminUserRepository = adminUserRepository;
        this.deliveryService = deliveryService;
        this.deliveryMapper = deliveryMapper;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List paginated delivery partners with status & search filtering")
    public ResponseEntity<ApiResponse<AdminDeliveryPartnersPageDto>> listDeliveryPartners(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        KycStatus kycFilter = null;
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            try {
                kycFilter = KycStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        String searchFilter = (search != null && !search.trim().isBlank())
                ? "%" + search.trim().toLowerCase() + "%"
                : null;
        PageRequest pageRequest = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<DeliveryPartner> partnerPage = deliveryPartnerRepository.searchDeliveryPartners(kycFilter, searchFilter, pageRequest);

        List<AdminDeliveryPartnerResponseDto> items = partnerPage.getContent().stream()
                .map(this::toAdminDto)
                .collect(Collectors.toList());

        AdminDeliveryPartnersPageDto.PaginationDto pagination = new AdminDeliveryPartnersPageDto.PaginationDto(
                partnerPage.getNumber(),
                partnerPage.getSize(),
                partnerPage.getTotalElements(),
                partnerPage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.success(new AdminDeliveryPartnersPageDto(items, pagination)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get delivery partner fleet statistics")
    public ResponseEntity<ApiResponse<AdminDeliveryStatsDto>> getStats() {
        List<DeliveryPartner> all = deliveryPartnerRepository.findAll();
        long totalFleet = all.size();
        long onlineCount = all.stream().filter(DeliveryPartner::isOnline).count();
        long pendingKyc = all.stream().filter(p -> p.getKycStatus() == KycStatus.PENDING).count();
        long verified = all.stream().filter(p -> p.getKycStatus() == KycStatus.VERIFIED).count();
        long rejected = all.stream().filter(p -> p.getKycStatus() == KycStatus.REJECTED).count();
        BigDecimal totalCash = all.stream()
                .map(p -> p.getCashInHand() != null ? p.getCashInHand() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(ApiResponse.success(
                new AdminDeliveryStatsDto(totalFleet, onlineCount, pendingKyc, verified, rejected, totalCash)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get single delivery partner details")
    public ResponseEntity<ApiResponse<AdminDeliveryPartnerResponseDto>> getPartner(@PathVariable UUID id) {
        DeliveryPartner partner = deliveryPartnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner not found."));
        return ResponseEntity.ok(ApiResponse.success(toAdminDto(partner)));
    }

    @RequestMapping(value = {"/{id}/kyc-approve", "/{id}/approve-kyc"}, method = {org.springframework.web.bind.annotation.RequestMethod.PATCH, org.springframework.web.bind.annotation.RequestMethod.POST})
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve delivery partner KYC")
    public ResponseEntity<ApiResponse<AdminDeliveryPartnerResponseDto>> approveKyc(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID partnerId) {
        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner not found."));
        partner.verifyKyc();
        deliveryPartnerRepository.save(partner);
        UUID adminUserId = resolveAdminUserId(principal != null ? principal.userId() : null);
        List<DeliveryPartnerDocument> docs = deliveryPartnerDocumentRepository.findByDeliveryPartnerId(partner.getId());
        for (DeliveryPartnerDocument doc : docs) {
            doc.verify(adminUserId);
            deliveryPartnerDocumentRepository.save(doc);
        }
        return ResponseEntity.ok(ApiResponse.success(toAdminDto(partner)));
    }

    @RequestMapping(value = {"/{id}/kyc-reject", "/{id}/reject-kyc"}, method = {org.springframework.web.bind.annotation.RequestMethod.PATCH, org.springframework.web.bind.annotation.RequestMethod.POST})
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject delivery partner KYC")
    public ResponseEntity<ApiResponse<AdminDeliveryPartnerResponseDto>> rejectKyc(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID partnerId,
            @RequestBody(required = false) Map<String, String> body) {
        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner not found."));
        String reason = (body != null && body.containsKey("reason")) ? body.get("reason") : "Documents incomplete or invalid.";
        partner.rejectKyc(reason);
        deliveryPartnerRepository.save(partner);
        UUID adminUserId = resolveAdminUserId(principal != null ? principal.userId() : null);
        List<DeliveryPartnerDocument> docs = deliveryPartnerDocumentRepository.findByDeliveryPartnerId(partner.getId());
        for (DeliveryPartnerDocument doc : docs) {
            doc.reject(adminUserId, reason);
            deliveryPartnerDocumentRepository.save(doc);
        }
        return ResponseEntity.ok(ApiResponse.success(toAdminDto(partner)));
    }

    private UUID resolveAdminUserId(UUID userCredentialId) {
        if (userCredentialId == null) {
            return null;
        }
        return adminUserRepository.findByUserCredentialId(userCredentialId)
                .map(com.foodie.admin.entity.AdminUser::getId)
                .orElseGet(() -> adminUserRepository.findAll().stream().findFirst().map(com.foodie.admin.entity.AdminUser::getId).orElse(null));
    }

    @GetMapping("/live-locations")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get live GPS locations and status of all online delivery partners")
    public ResponseEntity<ApiResponse<List<LivePartnerLocationDto>>> getLiveFleetLocations() {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getLiveFleetLocations()));
    }

    @GetMapping("/cash-deposits")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all PENDING cash deposit requests submitted by delivery partners")
    public ResponseEntity<ApiResponse<List<CashDepositResponseDto>>> listPendingCashDeposits() {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.listPendingCashDeposits()));
    }

    @PostMapping("/cash-deposits/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a delivery partner cash deposit request and clear cash balance")
    public ResponseEntity<ApiResponse<CashDepositResponseDto>> approveCashDeposit(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.approveCashDeposit(id, principal.userId())));
    }

    @PostMapping("/cash-deposits/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject a delivery partner cash deposit request")
    public ResponseEntity<ApiResponse<CashDepositResponseDto>> rejectCashDeposit(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "Deposit verification failed.") String reason) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.rejectCashDeposit(id, principal.userId(), reason)));
    }

    private AdminDeliveryPartnerResponseDto toAdminDto(DeliveryPartner partner) {
        UserCredential cred = userCredentialRepository.findById(partner.getUserCredentialId()).orElse(null);
        String phone = (cred != null && cred.getPhoneNumber() != null) ? cred.getPhoneNumber() : "+91 98765 43210";
        String email = (cred != null && cred.getEmail() != null) ? cred.getEmail() : partner.getFullName().toLowerCase().replace(" ", ".") + "@foodie.local";

        List<DeliveryDocumentResponseDto> docs = deliveryPartnerDocumentRepository
                .findByDeliveryPartnerId(partner.getId())
                .stream()
                .map(deliveryMapper::toDocument)
                .collect(Collectors.toList());

        long completedDeliveries = deliveryAssignmentRepository
                .countByDeliveryPartnerIdAndStatus(partner.getId(), DeliveryAssignmentStatus.DELIVERED);

        String zone = "Tumkur Central";

        return new AdminDeliveryPartnerResponseDto(
                partner.getId(),
                partner.getUserCredentialId(),
                partner.getFullName(),
                phone,
                email,
                partner.getVehicleType(),
                partner.getVehicleNumber(),
                partner.getProfileImageKey(),
                partner.getKycStatus(),
                partner.getKycRejectionReason(),
                partner.isOnline(),
                partner.getCashInHand() != null ? partner.getCashInHand() : BigDecimal.ZERO,
                partner.getMaxCashInHandLimit() != null ? partner.getMaxCashInHandLimit() : new BigDecimal("2000.00"),
                completedDeliveries,
                zone,
                docs,
                partner.getCreatedAt()
        );
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedInitialDeliveryPartnersIfEmpty() {
        if (deliveryPartnerRepository.count() == 0) {
            System.out.println("Seeding Initial Delivery Partners in Database...");

            // 1. Vikram Choudhary (Verified)
            UserCredential cred1 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919811122233", com.foodie.common.enums.UserType.DELIVERY_PARTNER));
            DeliveryPartner dp1 = DeliveryPartner.create(
                    cred1.getId(), "Vikram Choudhary", VehicleType.BIKE, "KA-04-EK-1024");
            dp1.verifyKyc();
            dp1.setOnline(true);
            dp1.addCash(new BigDecimal("350.00"));
            deliveryPartnerRepository.save(dp1);

            // 2. Arjun Das (Verified)
            UserCredential cred2 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919822233344", com.foodie.common.enums.UserType.DELIVERY_PARTNER));
            DeliveryPartner dp2 = DeliveryPartner.create(
                    cred2.getId(), "Arjun Das", VehicleType.SCOOTER, "KA-06-EV-8821");
            dp2.verifyKyc();
            dp2.setOnline(true);
            dp2.addCash(new BigDecimal("120.00"));
            deliveryPartnerRepository.save(dp2);

            // 3. Siddharth Rao (Pending KYC)
            UserCredential cred3 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919833344455", com.foodie.common.enums.UserType.DELIVERY_PARTNER));
            DeliveryPartner dp3 = DeliveryPartner.create(
                    cred3.getId(), "Siddharth Rao", VehicleType.BIKE, "KA-04-MT-4091");
            deliveryPartnerRepository.save(dp3);

            // 4. Rajesh Kumar (Pending KYC)
            UserCredential cred4 = userCredentialRepository.save(
                    UserCredential.phoneSignup("+919844455566", com.foodie.common.enums.UserType.DELIVERY_PARTNER));
            DeliveryPartner dp4 = DeliveryPartner.create(
                    cred4.getId(), "Rajesh Kumar", VehicleType.CYCLE, "KA-01-SC-3319");
            deliveryPartnerRepository.save(dp4);

            System.out.println("Seeded 4 Delivery Partners successfully!");
        }
    }
}
