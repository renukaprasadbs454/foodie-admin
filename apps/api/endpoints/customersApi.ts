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

export const customersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCustomers: builder.query<CustomerDashboardResponse, { search?: string; status?: string } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.set('search', params.search);
        if (params?.status && params.status !== 'ALL') queryParams.set('status', params.status);
        const searchStr = queryParams.toString();
        return `/api/bff/admin/customers${searchStr ? `?${searchStr}` : ''}`;
      },
      transformResponse: (response: any): CustomerDashboardResponse => {
        let payload = response;
        if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== null && payload.data !== undefined) {
          payload = payload.data;
        }

        if (payload && typeof payload === 'object' && Array.isArray(payload.customers)) {
          const custList = payload.customers;
          return {
            summary: payload.summary ?? {
              totalRegistered: custList.length,
              activeAccounts: custList.filter((c: any) => c?.accountStatus === 'ACTIVE').length,
              suspendedAccounts: custList.filter((c: any) => c?.accountStatus === 'SUSPENDED').length,
              averageCustomerLtv: 0,
            },
            customers: custList,
            total: typeof payload.total === 'number' ? payload.total : custList.length,
            openTicketsCount: typeof payload.openTicketsCount === 'number' ? payload.openTicketsCount : 0,
          };
        }

        const list: CustomerProfile[] = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.content)
            ? payload.content
            : (Array.isArray(payload?.items)
              ? payload.items
              : []));

        return {
          summary: {
            totalRegistered: list.length,
            activeAccounts: list.filter((c: any) => c?.accountStatus === 'ACTIVE').length,
            suspendedAccounts: list.filter((c: any) => c?.accountStatus === 'SUSPENDED').length,
            averageCustomerLtv: 0,
          },
          customers: list,
          total: typeof payload?.total === 'number' ? payload.total : list.length,
          openTicketsCount: typeof payload?.openTicketsCount === 'number' ? payload.openTicketsCount : 0,
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
