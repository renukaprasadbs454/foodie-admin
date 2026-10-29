/**
 * P2-ADM-04 order shapes — OrderResponseDto / OverrideOrderStatusRequestDto.
 */

export const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItemRecord {
  id: string;
  orderCode?: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  module: string;
  itemsSummary: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'DIGITAL' | 'Online Payment' | 'Cash on Delivery' | string;
  paymentStatus?: 'Completed' | 'Processing' | 'Refunded' | 'Cancelled' | string;
  status: 'PENDING' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED';
  createdAt: string;
  zoneId?: string;
  zoneName?: string;
  assignedDeliveryPartnerId?: string | null;
  assignedDeliveryPartnerName?: string | null;
}

export type OrderItem = {
  menuItemId?: string;
  variantId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
};

export type OrderStatusEvent = {
  eventId?: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  reason?: string | null;
  createdAt?: string | null;
};

export type AdminOrder = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus | string;
  customerId?: string;
  restaurantId?: string;
  addressId?: string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
  totalAmount?: number | string;
  placedAt?: string | null;
  items?: OrderItem[] | null;
  orderStatusEvents?: OrderStatusEvent[] | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  assignedDeliveryPartnerId?: string | null;
  assignedDeliveryPartnerName?: string | null;
  assignedDeliveryPartnerPhone?: string | null;
};

export type OverrideOrderStatusBody = {
  targetStatus: OrderStatus;
  reason: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOrderUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function validateOverrideReason(
  reason: string,
): { ok: true; reason: string } | { ok: false; message: string } {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, message: 'Override reason is required.' };
  }
  if (trimmed.length > 500) {
    return { ok: false, message: 'Override reason must be 500 characters or fewer.' };
  }
  return { ok: true, reason: trimmed };
}

export function validateOverrideBody(
  status: string,
  reason: string,
): { ok: true; body: OverrideOrderStatusBody } | { ok: false; message: string } {
  if (!isOrderStatus(status)) {
    return { ok: false, message: 'Invalid order status selected.' };
  }
  const reasonCheck = validateOverrideReason(reason);
  if (!reasonCheck.ok) {
    return reasonCheck;
  }
  return {
    ok: true,
    body: {
      targetStatus: status,
      reason: reasonCheck.reason,
    },
  };
}

export function formatMoneyInr(amount: number | string | undefined | null): string {
  if (amount == null || amount === '') return '₹0.00';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
}
