import { baseApi } from '../baseApi';

export interface OperatingZone {
  id: string;
  zoneName: string;
  cityName: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  status: string;
  restaurantEnabled: boolean;
  deliveryPartnerEnabled: boolean;
  customerOrderingEnabled: boolean;
  activeDrivers?: number;
}

export interface ZoneSelectionResponse {
  sessionRecordId: string;
  zoneId: string;
  zoneName: string;
  cityName: string;
  adminName: string;
  adminEmail: string;
  role: string;
  loginTime: string;
  sessionStatus: string;
}

export interface AdminZoneLoginHistoryItem {
  id: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  role: string;
  zoneId: string;
  zoneName: string;
  loginTime: string;
  sessionStatus: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ZoneHistoryResponse {
  items: AdminZoneLoginHistoryItem[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export const zoneApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAvailableZones: builder.query<OperatingZone[], void>({
      query: () => '/api/bff/admin/zones/available',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: ['LocationZone'],
    }),
    selectOperatingZone: builder.mutation<ZoneSelectionResponse, { zoneId: string }>({
      query: (body) => ({
        url: '/api/bff/admin/zones/select',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LocationZone', 'Restaurant', 'Delivery', 'Order', 'Admin'],
    }),
    getZoneLoginHistory: builder.query<
      ZoneHistoryResponse,
      { zoneId?: string; search?: string; page?: number; size?: number } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.zoneId && params.zoneId !== 'ALL') query.set('zoneId', params.zoneId);
        if (params?.search) query.set('search', params.search);
        if (params?.page != null) query.set('page', String(params.page));
        if (params?.size != null) query.set('size', String(params.size));
        const qs = query.toString();
        return `/api/bff/admin/zones/history${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: any) => {
        const rawItems = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.content)
          ? response.content
          : [];
        const pagination = response?.meta?.pagination ||
          response?.pagination || {
            page: 0,
            size: 20,
            totalElements: rawItems.length,
            totalPages: Math.max(1, Math.ceil(rawItems.length / 20)),
          };
        return {
          items: rawItems,
          pagination,
        };
      },
      providesTags: ['LocationZone', 'Admin'],
    }),
  }),
});

export const {
  useGetAvailableZonesQuery,
  useSelectOperatingZoneMutation,
  useGetZoneLoginHistoryQuery,
} = zoneApi;
