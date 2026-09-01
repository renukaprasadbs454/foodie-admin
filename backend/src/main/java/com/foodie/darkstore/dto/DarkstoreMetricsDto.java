package com.foodie.darkstore.dto;

import java.math.BigDecimal;

public record DarkstoreMetricsDto(
        long totalOrders,
        long newOrders,
        long ordersBeingPicked,
        long ordersReadyForDispatch,
        long completedOrders,
        long cancelledOrders,
        long lowStockProducts,
        long outOfStockProducts,
        long totalProducts,
        BigDecimal todaysRevenue,
        BigDecimal averageOrderValue,
        long pendingActionsCount
) {
}
