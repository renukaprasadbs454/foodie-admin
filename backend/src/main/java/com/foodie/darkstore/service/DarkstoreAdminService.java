package com.foodie.darkstore.service;

import com.foodie.darkstore.dto.DarkstoreMetricsDto;
import com.foodie.darkstore.dto.DarkstoreOrderDto;
import com.foodie.darkstore.dto.DarkstoreProductDto;
import com.foodie.darkstore.dto.DarkstoreProfileDto;
import com.foodie.darkstore.dto.DarkstoreStaffDto;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface DarkstoreAdminService {

    DarkstoreMetricsDto getDashboardMetrics(UUID darkstoreId);

    List<DarkstoreOrderDto> listOrders(UUID darkstoreId, String status, String search, String priority);

    DarkstoreOrderDto getOrder(UUID orderId);

    DarkstoreOrderDto updateOrderStatus(UUID orderId, String newStatus, String cancellationReason);

    DarkstoreOrderDto pickItem(UUID orderId, UUID itemId, int quantityPicked, String status);

    List<DarkstoreProductDto> listProducts(UUID darkstoreId, String category, String search, String stockFilter);

    DarkstoreProductDto adjustStock(UUID productId, int delta, String reason, String updatedBy);

    DarkstoreProductDto createProduct(UUID darkstoreId, String sku, String name, String category, String imageUrl,
                                      BigDecimal price, BigDecimal sellingPrice, int currentStock, int minThreshold,
                                      String unit, BigDecimal taxPercent, String shelfLocation);

    DarkstoreProductDto updateProduct(UUID productId, String name, String category, BigDecimal price,
                                      BigDecimal sellingPrice, int minThreshold, String shelfLocation, String status);

    List<DarkstoreStaffDto> listStaff(UUID darkstoreId);

    DarkstoreStaffDto createStaff(UUID darkstoreId, String name, String phone, String email, String role);

    DarkstoreProfileDto getDarkstoreProfile(UUID darkstoreId);

    DarkstoreProfileDto updateDarkstoreProfile(UUID darkstoreId, String status, BigDecimal deliveryRadiusKm, String serviceableAreas, String openTime, String closeTime);
}
