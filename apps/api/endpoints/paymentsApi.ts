import { baseApi } from '../baseApi';
import type {
  CommissionConfig,
  LedgerEntryRecord,
  PaymentSettlementRecord,
  PaymentSplitBreakdown,
  PaymentTransactionRecord,
  PayoutRecord,
  RefundInitiation,
  RefundPaymentBody,
  RestaurantSettlementRecord,
} from '../../features/payments/types';

/**
 * Payments RTK — Commission Settlement, Real Transactions, Ledger & Disbursals.
 * Calls BFF proxy `/api/bff/admin/payments/...` which forwards to Java Spring Boot.
 */
export const paymentsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getSettlements: builder.query<PaymentSettlementRecord[], void>({
      query: () => '/api/bff/admin/payments/settlements',
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res) || [],
      providesTags: [{ type: 'Payment', id: 'SETTLEMENTS' }],
    }),

    getTransactions: builder.query<PaymentTransactionRecord[], void>({
      query: () => '/api/bff/admin/payments/transactions',
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res) || [],
      providesTags: [{ type: 'Payment', id: 'TRANSACTIONS' }],
    }),

    getLedger: builder.query<LedgerEntryRecord[], void>({
      query: () => '/api/bff/admin/payments/ledger',
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res) || [],
      providesTags: [{ type: 'Payment', id: 'LEDGER' }],
    }),

    getRestaurantSettlements: builder.query<
      RestaurantSettlementRecord[],
      { restaurantId?: string; status?: string } | void
    >({
      query: (params) => ({
        url: '/api/bff/admin/payments/restaurant-settlements',
        params: params || {},
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res) || [],
      providesTags: [{ type: 'Payment', id: 'RESTAURANT_SETTLEMENTS' }],
    }),

    disburseRestaurantSettlement: builder.mutation<
      RestaurantSettlementRecord,
      { settlementId: string; paymentReference: string }
    >({
      query: (body) => ({
        url: '/api/bff/admin/payments/restaurant-settlements/disburse',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      invalidatesTags: [
        { type: 'Payment', id: 'RESTAURANT_SETTLEMENTS' },
        { type: 'Payment', id: 'LEDGER' },
      ],
    }),

    getAdminPayouts: builder.query<PayoutRecord[], { ownerType?: string } | void>({
      query: (params) => {
        let url = '/api/bff/admin/payments/payouts';
        if (params && params.ownerType) url += `?ownerType=${params.ownerType}`;
        return url;
      },
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res) || [],
      providesTags: [{ type: 'Payment', id: 'PAYOUTS' }],
    }),

    approvePayouts: builder.mutation<string, { payoutIds: string[] }>({
      query: (body) => ({
        url: '/api/bff/admin/payments/payouts/approve',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => (typeof res === 'object' && res !== null && 'data' in res ? res.data : res),
      invalidatesTags: [{ type: 'Payment', id: 'PAYOUTS' }],
    }),

    retryPayout: builder.mutation<any, { payoutId: string }>({
      query: ({ payoutId }) => ({
        url: `/api/bff/admin/payments/payouts/${payoutId}/retry`,
        method: 'POST',
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      invalidatesTags: [{ type: 'Payment', id: 'PAYOUTS' }],
    }),

    reconcilePayouts: builder.mutation<any, void>({
      query: () => ({
        url: '/api/bff/admin/payments/payouts/reconcile',
        method: 'POST',
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      invalidatesTags: [{ type: 'Payment', id: 'PAYOUTS' }, { type: 'Payment', id: 'SETTLEMENTS' }],
    }),

    getCommissionRules: builder.query<CommissionConfig, void>({
      query: () => '/api/bff/admin/payments/commission-rules',
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      providesTags: [{ type: 'Payment', id: 'RULES' }],
    }),

    updateCommissionRules: builder.mutation<CommissionConfig, CommissionConfig>({
      query: (config) => ({
        url: '/api/bff/admin/payments/commission-rules',
        method: 'POST',
        body: config,
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      invalidatesTags: [{ type: 'Payment', id: 'RULES' }],
    }),

    calculateSplit: builder.mutation<
      PaymentSplitBreakdown,
      { foodSubtotal: number; deliveryFee: number }
    >({
      query: ({ foodSubtotal, deliveryFee }) => ({
        url: `/api/bff/admin/payments/calculate-split?foodSubtotal=${foodSubtotal}&deliveryFee=${deliveryFee}`,
        method: 'POST',
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
    }),

    refundPayment: builder.mutation<
      RefundInitiation,
      { paymentId: string; body: RefundPaymentBody }
    >({
      query: ({ paymentId, body }) => ({
        url: `/api/bff/payments/${paymentId}/refund`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => (res && 'data' in res ? res.data : res),
      invalidatesTags: [
        { type: 'Payment', id: 'SETTLEMENTS' },
        { type: 'Payment', id: 'TRANSACTIONS' },
        { type: 'Payment', id: 'LEDGER' },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetSettlementsQuery,
  useGetTransactionsQuery,
  useGetLedgerQuery,
  useGetRestaurantSettlementsQuery,
  useDisburseRestaurantSettlementMutation,
  useGetAdminPayoutsQuery,
  useGetCommissionRulesQuery,
  useUpdateCommissionRulesMutation,
  useCalculateSplitMutation,
  useRefundPaymentMutation,
  useApprovePayoutsMutation,
  useRetryPayoutMutation,
  useReconcilePayoutsMutation,
} = paymentsApi;
