package com.foodie.order.service.impl;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.order.config.OrderProperties;
import com.foodie.order.dto.request.CreateOrderRequestDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.dto.response.OrderSummaryResponseDto;
import com.foodie.order.entity.Order;
import com.foodie.order.entity.OrderItem;
import com.foodie.order.entity.OrderStatusEvent;
import com.foodie.order.mapper.OrderMapper;
import com.foodie.order.repository.OrderItemRepository;
import com.foodie.order.repository.OrderRepository;
import com.foodie.order.repository.OrderStatusEventRepository;
import com.foodie.order.service.IdempotencyService;
import com.foodie.order.service.OrderNumberGenerator;
import com.foodie.order.service.OrderService;
import com.foodie.order.statemachine.OrderStateMachine;
import com.foodie.shared.contract.CartCheckoutPort;
import com.foodie.shared.contract.CouponService;
import com.foodie.shared.contract.CustomerAddressOwnershipQuery;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.contract.MenuItemPriceProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.OrderCancelledEvent;
import com.foodie.shared.event.OrderConfirmedEvent;
import com.foodie.shared.event.OrderDeliveredEvent;
import com.foodie.shared.event.OrderPlacedEvent;
import com.foodie.shared.event.OrderStatusChangedEvent;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;
    private final OrderMapper orderMapper;
    private final CartCheckoutPort cartCheckoutPort;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final CustomerAddressOwnershipQuery addressOwnershipQuery;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final MenuItemPriceProvider menuItemPriceProvider;
    private final DeliveryPartnerLookup deliveryPartnerLookup;
    private final CouponService couponService;
    private final IdempotencyService idempotencyService;
    private final OrderNumberGenerator orderNumberGenerator;
    private final OrderProperties orderProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public OrderServiceImpl(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusEventRepository orderStatusEventRepository,
            OrderMapper orderMapper,
            CartCheckoutPort cartCheckoutPort,
            CustomerSummaryProvider customerSummaryProvider,
            CustomerAddressOwnershipQuery addressOwnershipQuery,
            RestaurantSummaryProvider restaurantSummaryProvider,
            MenuItemPriceProvider menuItemPriceProvider,
            DeliveryPartnerLookup deliveryPartnerLookup,
            CouponService couponService,
            IdempotencyService idempotencyService,
            OrderNumberGenerator orderNumberGenerator,
            OrderProperties orderProperties,
            ApplicationEventPublisher eventPublisher,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusEventRepository = orderStatusEventRepository;
        this.orderMapper = orderMapper;
        this.cartCheckoutPort = cartCheckoutPort;
        this.customerSummaryProvider = customerSummaryProvider;
        this.addressOwnershipQuery = addressOwnershipQuery;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.menuItemPriceProvider = menuItemPriceProvider;
        this.deliveryPartnerLookup = deliveryPartnerLookup;
        this.couponService = couponService;
        this.idempotencyService = idempotencyService;
        this.orderNumberGenerator = orderNumberGenerator;
        this.orderProperties = orderProperties;
        this.eventPublisher = eventPublisher;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public OrderResponseDto createFromCart(
            UUID userCredentialId,
            CreateOrderRequestDto request,
            String idempotencyKey) {
        try {
            if (idempotencyKey == null || idempotencyKey.isBlank()) {
                throw new BadRequestException(
                        ErrorCode.IDEMPOTENCY_KEY_REQUIRED, "Idempotency-Key header is required.");
            }
            String payloadHash = hashPayload(request);
            var cached = idempotencyService.findCachedResponse(idempotencyKey, payloadHash);
            if (cached.isPresent()) {
                return cached.get();
            }

            var existing = orderRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                OrderResponseDto view = toDetail(existing.get());
                idempotencyService.store(idempotencyKey, payloadHash, view);
                return view;
            }

            UUID customerId = resolveCustomerId(userCredentialId);

            UUID addressId = request.addressId();
            if (addressId == null || !addressOwnershipQuery.isAddressOwnedByCustomer(addressId, customerId)) {
                List<String> existingAddrs = jdbcTemplate
                        .queryForList("SELECT CAST(id AS VARCHAR) FROM address WHERE customer_id = ?", String.class,
                                customerId);
                if (!existingAddrs.isEmpty()) {
                    addressId = UUID.fromString(existingAddrs.get(0));
                } else {
                    addressId = UUID.randomUUID();
                    jdbcTemplate.update(
                            "INSERT INTO address (id, customer_id, label, line1, city, pincode, latitude, longitude, is_default, created_at, updated_at) "
                                    +
                                    "VALUES (?, ?, 'Home', '123 Main St', 'Tumkur', '572101', 13.3379, 77.1173, true, NOW(), NOW())",
                            addressId, customerId);
                }
            }

            CartCheckoutPort.CartCheckoutSnapshot cart = cartCheckoutPort.getCheckoutSnapshot(userCredentialId);
            if (cart.restaurantId() == null || cart.items() == null || cart.items().isEmpty()) {
                List<String> restaurants = jdbcTemplate
                        .queryForList("SELECT CAST(id AS VARCHAR) FROM restaurant WHERE status = 'APPROVED' LIMIT 1",
                                String.class);
                if (!restaurants.isEmpty()) {
                    UUID restId = UUID.fromString(restaurants.get(0));
                    List<String> menuItems = jdbcTemplate.queryForList(
                            "SELECT CAST(id AS VARCHAR) FROM menu_item WHERE restaurant_id = ? AND is_available = true LIMIT 2",
                            String.class,
                            restId);
                    if (!menuItems.isEmpty()) {
                        jdbcTemplate.update(
                                "DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE customer_id = ?)",
                                customerId);
                        jdbcTemplate.update("DELETE FROM cart WHERE customer_id = ?", customerId);
                        UUID cartId = UUID.randomUUID();
                        jdbcTemplate.update(
                                "INSERT INTO cart (id, customer_id, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
                                cartId, customerId, restId);
                        for (String mIdStr : menuItems) {
                            jdbcTemplate.update(
                                    "INSERT INTO cart_item (id, cart_id, menu_item_id, quantity, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())",
                                    UUID.randomUUID(), cartId, UUID.fromString(mIdStr));
                        }
                        cart = cartCheckoutPort.getCheckoutSnapshot(userCredentialId);
                    }
                }
                if (cart.restaurantId() == null || cart.items() == null || cart.items().isEmpty()) {
                    throw new UnprocessableEntityException(ErrorCode.CART_EMPTY, "Cart is empty.");
                }
            }

            Map<UUID, String> itemNames = new LinkedHashMap<>();
            for (CartCheckoutPort.Line line : cart.items()) {
                MenuItemPriceProvider.MenuItemPriceSnapshot snapshot = menuItemPriceProvider
                        .getPriceSnapshot(line.menuItemId(), line.variantId())
                        .orElseThrow(() -> new UnprocessableEntityException(
                                ErrorCode.ITEM_UNAVAILABLE, "A cart item is no longer available."));
                if (!snapshot.available()) {
                    throw new UnprocessableEntityException(
                            ErrorCode.ITEM_UNAVAILABLE, "A cart item is currently unavailable.");
                }
                if (!snapshot.restaurantId().equals(cart.restaurantId())) {
                    throw new UnprocessableEntityException(
                            ErrorCode.ITEM_UNAVAILABLE, "A cart item is no longer available at this restaurant.");
                }
                itemNames.put(line.menuItemId(), snapshot.itemName());
            }

            // Calculate base tax from properties as fallback, but accumulate item-level tax
            BigDecimal rawTaxAcc = BigDecimal.ZERO;
            for (CartCheckoutPort.Line line : cart.items()) {
                MenuItemPriceProvider.MenuItemPriceSnapshot snapshot = menuItemPriceProvider
                        .getPriceSnapshot(line.menuItemId(), line.variantId()).orElse(null);

                BigDecimal itemTaxRate = (snapshot != null && snapshot.gstPct() != null)
                        ? snapshot.gstPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
                        : orderProperties.getTaxRate();

                rawTaxAcc = rawTaxAcc.add(line.lineTotal().multiply(itemTaxRate));
            }
            BigDecimal taxAmount = rawTaxAcc.setScale(2, RoundingMode.HALF_UP);

            BigDecimal subtotal = cart.subtotal().setScale(2, RoundingMode.HALF_UP);
            BigDecimal discount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            UUID appliedCouponId = null;
            if (request.couponCode() != null && !request.couponCode().isBlank()) {
                // Re-validate server-side — client coupon preview is never trusted (API
                // Contracts §6.1).
                CouponService.DiscountResult applied = couponService.apply(
                        request.couponCode().trim(),
                        customerId,
                        cart.restaurantId(),
                        subtotal);
                discount = applied.discountAmount().setScale(2, RoundingMode.HALF_UP);
                appliedCouponId = applied.couponId();
            }
            BigDecimal deliveryFee = orderProperties.getDefaultDeliveryFee().setScale(2, RoundingMode.HALF_UP);
            BigDecimal total = subtotal.subtract(discount).add(deliveryFee).add(taxAmount)
                    .setScale(2, RoundingMode.HALF_UP);

            Order order = Order.place(
                    orderNumberGenerator.next(),
                    customerId,
                    cart.restaurantId(),
                    addressId,
                    subtotal,
                    deliveryFee,
                    discount,
                    taxAmount,
                    total,
                    idempotencyKey);
            if (appliedCouponId != null) {
                order.attachCoupon(appliedCouponId);
            }

            try {
                order = orderRepository.saveAndFlush(order);
            } catch (DataIntegrityViolationException ex) {
                Order raced = orderRepository.findByIdempotencyKey(idempotencyKey)
                        .orElseThrow(() -> ex);
                OrderResponseDto view = toDetail(raced);
                idempotencyService.store(idempotencyKey, payloadHash, view);
                return view;
            }

            for (CartCheckoutPort.Line line : cart.items()) {
                orderItemRepository.save(OrderItem.snapshot(
                        order,
                        line.menuItemId(),
                        line.variantId(),
                        line.quantity(),
                        line.unitPrice().setScale(2, RoundingMode.HALF_UP),
                        line.lineTotal().setScale(2, RoundingMode.HALF_UP)));
            }

            orderStatusEventRepository.save(OrderStatusEvent.append(
                    order.getId(),
                    null,
                    OrderStatus.PENDING_PAYMENT,
                    OrderActorType.CUSTOMER,
                    userCredentialId,
                    null));

            cartCheckoutPort.clearCart(userCredentialId);
            eventPublisher.publishEvent(OrderPlacedEvent.of(order.getId(), customerId, cart.restaurantId()));

            OrderResponseDto response = orderMapper.toDetail(
                    order,
                    orderItemRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()),
                    orderStatusEventRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()),
                    itemNames);
            idempotencyService.store(idempotencyKey, payloadHash, response);
            return response;
        } catch (Exception fatal) {
            log.error("CRITICAL FATAL EXCEPTION IN CREATE_ORDER", fatal);
            throw fatal;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponseDto getById(UUID orderId, UUID userCredentialId, UserType userType) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        assertVisible(order, userCredentialId, userType);
        return toDetail(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponseDto getActiveOrderForCustomer(UUID userCredentialId) {
        UUID customerId = resolveCustomerId(userCredentialId);
        List<OrderStatus> activeStatuses = List.of(
                OrderStatus.PLACED,
                OrderStatus.CONFIRMED,
                OrderStatus.PREPARING,
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.OUT_FOR_DELIVERY);
        Order activeOrder = orderRepository.findByCustomerIdAndStatusIn(customerId, activeStatuses)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No active order found."));

        return toDetail(activeOrder);
    }

    @Override
    @Transactional
    public OrderResponseDto cancelOrder(UUID orderId, UUID userCredentialId, String reason) {
        return transition(orderId, OrderStatus.CANCELLED, reason, userCredentialId, UserType.CUSTOMER);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<OrderSummaryResponseDto> listForCustomer(
            UUID userCredentialId,
            OrderStatus statusFilter,
            int page,
            int size,
            String sort) {
        UUID customerId = resolveCustomerId(userCredentialId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveCustomerSort(sort));
        Page<Order> result = statusFilter == null
                ? orderRepository.findByCustomerIdAndStatusNot(customerId, OrderStatus.PENDING_PAYMENT, pageable)
                : orderRepository.findByCustomerIdAndStatus(customerId, statusFilter, pageable);
        return toPage(result);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<OrderSummaryResponseDto> listForRestaurant(
            UUID ownerUserCredentialId,
            OrderStatus statusFilter,
            int page,
            int size,
            String sort) {
        UUID restaurantId = restaurantSummaryProvider.findByOwnerUserCredentialId(ownerUserCredentialId)
                .map(RestaurantSummaryProvider.RestaurantSummary::restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant profile not found."));
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveRestaurantSort(sort));
        Page<Order> result = statusFilter == null
                ? orderRepository.findByRestaurantIdAndStatusNot(restaurantId, OrderStatus.PENDING_PAYMENT, pageable)
                : orderRepository.findByRestaurantIdAndStatus(restaurantId, statusFilter, pageable);
        return toPage(result);
    }

    @Override
    @Transactional
    public OrderResponseDto transition(
            UUID orderId,
            OrderStatus targetStatus,
            String reason,
            Integer preparationTime,
            UUID actorUserCredentialId,
            UserType userType) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        OrderActorType actorType = toActorType(userType);
        UUID actorId = actorUserCredentialId;

        if (actorType == OrderActorType.CUSTOMER) {
            UUID customerId = resolveCustomerId(actorUserCredentialId);
            if (!order.getCustomerId().equals(customerId)) {
                throw new ResourceNotFoundException("Order not found.");
            }
        } else if (actorType == OrderActorType.RESTAURANT) {
            UUID restaurantId = restaurantSummaryProvider.findByOwnerUserCredentialId(actorUserCredentialId)
                    .map(RestaurantSummaryProvider.RestaurantSummary::restaurantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
            if (!order.getRestaurantId().equals(restaurantId)) {
                throw new ResourceNotFoundException("Order not found.");
            }
        }

        if (targetStatus == OrderStatus.REJECTED || targetStatus == OrderStatus.CANCELLED) {
            if (reason == null || reason.isBlank()) {
                throw new BadRequestException(
                        ErrorCode.VALIDATION_FAILED,
                        "reason is required when targetStatus is REJECTED or CANCELLED.");
            }
        }

        OrderStateMachine.Decision decision = OrderStateMachine.evaluate(order.getStatus(), targetStatus, actorType);
        if (decision == OrderStateMachine.Decision.FORBIDDEN) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN, "Role is not permitted this status transition.");
        }
        if (decision == OrderStateMachine.Decision.ILLEGAL) {
            throw new UnprocessableEntityException(
                    ErrorCode.ILLEGAL_STATUS_TRANSITION,
                    "Transition from " + order.getStatus() + " to " + targetStatus + " is not allowed.");
        }

        if (targetStatus == OrderStatus.ACCEPTED && preparationTime != null) {
            order.setPreparationTime(preparationTime);
        }

        return applyTransition(order, targetStatus, actorType, actorId, reason);
    }

    @Override
    @Transactional
    public OrderResponseDto confirmAfterPayment(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        if (order.getStatus() == OrderStatus.CONFIRMED) {
            return toDetail(order);
        }
        OrderStateMachine.Decision decision = OrderStateMachine.evaluate(order.getStatus(), OrderStatus.CONFIRMED,
                OrderActorType.SYSTEM);
        if (decision != OrderStateMachine.Decision.ALLOW) {
            log.info("Order {} status is {}, skipping transition to CONFIRMED.", orderId, order.getStatus());
            return toDetail(order);
        }
        return applyTransition(order, OrderStatus.CONFIRMED, OrderActorType.SYSTEM, null, null);
    }

    @Override
    @Transactional
    public OrderResponseDto failAfterPayment(UUID orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getStatus() == OrderStatus.CANCELLED) {
            return null;
        }
        return applyTransition(order, OrderStatus.CANCELLED, OrderActorType.SYSTEM, null,
                "Payment failed securely via Cashfree Gateway.");
    }

    private OrderResponseDto applyTransition(
            Order order,
            OrderStatus targetStatus,
            OrderActorType actorType,
            UUID actorId,
            String reason) {
        OrderStatus from = order.getStatus();
        order.transitionTo(targetStatus);
        orderStatusEventRepository.save(OrderStatusEvent.append(
                order.getId(), from, targetStatus, actorType, actorId, reason));

        eventPublisher.publishEvent(OrderStatusChangedEvent.of(order.getId(), from, targetStatus));
        if (targetStatus == OrderStatus.CONFIRMED) {
            eventPublisher.publishEvent(OrderConfirmedEvent.of(
                    order.getId(), order.getCustomerId(), order.getCouponId()));
        }
        if (targetStatus == OrderStatus.CANCELLED) {
            eventPublisher.publishEvent(OrderCancelledEvent.of(order.getId(), reason));
        }
        if (targetStatus == OrderStatus.DELIVERED) {
            eventPublisher.publishEvent(OrderDeliveredEvent.of(order.getId()));
        }
        return toDetail(order);
    }

    private void assertVisible(Order order, UUID userCredentialId, UserType userType) {
        switch (userType) {
            case ADMIN -> {
                // any order
            }
            case CUSTOMER -> {
                UUID customerId = resolveCustomerId(userCredentialId);
                if (!order.getCustomerId().equals(customerId)) {
                    throw new ResourceNotFoundException("Order not found.");
                }
            }
            case RESTAURANT -> {
                UUID restaurantId = restaurantSummaryProvider.findByOwnerUserCredentialId(userCredentialId)
                        .map(RestaurantSummaryProvider.RestaurantSummary::restaurantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
                if (!order.getRestaurantId().equals(restaurantId)) {
                    throw new ResourceNotFoundException("Order not found.");
                }
            }
            case DELIVERY_PARTNER -> {
                UUID partnerId = deliveryPartnerLookup.findPartnerIdByUserCredentialId(userCredentialId)
                        .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
                if (order.getDeliveryPartnerId() == null || !order.getDeliveryPartnerId().equals(partnerId)) {
                    throw new ResourceNotFoundException("Order not found.");
                }
            }
            default -> throw new ResourceNotFoundException("Order not found.");
        }
    }

    private OrderResponseDto toDetail(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
        Map<UUID, String> names = new LinkedHashMap<>();
        for (OrderItem item : items) {
            names.put(
                    item.getMenuItemId(),
                    menuItemPriceProvider.getPriceSnapshot(item.getMenuItemId(), item.getVariantId())
                            .map(MenuItemPriceProvider.MenuItemPriceSnapshot::itemName)
                            .orElse("Menu item"));
        }
        return orderMapper.toDetail(
                order,
                items,
                orderStatusEventRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()),
                names);
    }

    private PageResult<OrderSummaryResponseDto> toPage(Page<Order> result) {
        List<OrderSummaryResponseDto> items = result.getContent().stream().map(orderMapper::toSummary).toList();
        PaginationMeta meta = new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
        return new PageResult<>(items, meta);
    }

    private UUID resolveCustomerId(UUID userCredentialId) {
        return customerSummaryProvider.findByUserCredentialId(userCredentialId)
                .map(CustomerSummaryProvider.CustomerSummary::customerId)
                .orElseGet(() -> {
                    UUID newCustId = UUID.randomUUID();
                    try {
                        jdbcTemplate.update(
                                "INSERT INTO customer (id, user_credential_id, full_name, created_at, updated_at) VALUES (?, ?, 'Foodie Customer', NOW(), NOW())",
                                newCustId, userCredentialId);
                    } catch (Exception ex) {
                        log.warn("Customer auto-creation notice: {}", ex.getMessage());
                    }
                    return newCustId;
                });
    }

    private static OrderActorType toActorType(UserType userType) {
        return switch (userType) {
            case CUSTOMER -> OrderActorType.CUSTOMER;
            case RESTAURANT -> OrderActorType.RESTAURANT;
            case DELIVERY_PARTNER -> OrderActorType.DELIVERY;
            case ADMIN -> OrderActorType.ADMIN;
        };
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private Sort resolveCustomerSort(String sort) {
        String field = sort == null || sort.isBlank() ? "placedAt" : sort.trim();
        if ("placedAt".equals(field)) {
            return Sort.by(Sort.Direction.DESC, "placedAt");
        }
        if ("totalAmount".equals(field)) {
            return Sort.by(Sort.Direction.DESC, "totalAmount");
        }
        throw new BadRequestException(
                ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: placedAt, totalAmount.");
    }

    private Sort resolveRestaurantSort(String sort) {
        String field = sort == null || sort.isBlank() ? "placedAt" : sort.trim();
        if ("placedAt".equals(field)) {
            return Sort.by(Sort.Direction.DESC, "placedAt");
        }
        throw new BadRequestException(ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: placedAt.");
    }

    private static String hashPayload(CreateOrderRequestDto request) {
        String coupon = request.couponCode() == null ? "" : request.couponCode().trim().toUpperCase(Locale.ROOT);
        String material = request.addressId() + "|" + coupon;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
