import { baseApi } from '../baseApi';
import type {
  AdminOrder,
  OverrideOrderStatusBody,
} from '../../features/orders/types';

/**
 * Orders RTK — P2-ADM-04 (GET by id + admin override-status).
 * No admin order list GET (GAP-API-16).
 */
export const ordersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminOrders: builder.query<
      any[],
      { status?: string; page?: number; size?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/api/bff/admin/orders',
        params: {
          ...(params?.status && params.status !== 'ALL' ? { status: params.status } : {}),
          ...(params?.search ? { search: params.search } : {}),
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      }),
      transformResponse: (res: any) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.items)) return res.items;
        if (res && Array.isArray(res.data)) return res.data;
        if (res && Array.isArray(res.content)) return res.content;
        return [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((item: any) => ({ type: 'Order' as const, id: item.id || item.orderId })),
              { type: 'Admin', id: 'ORDER_LIST' },
            ]
          : [{ type: 'Admin', id: 'ORDER_LIST' }],
      keepUnusedDataFor: 60,
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
        { type: 'Admin', id: 'ORDER' },
        { type: 'Admin', id: 'ORDER_LIST' },
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
