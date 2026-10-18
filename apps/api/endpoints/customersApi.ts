import { baseApi } from '../baseApi';
import type { CustomerProfile, SupportTicket, TicketStatus } from '../../features/customers/types/customerTypes';

export interface CustomerSummary {
  totalRegistered: number;
  activeAccounts: number;
  suspendedAccounts: number;
  averageCustomerLtv: number;
}

export interface CustomerDashboardResponse {
  summary: CustomerSummary;
  customers: CustomerProfile[];
  total: number;
  openTicketsCount: number;
}

export interface UpdateCustomerStatusRequest {
  id: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  reason?: string;
}

export interface UpdateTicketStatusRequest {
  id: string;
  status: TicketStatus;
  agentNotes?: string;
}

export interface GetCustomersParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
  fetchAllPages?: boolean;
  zoneId?: string;
}

export const customersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCustomers: builder.query<CustomerDashboardResponse, GetCustomersParams | void>({
      queryFn: async (arg, _queryApi, _extraOptions, fetchWithBQ) => {
        const params = arg || {};
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.set('search', params.search);
        if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
        if (typeof params.page === 'number') queryParams.set('page', String(params.page));
        if (typeof params.size === 'number') queryParams.set('size', String(params.size));
        if (params.zoneId) queryParams.set('zoneId', params.zoneId);

        const baseQueryStr = queryParams.toString();
        const initialUrl = `/api/bff/admin/customers${baseQueryStr ? `?${baseQueryStr}` : ''}`;
        const initialRes = await fetchWithBQ(initialUrl);

        if (initialRes.error) {
          return { error: initialRes.error };
        }

        const extractFromResponse = (response: any) => {
          let payload = response;
          if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== null && payload.data !== undefined) {
            payload = payload.data;
          }

          let customers: CustomerProfile[] = [];
          if (payload && typeof payload === 'object' && Array.isArray(payload.customers)) {
            customers = payload.customers;
          } else if (Array.isArray(payload)) {
            customers = payload;
          } else if (Array.isArray(payload?.content)) {
            customers = payload.content;
          } else if (Array.isArray(payload?.items)) {
            customers = payload.items;
          }

          const total = typeof payload?.total === 'number'
            ? payload.total
            : typeof response?.meta?.pagination?.totalItems === 'number'
            ? response.meta.pagination.totalItems
            : typeof payload?.totalElements === 'number'
            ? payload.totalElements
            : customers.length;

          const totalPages = typeof payload?.totalPages === 'number'
            ? payload.totalPages
            : typeof response?.meta?.pagination?.totalPages === 'number'
            ? response.meta.pagination.totalPages
            : 1;

          const openTicketsCount = typeof payload?.openTicketsCount === 'number'
            ? payload.openTicketsCount
            : 0;

          return { customers, total, totalPages, openTicketsCount, summary: payload?.summary };
        };

        const page0 = extractFromResponse(initialRes.data);
        const accumulatedCustomers = [...page0.customers];

        // Retrieve subsequent pages if the backend API reports multiple pages
        if (page0.totalPages > 1 && (params.page === undefined || params.fetchAllPages !== false)) {
          const pageSize = params.size || 50;
          for (let p = 1; p < page0.totalPages; p++) {
            const nextParams = new URLSearchParams(queryParams);
            nextParams.set('page', String(p));
            nextParams.set('size', String(pageSize));
            const nextRes = await fetchWithBQ(`/api/bff/admin/customers?${nextParams.toString()}`);
            if (!nextRes.error && nextRes.data) {
              const nextData = extractFromResponse(nextRes.data);
              accumulatedCustomers.push(...nextData.customers);
            }
          }
        }

        // Deduplicate customer records by stable identifier
        const seenIds = new Set<string>();
        const dedupedCustomers: CustomerProfile[] = [];
        for (const cust of accumulatedCustomers) {
          if (!cust) continue;
          const stableId = cust.id || cust.email || cust.phone;
          if (stableId && seenIds.has(stableId)) continue;
          if (stableId) seenIds.add(stableId);
          dedupedCustomers.push(cust);
        }

        const activeCount = dedupedCustomers.filter((c) => c.accountStatus === 'ACTIVE').length;
        const suspendedCount = dedupedCustomers.filter((c) => c.accountStatus === 'SUSPENDED').length;

        return {
          data: {
            summary: page0.summary ?? {
              totalRegistered: dedupedCustomers.length,
              activeAccounts: activeCount,
              suspendedAccounts: suspendedCount,
              averageCustomerLtv: 0,
            },
            customers: dedupedCustomers,
            total: Math.max(page0.total, dedupedCustomers.length),
            openTicketsCount: page0.openTicketsCount,
          },
        };
      },
      providesTags: [{ type: 'Admin', id: 'CUSTOMERS' }],
      keepUnusedDataFor: 300,
    }),
    updateCustomerStatus: builder.mutation<CustomerProfile, UpdateCustomerStatusRequest>({
      query: ({ id, accountStatus, reason }) => ({
        url: `/api/bff/admin/customers/${id}/status`,
        method: 'PATCH',
        body: { accountStatus, reason },
      }),
      transformResponse: (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res),
      invalidatesTags: [{ type: 'Admin', id: 'CUSTOMERS' }],
    }),
    getSupportTickets: builder.query<SupportTicket[], void>({
      query: () => '/api/bff/admin/support-tickets',
      transformResponse: (response: any): SupportTicket[] => {
        let payload = response;
        if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== null && payload.data !== undefined) {
          payload = payload.data;
        }
        if (Array.isArray(payload)) {
          return payload;
        }
        if (Array.isArray(payload?.content)) {
          return payload.content;
        }
        if (Array.isArray(payload?.items)) {
          return payload.items;
        }
        return [];
      },
      providesTags: [{ type: 'Admin', id: 'SUPPORT_TICKETS' }],
      keepUnusedDataFor: 180,
    }),
    updateTicketStatus: builder.mutation<SupportTicket, UpdateTicketStatusRequest>({
      query: ({ id, status, agentNotes }) => ({
        url: `/api/bff/admin/support-tickets/${id}/status`,
        method: 'PATCH',
        body: { status, agentNotes },
      }),
      invalidatesTags: [
        { type: 'Admin', id: 'SUPPORT_TICKETS' },
        { type: 'Admin', id: 'CUSTOMERS' },
      ],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useUpdateCustomerStatusMutation,
  useGetSupportTicketsQuery,
  useUpdateTicketStatusMutation,
} = customersApi;
