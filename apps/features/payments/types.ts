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
  status: 'PENDING' | 'PROCESSING' | 'REQUESTED' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;
  referenceNumber?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerName?: string;
}

export interface CancelledOrderRefundRequest {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentUuid: string;
  amount: number;
  paymentMethod: string;
  isOnlinePayment: boolean;
  gatewayTransactionId?: string;
  gatewayProvider: 'CASHFREE';
  cancellationReason: string;
  cancelledBy: 'CUSTOMER' | 'RESTAURANT' | 'ADMIN';
  cancelledAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  refundReference?: string;
  reviewedBy?: string;
  reviewedAt?: string;
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

export type TransactionDateFilter =
  | 'ALL'
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

function parseTransactionTimestamp(raw?: string | number): number | null {
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();
  let parsed = new Date(str).getTime();
  if (!isNaN(parsed)) return parsed;
  if (str.includes(' ')) {
    parsed = new Date(str.replace(' ', 'T')).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

export function filterTransactionsByDateRange(
  transactions: PaymentTransactionRecord[],
  filter: TransactionDateFilter,
  customStartDate?: string,
  customEndDate?: string,
  referenceDate: Date = new Date(),
): PaymentTransactionRecord[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }
  if (filter === 'ALL') {
    return transactions;
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDate = referenceDate.getDate();
  const refDay = referenceDate.getDay();

  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  switch (filter) {
    case 'TODAY': {
      rangeStart = new Date(refYear, refMonth, refDate, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_WEEK': {
      // Current week starting Monday and ending Sunday
      const diffToMonday = refDay === 0 ? 6 : refDay - 1;
      rangeStart = new Date(refYear, refMonth, refDate - diffToMonday, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate - diffToMonday + 6, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_MONTH': {
      // Current calendar month: 1st day to last day of month
      rangeStart = new Date(refYear, refMonth, 1, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth + 1, 0, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_YEAR': {
      // Current calendar year: Jan 1 to Dec 31
      rangeStart = new Date(refYear, 0, 1, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, 11, 31, 23, 59, 59, 999).getTime();
      break;
    }
    case 'CUSTOM': {
      if (customStartDate && customStartDate.trim()) {
        const parts = customStartDate.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            rangeStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
          }
        } else {
          const parsed = new Date(customStartDate);
          if (!isNaN(parsed.getTime())) {
            rangeStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0).getTime();
          }
        }
      }

      if (customEndDate && customEndDate.trim()) {
        const parts = customEndDate.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            rangeEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
          }
        } else {
          const parsed = new Date(customEndDate);
          if (!isNaN(parsed.getTime())) {
            rangeEnd = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999).getTime();
          }
        }
      }

      // If user hasn't specified start or end date yet in Custom mode, show all transactions
      if (rangeStart === null && rangeEnd === null) {
        return transactions;
      }
      break;
    }
  }

  return transactions.filter((tx) => {
    const time = parseTransactionTimestamp(tx.createdAt || tx.updatedAt);
    if (time === null) return false;
    if (rangeStart !== null && time < rangeStart) return false;
    if (rangeEnd !== null && time > rangeEnd) return false;
    return true;
  });
}

export type PaymentDateFilter =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export function parseRecordTimestamp(raw?: string | number | null): number | null {
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();
  if (!str) return null;

  // Handle YYYY-MM-DD format directly to avoid UTC day boundary shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  }

  let parsed = new Date(str).getTime();
  if (!isNaN(parsed)) return parsed;
  if (str.includes(' ')) {
    parsed = new Date(str.replace(' ', 'T')).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

export function filterRecordsByDateRange<T>(
  records: T[],
  filter: PaymentDateFilter,
  timestampExtractor: (item: T) => string | number | null | undefined,
  customStartDate?: string,
  customEndDate?: string,
  referenceDate: Date = new Date(),
): T[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }
  if (filter === 'ALL') {
    return records;
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDate = referenceDate.getDate();
  const refDay = referenceDate.getDay();

  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  switch (filter) {
    case 'TODAY': {
      rangeStart = new Date(refYear, refMonth, refDate, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate, 23, 59, 59, 999).getTime();
      break;
    }
    case 'YESTERDAY': {
      rangeStart = new Date(refYear, refMonth, refDate - 1, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate - 1, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_WEEK': {
      // Monday through the current day
      const diffToMonday = refDay === 0 ? 6 : refDay - 1;
      rangeStart = new Date(refYear, refMonth, refDate - diffToMonday, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_MONTH': {
      // First day of current month through current day
      rangeStart = new Date(refYear, refMonth, 1, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate, 23, 59, 59, 999).getTime();
      break;
    }
    case 'THIS_YEAR': {
      // January 1 through current day
      rangeStart = new Date(refYear, 0, 1, 0, 0, 0, 0).getTime();
      rangeEnd = new Date(refYear, refMonth, refDate, 23, 59, 59, 999).getTime();
      break;
    }
    case 'CUSTOM': {
      if (customStartDate && customStartDate.trim()) {
        const parts = customStartDate.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            rangeStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
          }
        } else {
          const parsed = new Date(customStartDate);
          if (!isNaN(parsed.getTime())) {
            rangeStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0).getTime();
          }
        }
      }

      if (customEndDate && customEndDate.trim()) {
        const parts = customEndDate.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            rangeEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
          }
        } else {
          const parsed = new Date(customEndDate);
          if (!isNaN(parsed.getTime())) {
            rangeEnd = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999).getTime();
          }
        }
      }

      if (rangeStart !== null && rangeEnd !== null && rangeStart > rangeEnd) {
        const temp = rangeStart;
        rangeStart = new Date(new Date(rangeEnd).setHours(0, 0, 0, 0)).getTime();
        rangeEnd = new Date(new Date(temp).setHours(23, 59, 59, 999)).getTime();
      }

      if (rangeStart === null && rangeEnd === null) {
        return records;
      }
      break;
    }
  }

  return records.filter((item) => {
    const rawTime = timestampExtractor(item);
    const time = parseRecordTimestamp(rawTime);
    if (time === null) return false;
    if (rangeStart !== null && time < rangeStart) return false;
    if (rangeEnd !== null && time > rangeEnd) return false;
    return true;
  });
}


