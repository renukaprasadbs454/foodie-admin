package com.foodie.darkstore.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.darkstore.dto.DarkstoreMetricsDto;
import com.foodie.darkstore.dto.DarkstoreOrderDto;
import com.foodie.darkstore.dto.DarkstoreProductDto;
import com.foodie.darkstore.dto.DarkstoreProfileDto;
import com.foodie.darkstore.dto.DarkstoreStaffDto;
import com.foodie.darkstore.service.DarkstoreAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/darkstore-admin")
@Tag(name = "Darkstore Admin — Operational Panel")
public class DarkstoreAdminController {

    private final DarkstoreAdminService darkstoreAdminService;

    public DarkstoreAdminController(DarkstoreAdminService darkstoreAdminService) {
        this.darkstoreAdminService = darkstoreAdminService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get real-time darkstore operational metrics & KPI summary")
    public ResponseEntity<ApiResponse<DarkstoreMetricsDto>> getDashboardMetrics(
            @RequestParam(required = false) UUID darkstoreId
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.getDashboardMetrics(darkstoreId)));
    }

    @GetMapping("/orders")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List darkstore quick-commerce orders with filters and search")
    public ResponseEntity<ApiResponse<List<DarkstoreOrderDto>>> listOrders(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String priority
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.listOrders(darkstoreId, status, search, priority)));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get order detail for picking/packing/dispatch execution")
    public ResponseEntity<ApiResponse<DarkstoreOrderDto>> getOrder(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.getOrder(id)));
    }

    @PostMapping("/orders/{id}/status")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update darkstore order status in operational workflow")
    public ResponseEntity<ApiResponse<DarkstoreOrderDto>> updateOrderStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestParam(required = false) String cancellationReason
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.updateOrderStatus(id, status, cancellationReason)));
    }

    @PostMapping("/orders/{id}/pick-item")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Mark single item as picked/unavailable during picking stage")
    public ResponseEntity<ApiResponse<DarkstoreOrderDto>> pickItem(
            @PathVariable UUID id,
            @RequestParam UUID itemId,
            @RequestParam int quantityPicked,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.pickItem(id, itemId, quantityPicked, status)));
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get inventory list with low-stock & out-of-stock badges")
    public ResponseEntity<ApiResponse<List<DarkstoreProductDto>>> getInventory(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stockFilter
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.listProducts(darkstoreId, category, search, stockFilter)));
    }

    @PostMapping("/inventory/adjust")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Perform stock adjustment (+/- stock in/out) with transaction logging")
    public ResponseEntity<ApiResponse<DarkstoreProductDto>> adjustStock(
            @RequestParam UUID productId,
            @RequestParam int delta,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false, defaultValue = "Darkstore Staff") String updatedBy
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.adjustStock(productId, delta, reason, updatedBy)));
    }

    @GetMapping("/products")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List catalog products for darkstore scope")
    public ResponseEntity<ApiResponse<List<DarkstoreProductDto>>> listProducts(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.listProducts(darkstoreId, category, search, null)));
    }

    @PostMapping("/products")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Add a new product to the darkstore catalog")
    public ResponseEntity<ApiResponse<DarkstoreProductDto>> createProduct(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam String sku,
            @RequestParam String name,
            @RequestParam String category,
            @RequestParam(required = false) String imageUrl,
            @RequestParam BigDecimal price,
            @RequestParam BigDecimal sellingPrice,
            @RequestParam(defaultValue = "0") int currentStock,
            @RequestParam(defaultValue = "10") int minThreshold,
            @RequestParam(defaultValue = "pcs") String unit,
            @RequestParam(defaultValue = "5.00") BigDecimal taxPercent,
            @RequestParam String shelfLocation
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.createProduct(
                darkstoreId, sku, name, category, imageUrl, price, sellingPrice, currentStock, minThreshold, unit, taxPercent, shelfLocation
        )));
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List darkstore staff members")
    public ResponseEntity<ApiResponse<List<DarkstoreStaffDto>>> listStaff(
            @RequestParam(required = false) UUID darkstoreId
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.listStaff(darkstoreId)));
    }

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Register a new darkstore staff member")
    public ResponseEntity<ApiResponse<DarkstoreStaffDto>> createStaff(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam String name,
            @RequestParam String phone,
            @RequestParam String email,
            @RequestParam String role
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.createStaff(darkstoreId, name, phone, email, role)));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get darkstore profile & operating configuration")
    public ResponseEntity<ApiResponse<DarkstoreProfileDto>> getProfile(
            @RequestParam(required = false) UUID darkstoreId
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.getDarkstoreProfile(darkstoreId)));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'DARKSTORE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update darkstore status, operating hours, or delivery radius")
    public ResponseEntity<ApiResponse<DarkstoreProfileDto>> updateProfile(
            @RequestParam(required = false) UUID darkstoreId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) BigDecimal deliveryRadiusKm,
            @RequestParam(required = false) String serviceableAreas,
            @RequestParam(required = false) String openTime,
            @RequestParam(required = false) String closeTime
    ) {
        return ResponseEntity.ok(ApiResponse.success(darkstoreAdminService.updateDarkstoreProfile(
                darkstoreId, status, deliveryRadiusKm, serviceableAreas, openTime, closeTime
        )));
    }
}
