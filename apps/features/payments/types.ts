/**
 * Payment shapes & Commission Distribution System — Foodie Admin.
 * Single source of truth backed by Spring Boot backend entities & endpoints.
 */

export type RefundInitiation = {
  refundRequestId?: string;
  refundId?: string;
  status: string;
};

export type RefundPaymentBody = {
  amount: number;
  reason: string;
};

export interface CommissionConfig {
  restaurantCommissionRate: number; // e.g. 14 = 14%
  deliveryCommissionRate: number;   // e.g. 10 = 10%
  platformFixedFee: number;         // e.g. 40 = ₹40 fixed platform fee
}

export interface PaymentSplitBreakdown {
  totalPaid: number;
  foodSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  adminFoodCommission: number;
  adminDeliveryCommission: number;
  adminTotalRevenue: number;
  restaurantNetShare: number;
  deliveryPartnerNetShare: number;
}

export interface PaymentSettlementRecord {
  id: string;
  settlementId?: string;
  paymentUuid?: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalPaid: number;
  foodSubtotal: number;
  deliveryFee: number;
  platformFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  restaurantFoodCommissionRate?: number;
  restaurantFoodCommission?: number;
  restaurantNetShare: number;
  restaurantName?: string;
  deliveryPartnerCommissionRate?: number;
  deliveryPartnerCommission?: number;
  deliveryPartnerNetShare: number;
  driverName?: string;
  adminTotalRevenue: number;
  settlementStatus: string;
  settledAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  gatewayTransactionId: string;
  gatewayName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LedgerEntryRecord {
  id: string;
  walletAccountId: string;
  amount: number;
  entryType: 'DEBIT' | 'CREDIT';
  referenceType: string;
  referenceId: string;
  balanceAfter: number;
  createdAt: string;
}

export interface RestaurantSettlementRecord {
  id: string;
  restaurantId: string;
  restaurantName: string;
  periodStart: string;
  periodEnd: string;
  totalOrdersCount: number;
  totalSubtotal: number;
  totalCommission: number;
  netPayoutAmount: number;
  status: 'PENDING' | 'DISBURSED' | 'FAILED' | 'CANCELLED';
  paidAt?: string;
  paymentReference?: string;
}

export interface PayoutRecord {
  id: string;
  walletAccountId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;
  referenceNumber?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Utility for local calculation preview if needed.
 */
export function calculatePaymentSplit(
  foodSubtotal: number,
  deliveryFee: number,
  config: CommissionConfig,
): PaymentSplitBreakdown {
  const safeFood = Math.max(0, foodSubtotal);
  const safeDelivery = Math.max(0, deliveryFee);
  const safeFee = Math.max(0, config.platformFixedFee);

  const adminFoodCommission = Number(((safeFood * config.restaurantCommissionRate) / 100).toFixed(2));
  const adminDeliveryCommission = Number(((safeDelivery * config.deliveryCommissionRate) / 100).toFixed(2));

  const adminTotalRevenue = Number((adminFoodCommission + adminDeliveryCommission + safeFee).toFixed(2));
  const restaurantNetShare = Number((safeFood - adminFoodCommission).toFixed(2));
  const deliveryPartnerNetShare = Number((safeDelivery - adminDeliveryCommission).toFixed(2));

  const totalPaid = Number((safeFood + safeDelivery + safeFee).toFixed(2));

  return {
    totalPaid,
    foodSubtotal: safeFood,
    deliveryFee: safeDelivery,
    platformFee: safeFee,
    adminFoodCommission,
    adminDeliveryCommission,
    adminTotalRevenue,
    restaurantNetShare,
    deliveryPartnerNetShare,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPaymentUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function validateRefundForm(
  paymentId: string,
  amountRaw: string,
  reason: string,
):
  | { ok: true; paymentId: string; body: RefundPaymentBody }
  | { ok: false; message: string } {
  const id = paymentId.trim();
  if (!id) {
    return { ok: false, message: 'Payment ID is required.' };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, message: 'Amount must be at least 0.01.' };
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, message: 'Refund reason is required.' };
  }
  if (trimmed.length > 500) {
    return { ok: false, message: 'Refund reason must be 500 characters or fewer.' };
  }
  return {
    ok: true,
    paymentId: id,
    body: { amount, reason: trimmed },
  };
}
