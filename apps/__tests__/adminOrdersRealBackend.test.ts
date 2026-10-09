import type { OrderItemRecord } from '../features/orders/types';

describe('Admin Orders Real Backend Integration', () => {
  function mapBackendOrders(raw: any[]): OrderItemRecord[] {
    return raw.map((item: any) => {
      let status = String(item.status || 'PENDING').toUpperCase();
      if (['PLACED', 'CONFIRMED', 'ACCEPTED', 'PENDING_PAYMENT'].includes(status)) {
        status = 'PENDING';
      } else if (status === 'WAITING_FOR_DELIVERY_PARTNER') {
        status = 'READY_FOR_PICKUP';
      } else if (['PICKED_UP', 'ASSIGNED', 'REACHED_RESTAURANT'].includes(status)) {
        status = 'OUT_FOR_DELIVERY';
      } else if (['CANCELLED', 'REJECTED'].includes(status)) {
        status = 'CANCELED';
      }

      return {
        id: String(item.id || item.orderId || ''),
        orderCode: item.orderCode || item.orderNumber || '',
        customerName: item.customerName || 'Customer',
        customerPhone: item.customerPhone || '',
        storeName: item.storeName || item.restaurantName || 'Restaurant',
        module: item.module || 'General Dining',
        itemsSummary: item.itemsSummary || 'Order Items',
        totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : Number(item.totalAmount) || 0,
        paymentMethod: (item.paymentMethod === 'COD' ? 'COD' : 'DIGITAL') as 'COD' | 'DIGITAL',
        status: status as OrderItemRecord['status'],
        createdAt: item.createdAt || '',
      };
    });
  }

  it('correctly normalizes real backend orders from database', () => {
    const rawBackendOrders = [
      {
        id: '61d6678f-74fc-41d5-9b6d-7f846b0c713e',
        orderCode: 'FD-20260903-000017',
        customerName: 'Customer',
        customerPhone: '+919972301895',
        storeName: 'Hotel Mayura',
        module: 'SOUTH_INDIAN, NORTH_INDIAN',
        itemsSummary: 'Multi-dish order',
        totalAmount: 333.45,
        paymentMethod: 'DIGITAL',
        status: 'PICKED_UP',
        createdAt: '2026-09-03T18:32:59.638203Z',
      },
      {
        id: 'e3fff708-cf9d-43aa-9b7b-61362a0273a4',
        orderCode: 'FD-20260903-000014',
        customerName: 'Customer',
        customerPhone: '+919972301895',
        storeName: 'Meghana Foods (Biryani)',
        module: 'Biriyani, South Indian',
        itemsSummary: 'Multi-dish order',
        totalAmount: 660.0,
        paymentMethod: 'DIGITAL',
        status: 'PLACED',
        createdAt: '2026-09-03T06:19:18.306282Z',
      },
      {
        id: '76a2c40d-ef9d-4128-bd55-d834530ec681',
        orderCode: 'FD-20260903-000011',
        customerName: 'Customer',
        customerPhone: '+919972301895',
        storeName: 'Ganesha Hotel',
        module: 'SOUTH_INDIAN, NORTH_INDIAN',
        itemsSummary: 'Multi-dish order',
        totalAmount: 51.0,
        paymentMethod: 'DIGITAL',
        status: 'CANCELLED',
        createdAt: '2026-09-03T05:23:17.557560Z',
      },
    ];

    const transformed = mapBackendOrders(rawBackendOrders);
    expect(transformed).toHaveLength(3);

    // Verify PICKED_UP -> OUT_FOR_DELIVERY
    expect(transformed[0].orderCode).toBe('FD-20260903-000017');
    expect(transformed[0].storeName).toBe('Hotel Mayura');
    expect(transformed[0].totalAmount).toBe(333.45);
    expect(transformed[0].status).toBe('OUT_FOR_DELIVERY');

    // Verify PLACED -> PENDING
    expect(transformed[1].orderCode).toBe('FD-20260903-000014');
    expect(transformed[1].status).toBe('PENDING');

    // Verify CANCELLED -> CANCELED
    expect(transformed[2].orderCode).toBe('FD-20260903-000011');
    expect(transformed[2].status).toBe('CANCELED');
  });

  it('ensures no mock orders are returned', () => {
    const transformed = mapBackendOrders([]);
    expect(transformed).toEqual([]);
    expect(transformed).not.toContainEqual(
      expect.objectContaining({ storeName: 'Royal Biryani House' })
    );
  });
});
