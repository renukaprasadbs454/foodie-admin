package com.foodie.admin.service.impl;

import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.PaymentSettlementResponseDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import com.foodie.admin.service.AdminPaymentService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Service;
import com.foodie.order.repository.OrderRepository;
import com.foodie.order.entity.Order;
import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.delivery.entity.DeliveryPartner;

@Service
public class AdminPaymentServiceImpl implements AdminPaymentService {

        private final OrderRepository orderRepository;
        private final RestaurantRepository restaurantRepository;
        private final DeliveryPartnerRepository deliveryPartnerRepository;

        public AdminPaymentServiceImpl(OrderRepository orderRepository, RestaurantRepository restaurantRepository,
                        DeliveryPartnerRepository deliveryPartnerRepository) {
                this.orderRepository = orderRepository;
                this.restaurantRepository = restaurantRepository;
                this.deliveryPartnerRepository = deliveryPartnerRepository;
        }

        private final AtomicReference<CommissionConfigDto> activeConfig = new AtomicReference<>(
                        new CommissionConfigDto(
                                        new BigDecimal("15.00"),
                                        new BigDecimal("10.00"),
                                        new BigDecimal("40.00")));

        @Override
        public CommissionConfigDto getCommissionRules() {
                return activeConfig.get();
        }

        @Override
        public CommissionConfigDto updateCommissionRules(CommissionConfigDto config) {
                CommissionConfigDto updated = new CommissionConfigDto(
                                config.restaurantCommissionRate().setScale(2, RoundingMode.HALF_UP),
                                config.deliveryCommissionRate().setScale(2, RoundingMode.HALF_UP),
                                config.platformFixedFee().setScale(2, RoundingMode.HALF_UP));
                activeConfig.set(updated);
                return updated;
        }

        @Override
        public PaymentSplitBreakdownDto calculateSplit(BigDecimal foodSubtotal, BigDecimal deliveryFee) {
                CommissionConfigDto rules = activeConfig.get();

                BigDecimal food = foodSubtotal != null ? foodSubtotal : BigDecimal.ZERO;
                BigDecimal delivery = deliveryFee != null ? deliveryFee : BigDecimal.ZERO;
                BigDecimal fee = rules.platformFixedFee();

                BigDecimal hundred = new BigDecimal("100.00");
                BigDecimal adminFoodComm = food.multiply(rules.restaurantCommissionRate())
                                .divide(hundred, 2, RoundingMode.HALF_UP);

                BigDecimal adminDelivComm = delivery.multiply(rules.deliveryCommissionRate())
                                .divide(hundred, 2, RoundingMode.HALF_UP);

                BigDecimal adminTotalRev = adminFoodComm.add(adminDelivComm).add(fee).setScale(2, RoundingMode.HALF_UP);
                BigDecimal restaurantShare = food.subtract(adminFoodComm).setScale(2, RoundingMode.HALF_UP);
                BigDecimal deliveryShare = delivery.subtract(adminDelivComm).setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalPaid = food.add(delivery).add(fee).setScale(2, RoundingMode.HALF_UP);

                return new PaymentSplitBreakdownDto(
                                totalPaid,
                                food.setScale(2, RoundingMode.HALF_UP),
                                delivery.setScale(2, RoundingMode.HALF_UP),
                                fee.setScale(2, RoundingMode.HALF_UP),
                                adminFoodComm,
                                adminDelivComm,
                                adminTotalRev,
                                restaurantShare,
                                deliveryShare);
        }

        @Override
        public List<PaymentSettlementResponseDto> listSettlements() {
                List<Order> orders = orderRepository.findAll();
                List<PaymentSettlementResponseDto> result = new ArrayList<>();

                for (Order order : orders) {
                        PaymentSplitBreakdownDto split = calculateSplit(order.getSubtotal(), order.getDeliveryFee());

                        String restaurantName = "Unknown Restaurant";
                        if (order.getRestaurantId() != null) {
                                Restaurant r = restaurantRepository.findById(order.getRestaurantId()).orElse(null);
                                if (r != null)
                                        restaurantName = r.getName();
                        }

                        String driverName = "No Delivery Partner";
                        if (order.getDeliveryPartnerId() != null) {
                                DeliveryPartner dp = deliveryPartnerRepository.findById(order.getDeliveryPartnerId())
                                                .orElse(null);
                                if (dp != null)
                                        driverName = dp.getFullName();
                        }

                        String customerName = "Customer";
                        if (order.getCustomerId() != null) {
                                customerName = "Customer " + order.getCustomerId().toString().substring(0, 4);
                        }

                        result.add(new PaymentSettlementResponseDto(
                                        order.getId(),
                                        order.getId(),
                                        order.getOrderNumber(),
                                        customerName,
                                        "RAZORPAY",
                                        split.totalPaid(),
                                        split.foodSubtotal(),
                                        split.deliveryFee(),
                                        split.adminTotalRevenue(),
                                        split.restaurantNetShare(),
                                        restaurantName,
                                        split.deliveryPartnerNetShare(),
                                        driverName,
                                        "FUNDS_DISTRIBUTED",
                                        order.getPlacedAt()));
                }

                // Sort descending by placedAt
                result.sort((a, b) -> b.settledAt().compareTo(a.settledAt()));

                return result;
        }
}
