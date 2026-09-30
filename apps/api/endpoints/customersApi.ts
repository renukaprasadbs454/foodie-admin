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
      transformResponse: (response: any) => {
        if (response?.customers && Array.isArray(response.customers)) {
          return response;
        }
        const list = Array.isArray(response) ? response : (response?.content || response?.items || []);
        return {
          summary: response?.summary || {
            totalRegistered: list.length,
            activeAccounts: list.filter((c: any) => c?.accountStatus === 'ACTIVE').length,
            suspendedAccounts: list.filter((c: any) => c?.accountStatus === 'SUSPENDED').length,
            averageCustomerLtv: 0,
          },
          customers: list,
          total: response?.total ?? list.length,
          openTicketsCount: response?.openTicketsCount ?? 0,
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
      invalidatesTags: [{ type: 'Admin', id: 'CUSTOMERS' }],
    }),
    getSupportTickets: builder.query<SupportTicket[], void>({
      query: () => '/api/bff/admin/support-tickets',
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
