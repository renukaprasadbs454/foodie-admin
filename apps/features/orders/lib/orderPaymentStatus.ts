import type { OrderItemRecord } from '../types';

export interface PaymentStatusInfo {
  label: 'Completed' | 'Processing' | 'Refunded' | 'Cancelled' | string;
  subtext: string;
  bg: string;
  color: string;
  border: string;
  dotColor: string;
}

export function getOrderPaymentStatusInfo(order: {
  paymentMethod?: string;
  status?: string;
  paymentStatus?: string;
}): PaymentStatusInfo {
  const rawMethod = String(order.paymentMethod || '').toUpperCase();
  const isCod = rawMethod.includes('COD') || (rawMethod.includes('CASH') && !rawMethod.includes('CASHFREE'));
  const status = String(order.status || '').toUpperCase();

  if (isCod) {
    if (status === 'DELIVERED') {
      return {
        label: 'Completed',
        subtext: 'Amount received by partner',
        bg: '#DCFCE7',
        color: '#15803D',
        border: '#BBF7D0',
        dotColor: '#16A34A',
      };
    }
    if (status === 'CANCELED' || status === 'CANCELLED' || status === 'REJECTED') {
      return {
        label: 'Cancelled',
        subtext: 'Order cancelled (not collected)',
        bg: '#F3F4F6',
        color: '#6B7280',
        border: '#E5E7EB',
        dotColor: '#9CA3AF',
      };
    }
    return {
      label: 'Processing',
      subtext: 'Awaiting delivery partner collection',
      bg: '#FEF3C7',
      color: '#B45309',
      border: '#FDE68A',
      dotColor: '#F59E0B',
    };
  }

  // Online Payment
  if (status === 'CANCELED' || status === 'CANCELLED' || status === 'REJECTED') {
    return {
      label: 'Refunded',
      subtext: 'Online payment reversed',
      bg: '#FEE2E2',
      color: '#B91C1C',
      border: '#FECACA',
      dotColor: '#EF4444',
    };
  }

  return {
    label: 'Completed',
    subtext: 'Paid online via gateway',
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#BBF7D0',
    dotColor: '#16A34A',
  };
}
