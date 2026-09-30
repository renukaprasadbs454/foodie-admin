package com.foodie.wallet.listener;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.shared.contract.OrderRestaurantAmountQuery;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.OrderDeliveredEvent;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Restaurant earnings: OrderDeliveredEvent → append-only CREDIT on restaurant
 * wallet.
 */
@Component
public class OrderDeliveredWalletListener {

    private static final Logger log = LoggerFactory.getLogger(OrderDeliveredWalletListener.class);

    private final WalletService walletService;
    private final OrderRestaurantAmountQuery orderRestaurantAmountQuery;
    private final RestaurantSummaryProvider restaurantSummaryProvider;

    public OrderDeliveredWalletListener(
            WalletService walletService,
            OrderRestaurantAmountQuery orderRestaurantAmountQuery,
            RestaurantSummaryProvider restaurantSummaryProvider) {
        this.walletService = walletService;
        this.orderRestaurantAmountQuery = orderRestaurantAmountQuery;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
    }

    @EventListener
    @Transactional
    public void onOrderDelivered(OrderDeliveredEvent event) {
        var orderAmountOpt = orderRestaurantAmountQuery.findAmountByOrderId(event.orderId());

        if (orderAmountOpt.isEmpty()) {
            log.warn("Skipping wallet credit for order {} — order details not found", event.orderId());
            return;
        }

        var orderAmount = orderAmountOpt.get();
        BigDecimal subtotal = orderAmount.subtotal();

        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipping wallet credit for order {} — invalid subtotal", event.orderId());
            return;
        }

        var restaurantOpt = restaurantSummaryProvider.findByRestaurantId(orderAmount.restaurantId());
        if (restaurantOpt.isEmpty()) {
            log.warn("Skipping wallet credit for order {} — restaurant {} not found", event.orderId(),
                    orderAmount.restaurantId());
            return;
        }

        BigDecimal commissionPct = restaurantOpt.get().commissionPct();
        if (commissionPct == null) {
            commissionPct = new BigDecimal("18.00"); // default to 18% if not set
        }

        BigDecimal commissionAmount = subtotal.multiply(commissionPct).divide(new BigDecimal("100"), 2,
                RoundingMode.HALF_UP);
        BigDecimal netEarnings = subtotal.subtract(commissionAmount);

        // Include tax if applicable. For this system, we'll assume the restaurant gets
        // the tax.
        BigDecimal taxAmount = orderAmount.taxAmount() != null ? orderAmount.taxAmount() : BigDecimal.ZERO;
        BigDecimal finalEarnings = netEarnings.add(taxAmount);

        log.info("Crediting restaurant {} for order {} finalEarnings {} (Subtotal: {}, CommPct: {}%, Tax: {})",
                orderAmount.restaurantId(), event.orderId(), finalEarnings, subtotal, commissionPct, taxAmount);

        walletService.credit(
                OwnerType.RESTAURANT,
                orderAmount.restaurantId(),
                finalEarnings,
                LedgerReferenceType.ORDER_EARNING,
                event.orderId());
    }
}
