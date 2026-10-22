import { baseApi } from '../baseApi';

export interface ChatMessage {
  id: string;
  enquiryId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
  zoneId?: string;
}

export interface EnquiryRecord {
  id: string;
  category: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL';
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  replyMessage?: string;
  messages?: ChatMessage[];
  resolvedAt?: string;
  orderId?: string;
  zoneId?: string;
  zoneName?: string;
  restaurantId?: string;
  restaurantName?: string;
  unreadCount?: number;
}

// Backwards compatibility aliases
export type SupportConversation = EnquiryRecord;
export type SupportMessage = ChatMessage;

export const adminSupportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllTickets: builder.query<EnquiryRecord[], { zoneId?: string } | void>({
      query: (arg) => ({
        url: '/api/bff/admin/support-tickets',
        params: arg && arg.zoneId ? { zoneId: arg.zoneId } : undefined,
      }),
      transformResponse: (response: any) => {
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      },
      providesTags: ['SupportConversation'],
    }),
    getTicketMessages: builder.query<ChatMessage[], string>({
      query: (id) => ({ url: `/api/bff/admin/support-tickets/${id}/messages` }),
      transformResponse: (response: any) => {
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      },
      providesTags: (_result, _error, id) => [{ type: 'SupportMessage', id }],
    }),
    replyToTicket: builder.mutation<ChatMessage, { ticketId: string; message: string; senderName?: string; zoneId?: string }>({
      query: ({ ticketId, message, senderName, zoneId }) => ({
        url: `/api/bff/admin/support-tickets/${ticketId}/reply`,
        method: 'POST',
        body: { message, senderName: senderName || 'Admin Support', zoneId },
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'SupportMessage', id: ticketId },
        'SupportConversation',
      ],
    }),
    resolveTicket: builder.mutation<EnquiryRecord, string | { id: string; status?: string; zoneId?: string }>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const status = typeof arg === 'string' ? 'RESOLVED' : (arg.status || 'RESOLVED');
        return {
          url: `/api/bff/admin/support-tickets/${id}/status`,
          method: 'PATCH',
          body: { status },
        };
      },
      invalidatesTags: (_result, _error, arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        return [
          { type: 'SupportMessage', id },
          'SupportConversation',
        ];
      },
    }),
    createTicket: builder.mutation<EnquiryRecord, {
      category: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL';
      senderName: string;
      senderEmail?: string;
      senderPhone?: string;
      subject: string;
      message: string;
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      orderId?: string;
      zoneId?: string;
    }>({
      query: (body) => ({
        url: `/api/bff/admin/support-tickets`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SupportConversation'],
    }),
  }),
});

export const {
  useGetAllTicketsQuery,
  useGetTicketMessagesQuery,
  useReplyToTicketMutation,
  useResolveTicketMutation,
  useCreateTicketMutation,
} = adminSupportApi;
