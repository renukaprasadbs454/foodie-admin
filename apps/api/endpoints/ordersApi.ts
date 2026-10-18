import { baseApi } from '../baseApi';
import type {
  AdminOrder,
  OrderItemRecord,
  OverrideOrderStatusBody,
} from '../../features/orders/types';

/**
 * Orders RTK — P2-ADM-04 (GET list, GET by id + admin override-status).
 */
export const ordersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminOrders: builder.query<OrderItemRecord[], { zoneId?: string } | void>({
      query: (arg) => {
        const zoneId = typeof arg === 'object' && arg?.zoneId ? arg.zoneId : undefined;
        return zoneId
          ? `/api/bff/admin/orders?zoneId=${encodeURIComponent(zoneId)}`
          : '/api/bff/admin/orders';
      },
      transformResponse: (response: any) => {
        const raw = Array.isArray(response)
          ? response
          : Array.isArray(response?.data?.items)
          ? response.data.items
          : Array.isArray(response?.data?.content)
          ? response.data.content
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.content)
          ? response.content
          : [];
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

          const rawPay = String(item.paymentMethod || '').toUpperCase();
          const isCod = rawPay.includes('COD') || (rawPay.includes('CASH') && !rawPay.includes('CASHFREE'));
          const paymentMethod = isCod ? 'Cash on Delivery' : 'Online Payment';

          let paymentStatus = item.paymentStatus;
          if (!paymentStatus) {
            if (isCod) {
              if (status === 'DELIVERED') {
                paymentStatus = 'Completed';
              } else if (status === 'CANCELED') {
                paymentStatus = 'Cancelled';
              } else {
                paymentStatus = 'Processing';
              }
            } else {
              if (status === 'CANCELED') {
                paymentStatus = 'Refunded';
              } else {
                paymentStatus = 'Completed';
              }
            }
          }

          const summary =
            item.itemsSummary && item.itemsSummary !== 'Multi-dish order'
              ? item.itemsSummary
              : (item.storeName ? `${item.storeName} Dishes` : 'Order Items');

          return {
            id: String(item.id || item.orderId || ''),
            orderCode: item.orderCode || item.orderNumber || '',
            customerName: item.customerName || 'Customer',
            customerPhone: item.customerPhone || '',
            storeName: item.storeName || item.restaurantName || 'Restaurant',
            module: item.module || 'General Dining',
            itemsSummary: summary,
            totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : Number(item.totalAmount) || 0,
            paymentMethod,
            paymentStatus,
            status: status as OrderItemRecord['status'],
            createdAt: item.createdAt || '',
            zoneId: item.zoneId || item.zone?.id || item.assignedZoneId || undefined,
          };
        });
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Order' as const, id: 'LIST' },
              { type: 'Admin' as const, id: 'ORDER' },
            ]
          : [
              { type: 'Order' as const, id: 'LIST' },
              { type: 'Admin' as const, id: 'ORDER' },
            ],
    }),
    getOrder: builder.query<AdminOrder, string>({
      query: (orderId) => `/api/bff/orders/${orderId}`,
      providesTags: (_result, _error, id) => [
        { type: 'Order', id },
        { type: 'Admin', id: 'ORDER' },
      ],
      keepUnusedDataFor: 60,
    }),
    overrideOrderStatus: builder.mutation<
      AdminOrder,
      { orderId: string; body: OverrideOrderStatusBody }
    >({
      query: ({ orderId, body }) => ({
        url: `/api/bff/admin/orders/${orderId}/override-status`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
        { type: 'Admin', id: 'ORDER' },
      ],
    }),
  }),
});

export const {
  useGetAdminOrdersQuery,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useOverrideOrderStatusMutation,
} = ordersApi;

