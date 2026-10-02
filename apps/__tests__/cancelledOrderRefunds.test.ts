import type { CancelledOrderRefundRequest } from '../features/payments/types';

describe('Cancelled Order Online Refund Approvals', () => {
  it('validates structure of a cancelled order online payment refund request', () => {
    const mockRequest: CancelledOrderRefundRequest = {
      id: 'CR-REF-FD-20260903-000011',
      orderId: 'FD-20260903-000011',
      orderNumber: '#000011',
      customerId: 'CUST-5A4A-9011',
      customerName: 'Customer 5a4a',
      customerPhone: '+91 98450 12011',
      customerEmail: 'customer5a4a@foodie.local',
      paymentUuid: '76a2c40d-ef9d-4128-bd55-d834530ec681',
      amount: 90.0,
      paymentMethod: 'ONLINE (CASHFREE UPI)',
      isOnlinePayment: true,
      gatewayTransactionId: 'cf_pay_9011_live',
      gatewayProvider: 'CASHFREE',
      cancellationReason: 'Customer cancelled: Delivery time exceeded initial estimate.',
      cancelledBy: 'CUSTOMER',
      cancelledAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
    };

    expect(mockRequest.isOnlinePayment).toBe(true);
    expect(mockRequest.amount).toBe(90.0);
    expect(mockRequest.customerName).toBe('Customer 5a4a');
    expect(mockRequest.customerId).toBe('CUST-5A4A-9011');
    expect(mockRequest.status).toBe('PENDING_APPROVAL');
    expect(mockRequest.paymentMethod).toContain('ONLINE');
    expect(mockRequest.gatewayProvider).toBe('CASHFREE');
  });

  it('correctly filters pending vs processed cancelled refunds', () => {
    const list: CancelledOrderRefundRequest[] = [
      {
        id: '1',
        orderId: 'O-1',
        customerId: 'C-1',
        customerName: 'Alice',
        paymentUuid: 'p-1',
        amount: 250,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Mistake order',
        cancelledBy: 'CUSTOMER',
        cancelledAt: '2026-09-30T10:00:00Z',
        status: 'PENDING_APPROVAL',
      },
      {
        id: '2',
        orderId: 'O-2',
        customerId: 'C-2',
        customerName: 'Bob',
        paymentUuid: 'p-2',
        amount: 500,
        paymentMethod: 'ONLINE (CASHFREE CARDS)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Changed mind',
        cancelledBy: 'CUSTOMER',
        cancelledAt: '2026-09-30T09:00:00Z',
        status: 'APPROVED',
      },
    ];

    const pending = list.filter((r) => r.status === 'PENDING_APPROVAL');
    const processed = list.filter((r) => r.status === 'APPROVED' || r.status === 'REFUNDED');

    expect(pending).toHaveLength(1);
    expect(pending[0].customerName).toBe('Alice');
    expect(processed).toHaveLength(1);
    expect(processed[0].customerName).toBe('Bob');
  });
});
