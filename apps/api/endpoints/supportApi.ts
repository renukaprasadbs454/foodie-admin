import { baseApi } from '../baseApi';

export interface SupportConversation {
    id: string;
    customerId: string;
    assignedAgentId?: string;
    status: 'AI_ACTIVE' | 'WAITING_FOR_AGENT' | 'ASSIGNED' | 'AGENT_ACTIVE' | 'RESOLVED' | 'CLOSED';
    category: string;
    subject: string;
    orderId?: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt?: string;
    resolvedAt?: string;
    closedAt?: string;
    messages?: SupportMessage[];
}

export interface SupportMessage {
    id: string;
    conversationId: string;
    senderType: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
    senderId?: string;
    senderName: string;
    messageType: 'TEXT' | 'SYSTEM' | 'AI_RESPONSE' | 'AGENT_RESPONSE' | 'ATTACHMENT' | 'ORDER_CONTEXT';
    content: string;
    createdAt: string;
    readAt?: string;
}

export const adminSupportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllTickets: builder.query<SupportConversation[], void>({
            query: () => ({ url: '/api/v1/admin/support-tickets' }),
            providesTags: ['SupportConversation'],
        }),
        getTicketMessages: builder.query<SupportMessage[], string>({
            query: (id) => ({ url: `/api/v1/admin/support-tickets/${id}/messages` }),
            providesTags: (result, error, id) => [{ type: 'SupportMessage', id }],
        }),
        replyToTicket: builder.mutation<SupportMessage, { ticketId: string; message: string; senderName?: string }>({
            query: ({ ticketId, ...body }) => ({
                url: `/api/v1/admin/support-tickets/${ticketId}/reply`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { ticketId }) => [
                { type: 'SupportMessage', id: ticketId },
                'SupportConversation'
            ],
        }),
        resolveTicket: builder.mutation<SupportConversation, string>({
            query: (id) => ({
                url: `/api/v1/admin/support-tickets/${id}/status`,
                method: 'PATCH',
                body: { status: 'RESOLVED' }
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
} = adminSupportApi;
