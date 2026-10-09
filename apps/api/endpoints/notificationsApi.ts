import { baseApi } from '../baseApi';

export interface BroadcastNotificationPayload {
  title: string;
  body: string;
  targetAudience: 'ALL' | 'CUSTOMERS' | 'RESTAURANTS' | 'DELIVERY_PARTNERS' | 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY_PARTNER';
  actionUrl?: string;
  scheduledAt?: string | null;
}

export interface BroadcastNotificationResponse {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  actionUrl?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipientsCount: number;
  deliveryStatus: string;
}

export interface AdminNotificationHistoryRecord {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentTime: string;
  recipientsCount: number;
  deliveryRate: string;
  openRate: string;
  status: 'DELIVERED' | 'SCHEDULED' | 'FAILED' | 'SENT';
  actionUrl?: string;
}

export const notificationsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    sendBroadcastNotification: builder.mutation<BroadcastNotificationResponse, BroadcastNotificationPayload>({
      query: (body) => ({
        url: '/api/bff/admin/notifications/broadcast',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Admin', id: 'NOTIFICATIONS' }],
    }),
    getAdminNotificationHistory: builder.query<AdminNotificationHistoryRecord[], { audience?: string }>({
      query: ({ audience }) => ({
        url: '/api/bff/admin/notifications',
        params: audience ? { audience } : {},
      }),
      transformResponse: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ? res.data : res?.items ? res.items : [];
        return list.map((item: any) => ({
          id: item.id || item.notificationLogId || `notif-${Math.random()}`,
          title: item.title,
          body: item.body,
          audience: item.targetAudience || item.audience || 'ALL',
          sentTime: item.sentAt ? new Date(item.sentAt).toLocaleString() : (item.scheduledAt ? `Scheduled for ${new Date(item.scheduledAt).toLocaleString()}` : 'Just now'),
          recipientsCount: item.recipientsCount || 0,
          deliveryRate: item.deliveryStatus === 'SENT' || item.deliveryStatus === 'DELIVERED' ? '100%' : '0%',
          openRate: '0%',
          status: (item.deliveryStatus || (item.scheduledAt ? 'SCHEDULED' : 'SENT')) as any,
          actionUrl: item.actionUrl,
        }));
      },
      providesTags: [{ type: 'Admin', id: 'NOTIFICATIONS' }],
    }),
  }),
});

export const {
  useSendBroadcastNotificationMutation,
  useGetAdminNotificationHistoryQuery,
} = notificationsApi;
