package com.foodie.order.statemachine;

import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;

/**
 * Binding order state machine (API Contracts MODULE 6 + Phase3 §10).
 */
public final class OrderStateMachine {

    public enum Decision {
        ALLOW,
        FORBIDDEN,
        ILLEGAL
    }

    private OrderStateMachine() {
    }

    public static boolean isTerminal(OrderStatus status) {
        return status == OrderStatus.DELIVERED
                || status == OrderStatus.CANCELLED
                || status == OrderStatus.REJECTED;
    }

    public static boolean isPrePreparing(OrderStatus status) {
        return status == OrderStatus.PENDING_PAYMENT
                || status == OrderStatus.PLACED
                || status == OrderStatus.CONFIRMED
                || status == OrderStatus.ACCEPTED
                || status == OrderStatus.PREPARING
                || status == OrderStatus.WAITING_FOR_DELIVERY_PARTNER
                || status == OrderStatus.READY_FOR_PICKUP;
    }

    public static Decision evaluate(OrderStatus from, OrderStatus to, OrderActorType actor) {
        if (from == null || to == null || from == to || isTerminal(from)) {
            return Decision.ILLEGAL;
        }

        if (actor == OrderActorType.ADMIN) {
            return Decision.ALLOW;
        }

        if (actor == OrderActorType.CUSTOMER) {
            if (to == OrderStatus.CANCELLED) {
                return isPrePreparing(from) ? Decision.ALLOW : Decision.ILLEGAL;
            }
            if (from == OrderStatus.PENDING_PAYMENT && to == OrderStatus.CONFIRMED) {
                return Decision.ALLOW;
            }
            return Decision.FORBIDDEN;
        }

        if (actor == OrderActorType.RESTAURANT) {
            return switch (to) {
                case ACCEPTED ->
                    (from == OrderStatus.CONFIRMED || from == OrderStatus.PLACED) ? Decision.ALLOW : Decision.ILLEGAL;
                case REJECTED ->
                    (from == OrderStatus.CONFIRMED || from == OrderStatus.PLACED) ? Decision.ALLOW : Decision.ILLEGAL;
                case PREPARING ->
                    (from == OrderStatus.ACCEPTED || from == OrderStatus.CONFIRMED || from == OrderStatus.PLACED)
                            ? Decision.ALLOW
                            : Decision.ILLEGAL;
                case READY_FOR_PICKUP ->
                    (from == OrderStatus.PREPARING || from == OrderStatus.ACCEPTED || from == OrderStatus.CONFIRMED
                            || from == OrderStatus.WAITING_FOR_DELIVERY_PARTNER || from == OrderStatus.ASSIGNED
                            || from == OrderStatus.PLACED) ? Decision.ALLOW : Decision.ILLEGAL;
                case PICKED_UP ->
                    (from == OrderStatus.READY_FOR_PICKUP || from == OrderStatus.PREPARING
                            || from == OrderStatus.ACCEPTED || from == OrderStatus.CONFIRMED
                            || from == OrderStatus.PLACED)
                                    ? Decision.ALLOW
                                    : Decision.ILLEGAL;
                default -> Decision.FORBIDDEN;
            };
        }

        if (actor == OrderActorType.SYSTEM) {
            return isSystemEdge(from, to) ? Decision.ALLOW : Decision.ILLEGAL;
        }

        // DELIVERY partners use Delivery-module endpoints, not this PATCH
        return Decision.FORBIDDEN;
    }

    private static boolean isSystemEdge(OrderStatus from, OrderStatus to) {
        return (from == OrderStatus.PENDING_PAYMENT && to == OrderStatus.CONFIRMED)
                || (from == OrderStatus.PENDING_PAYMENT && to == OrderStatus.CANCELLED)
                || (from == OrderStatus.PLACED && to == OrderStatus.CONFIRMED)
                || (from == OrderStatus.ACCEPTED && to == OrderStatus.WAITING_FOR_DELIVERY_PARTNER)
                || (from == OrderStatus.PREPARING && to == OrderStatus.WAITING_FOR_DELIVERY_PARTNER)
                || (from == OrderStatus.READY_FOR_PICKUP && to == OrderStatus.WAITING_FOR_DELIVERY_PARTNER)
                || (from == OrderStatus.CONFIRMED && to == OrderStatus.WAITING_FOR_DELIVERY_PARTNER)
                || (from == OrderStatus.WAITING_FOR_DELIVERY_PARTNER && to == OrderStatus.ASSIGNED)
                || (from == OrderStatus.ACCEPTED && to == OrderStatus.ASSIGNED)
                || (from == OrderStatus.PREPARING && to == OrderStatus.ASSIGNED)
                || (from == OrderStatus.READY_FOR_PICKUP && to == OrderStatus.ASSIGNED)
                || (from == OrderStatus.ASSIGNED && to == OrderStatus.PICKED_UP)
                || (from == OrderStatus.PICKED_UP && to == OrderStatus.OUT_FOR_DELIVERY)
                || (from == OrderStatus.OUT_FOR_DELIVERY && to == OrderStatus.DELIVERED);
    }
}
