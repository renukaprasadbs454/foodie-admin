package com.foodie.darkstore.service.impl;

import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.darkstore.dto.DarkstoreMetricsDto;
import com.foodie.darkstore.dto.DarkstoreOrderDto;
import com.foodie.darkstore.dto.DarkstoreProductDto;
import com.foodie.darkstore.dto.DarkstoreProfileDto;
import com.foodie.darkstore.dto.DarkstoreStaffDto;
import com.foodie.darkstore.entity.Darkstore;
import com.foodie.darkstore.entity.DarkstoreInventoryTx;
import com.foodie.darkstore.entity.DarkstoreOrder;
import com.foodie.darkstore.entity.DarkstoreOrderItem;
import com.foodie.darkstore.entity.DarkstoreProduct;
import com.foodie.darkstore.entity.DarkstoreStaff;
import com.foodie.darkstore.repository.DarkstoreInventoryTxRepository;
import com.foodie.darkstore.repository.DarkstoreOrderItemRepository;
import com.foodie.darkstore.repository.DarkstoreOrderRepository;
import com.foodie.darkstore.repository.DarkstoreProductRepository;
import com.foodie.darkstore.repository.DarkstoreRepository;
import com.foodie.darkstore.repository.DarkstoreStaffRepository;
import com.foodie.darkstore.service.DarkstoreAdminService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DarkstoreAdminServiceImpl implements DarkstoreAdminService {

    private final DarkstoreRepository darkstoreRepository;
    private final DarkstoreStaffRepository darkstoreStaffRepository;
    private final DarkstoreProductRepository darkstoreProductRepository;
    private final DarkstoreInventoryTxRepository darkstoreInventoryTxRepository;
    private final DarkstoreOrderRepository darkstoreOrderRepository;
    private final DarkstoreOrderItemRepository darkstoreOrderItemRepository;

    public DarkstoreAdminServiceImpl(
            DarkstoreRepository darkstoreRepository,
            DarkstoreStaffRepository darkstoreStaffRepository,
            DarkstoreProductRepository darkstoreProductRepository,
            DarkstoreInventoryTxRepository darkstoreInventoryTxRepository,
            DarkstoreOrderRepository darkstoreOrderRepository,
            DarkstoreOrderItemRepository darkstoreOrderItemRepository) {
        this.darkstoreRepository = darkstoreRepository;
        this.darkstoreStaffRepository = darkstoreStaffRepository;
        this.darkstoreProductRepository = darkstoreProductRepository;
        this.darkstoreInventoryTxRepository = darkstoreInventoryTxRepository;
        this.darkstoreOrderRepository = darkstoreOrderRepository;
        this.darkstoreOrderItemRepository = darkstoreOrderItemRepository;
    }

    private UUID defaultDarkstoreId() {
        return darkstoreRepository.findAll().stream().findFirst()
                .map(Darkstore::getId)
                .orElse(UUID.fromString("d0000000-0000-0000-0000-000000000001"));
    }

    private UUID resolveDarkstoreId(UUID inputId) {
        return inputId != null ? inputId : defaultDarkstoreId();
    }

    @Override
    @Transactional(readOnly = true)
    public DarkstoreMetricsDto getDashboardMetrics(UUID darkstoreId) {
        UUID dsId = resolveDarkstoreId(darkstoreId);

        List<DarkstoreOrder> orders = darkstoreOrderRepository.findByDarkstoreIdOrderByCreatedAtDesc(dsId);
        List<DarkstoreProduct> products = darkstoreProductRepository.findByDarkstoreId(dsId);

        long totalOrders = orders.size();
        long newOrders = orders.stream().filter(o -> "NEW".equalsIgnoreCase(o.getStatus())).count();
        long ordersBeingPicked = orders.stream().filter(o -> "PICKING".equalsIgnoreCase(o.getStatus())).count();
        long ordersReadyForDispatch = orders.stream().filter(o -> "READY_FOR_DISPATCH".equalsIgnoreCase(o.getStatus()) || "PACKING".equalsIgnoreCase(o.getStatus())).count();
        long completedOrders = orders.stream().filter(o -> "DELIVERED".equalsIgnoreCase(o.getStatus())).count();
        long cancelledOrders = orders.stream().filter(o -> "CANCELLED".equalsIgnoreCase(o.getStatus())).count();

        long lowStock = products.stream().filter(p -> p.getCurrentStock() > 0 && p.getCurrentStock() <= p.getMinThreshold()).count();
        long outOfStock = products.stream().filter(p -> p.getCurrentStock() <= 0).count();
        long totalProducts = products.size();

        BigDecimal todaysRevenue = orders.stream()
                .filter(o -> !"CANCELLED".equalsIgnoreCase(o.getStatus()))
                .map(DarkstoreOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgOrderValue = totalOrders > 0
                ? todaysRevenue.divide(BigDecimal.valueOf(totalOrders), 2, BigDecimal.ROUND_HALF_UP)
                : BigDecimal.ZERO;

        long pendingActions = newOrders + ordersBeingPicked + lowStock + outOfStock;

        return new DarkstoreMetricsDto(
                totalOrders,
                newOrders,
                ordersBeingPicked,
                ordersReadyForDispatch,
                completedOrders,
                cancelledOrders,
                lowStock,
                outOfStock,
                totalProducts,
                todaysRevenue,
                avgOrderValue,
                pendingActions
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<DarkstoreOrderDto> listOrders(UUID darkstoreId, String status, String search, String priority) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        List<DarkstoreOrder> orders = darkstoreOrderRepository.findByDarkstoreIdOrderByCreatedAtDesc(dsId);

        return orders.stream().filter(o -> {
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status) && !o.getStatus().equalsIgnoreCase(status)) {
                return false;
            }
            if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority) && !o.getPriority().equalsIgnoreCase(priority)) {
                return false;
            }
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase();
                boolean matchNum = o.getOrderNumber().toLowerCase().contains(q);
                boolean matchCust = o.getCustomerName().toLowerCase().contains(q);
                boolean matchPhone = o.getCustomerPhone().toLowerCase().contains(q);
                return matchNum || matchCust || matchPhone;
            }
            return true;
        }).map(this::toOrderDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DarkstoreOrderDto getOrder(UUID orderId) {
        DarkstoreOrder order = darkstoreOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore order not found: " + orderId));
        return toOrderDto(order);
    }

    @Override
    @Transactional
    public DarkstoreOrderDto updateOrderStatus(UUID orderId, String newStatus, String cancellationReason) {
        DarkstoreOrder order = darkstoreOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore order not found: " + orderId));

        order.setStatus(newStatus.toUpperCase());
        if ("CANCELLED".equalsIgnoreCase(newStatus) && cancellationReason != null) {
            order.setCancellationReason(cancellationReason);
        }
        if ("DISPATCHED".equalsIgnoreCase(newStatus)) {
            order.setPickupStatus("DISPATCHED");
        }

        DarkstoreOrder saved = darkstoreOrderRepository.save(order);
        return toOrderDto(saved);
    }

    @Override
    @Transactional
    public DarkstoreOrderDto pickItem(UUID orderId, UUID itemId, int quantityPicked, String status) {
        DarkstoreOrder order = darkstoreOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore order not found: " + orderId));

        DarkstoreOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Item not found in order: " + itemId));

        item.setQuantityPicked(quantityPicked);
        if (status != null && !status.isBlank()) {
            item.setStatus(status.toUpperCase());
        }

        boolean allPicked = order.getItems().stream().allMatch(i -> "PICKED".equalsIgnoreCase(i.getStatus()));
        if (allPicked && "PICKING".equalsIgnoreCase(order.getStatus())) {
            order.setStatus("PACKING");
        }

        darkstoreOrderRepository.save(order);
        return toOrderDto(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DarkstoreProductDto> listProducts(UUID darkstoreId, String category, String search, String stockFilter) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        List<DarkstoreProduct> products = darkstoreProductRepository.findByDarkstoreId(dsId);

        return products.stream().filter(p -> {
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category) && !p.getCategory().equalsIgnoreCase(category)) {
                return false;
            }
            if (stockFilter != null && !stockFilter.isBlank()) {
                if ("LOW".equalsIgnoreCase(stockFilter) && (p.getCurrentStock() <= 0 || p.getCurrentStock() > p.getMinThreshold())) {
                    return false;
                }
                if ("OUT".equalsIgnoreCase(stockFilter) && p.getCurrentStock() > 0) {
                    return false;
                }
            }
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase();
                boolean matchName = p.getName().toLowerCase().contains(q);
                boolean matchSku = p.getSku().toLowerCase().contains(q);
                boolean matchLoc = p.getShelfLocation().toLowerCase().contains(q);
                return matchName || matchSku || matchLoc;
            }
            return true;
        }).map(this::toProductDto).toList();
    }

    @Override
    @Transactional
    public DarkstoreProductDto adjustStock(UUID productId, int delta, String reason, String updatedBy) {
        DarkstoreProduct product = darkstoreProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore product not found: " + productId));

        product.adjustStock(delta);
        DarkstoreProduct saved = darkstoreProductRepository.save(product);

        String txType = delta >= 0 ? "STOCK_IN" : "STOCK_OUT";
        DarkstoreInventoryTx tx = new DarkstoreInventoryTx(productId, txType, Math.abs(delta), reason, updatedBy);
        darkstoreInventoryTxRepository.save(tx);

        return toProductDto(saved);
    }

    @Override
    @Transactional
    public DarkstoreProductDto createProduct(UUID darkstoreId, String sku, String name, String category, String imageUrl,
                                              BigDecimal price, BigDecimal sellingPrice, int currentStock, int minThreshold,
                                              String unit, BigDecimal taxPercent, String shelfLocation) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        DarkstoreProduct product = new DarkstoreProduct(
                dsId, sku, name, category, imageUrl, price, sellingPrice, currentStock, minThreshold, unit, taxPercent, shelfLocation
        );
        DarkstoreProduct saved = darkstoreProductRepository.save(product);
        return toProductDto(saved);
    }

    @Override
    @Transactional
    public DarkstoreProductDto updateProduct(UUID productId, String name, String category, BigDecimal price,
                                              BigDecimal sellingPrice, int minThreshold, String shelfLocation, String status) {
        DarkstoreProduct product = darkstoreProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore product not found: " + productId));

        if (name != null) product.setStatus(status);
        if (shelfLocation != null) product.setShelfLocation(shelfLocation);
        DarkstoreProduct saved = darkstoreProductRepository.save(product);
        return toProductDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DarkstoreStaffDto> listStaff(UUID darkstoreId) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        return darkstoreStaffRepository.findByDarkstoreId(dsId).stream().map(this::toStaffDto).toList();
    }

    @Override
    @Transactional
    public DarkstoreStaffDto createStaff(UUID darkstoreId, String name, String phone, String email, String role) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        DarkstoreStaff staff = new DarkstoreStaff(dsId, name, phone, email, role);
        DarkstoreStaff saved = darkstoreStaffRepository.save(staff);
        return toStaffDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DarkstoreProfileDto getDarkstoreProfile(UUID darkstoreId) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        Darkstore ds = darkstoreRepository.findById(dsId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore profile not found: " + dsId));

        long activeOrders = darkstoreOrderRepository.findByDarkstoreIdOrderByCreatedAtDesc(dsId).stream()
                .filter(o -> !"DELIVERED".equalsIgnoreCase(o.getStatus()) && !"CANCELLED".equalsIgnoreCase(o.getStatus()))
                .count();
        long totalProducts = darkstoreProductRepository.findByDarkstoreId(dsId).size();

        return new DarkstoreProfileDto(
                ds.getId(),
                ds.getCode(),
                ds.getName(),
                ds.getAddress(),
                ds.getPhone(),
                ds.getStatus(),
                ds.getDeliveryRadiusKm(),
                ds.getServiceableAreas(),
                ds.getOpenTime(),
                ds.getCloseTime(),
                ds.getStaffCount(),
                activeOrders,
                totalProducts
        );
    }

    @Override
    @Transactional
    public DarkstoreProfileDto updateDarkstoreProfile(UUID darkstoreId, String status, BigDecimal deliveryRadiusKm, String serviceableAreas, String openTime, String closeTime) {
        UUID dsId = resolveDarkstoreId(darkstoreId);
        Darkstore ds = darkstoreRepository.findById(dsId)
                .orElseThrow(() -> new ResourceNotFoundException("Darkstore profile not found: " + dsId));

        if (status != null) ds.setStatus(status);
        if (deliveryRadiusKm != null) ds.setDeliveryRadiusKm(deliveryRadiusKm);
        if (serviceableAreas != null) ds.setServiceableAreas(serviceableAreas);
        if (openTime != null) ds.setOpenTime(openTime);
        if (closeTime != null) ds.setCloseTime(closeTime);

        darkstoreRepository.save(ds);
        return getDarkstoreProfile(dsId);
    }

    private DarkstoreOrderDto toOrderDto(DarkstoreOrder order) {
        List<DarkstoreOrderDto.OrderItemDto> items = order.getItems().stream().map(i ->
                new DarkstoreOrderDto.OrderItemDto(
                        i.getId(),
                        i.getProductId(),
                        i.getSku(),
                        i.getProductName(),
                        i.getImageUrl(),
                        i.getShelfLocation(),
                        i.getQuantityRequested(),
                        i.getQuantityPicked(),
                        i.getUnitPrice(),
                        i.getStatus()
                )
        ).toList();

        return new DarkstoreOrderDto(
                order.getId(),
                order.getOrderNumber(),
                order.getDarkstoreId(),
                order.getCustomerName(),
                order.getCustomerPhone(),
                order.getDeliveryAddress(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getPriority(),
                order.getAssignedPicker(),
                order.getAssignedPacker(),
                order.getDeliveryPartnerName(),
                order.getDeliveryPartnerPhone(),
                order.getPickupStatus(),
                order.getCancellationReason(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                items
        );
    }

    private DarkstoreProductDto toProductDto(DarkstoreProduct p) {
        boolean isLow = p.getCurrentStock() > 0 && p.getCurrentStock() <= p.getMinThreshold();
        boolean isOut = p.getCurrentStock() <= 0;
        return new DarkstoreProductDto(
                p.getId(),
                p.getDarkstoreId(),
                p.getSku(),
                p.getName(),
                p.getCategory(),
                p.getImageUrl(),
                p.getPrice(),
                p.getSellingPrice(),
                p.getCurrentStock(),
                p.getReservedStock(),
                p.getAvailableStock(),
                p.getMinThreshold(),
                p.getUnit(),
                p.getTaxPercent(),
                p.getShelfLocation(),
                p.getStatus(),
                isLow,
                isOut,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    private DarkstoreStaffDto toStaffDto(DarkstoreStaff s) {
        return new DarkstoreStaffDto(
                s.getId(),
                s.getDarkstoreId(),
                s.getName(),
                s.getPhone(),
                s.getEmail(),
                s.getRole(),
                s.getStatus(),
                s.getActiveTasksCount(),
                s.getLoginStatus(),
                s.getCreatedAt()
        );
    }
}
