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
        const raw = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

        const defaultBangalore: OperatingZone = {
          id: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
          cityName: 'Bangalore',
          latitude: 12.9716,
          longitude: 77.5946,
          radiusKm: 25.0,
          status: 'ACTIVE',
          restaurantEnabled: true,
          deliveryPartnerEnabled: true,
          customerOrderingEnabled: true,
          activeDrivers: 45,
        };

        const defaultTumkur: OperatingZone = {
          id: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          cityName: 'Tumkur',
          latitude: 13.3379,
          longitude: 77.1173,
          radiusKm: 20.0,
          status: 'ACTIVE',
          restaurantEnabled: true,
          deliveryPartnerEnabled: true,
          customerOrderingEnabled: true,
          activeDrivers: 22,
        };

        const bgl = raw.find((z: any) => {
          const name = String(z.zoneName || '').trim().toLowerCase();
          const id = String(z.id || '').trim().toLowerCase();
          return (id === 'dz-bangalore' || name === 'bangalore zone') && name !== 'bengaluru zone';
        });

        const tmk = raw.find((z: any) => {
          const name = String(z.zoneName || '').trim().toLowerCase();
          const id = String(z.id || '').trim().toLowerCase();
          return (id === 'dz-tumkur' || name === 'tumkur zone') && name !== 'tumkur zone 1';
        });

        return [
          bgl ? { ...bgl, id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore' } : defaultBangalore,
          tmk ? { ...tmk, id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur' } : defaultTumkur,
        ];
      },
      providesTags: ['LocationZone'],
    }),
    selectOperatingZone: builder.mutation<ZoneSelectionResponse, { zoneId: string }>({
      query: (body) => ({
        url: '/api/bff/admin/zones/select',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LocationZone', 'Restaurant', 'Delivery', 'Order', 'Admin', 'Analytics'],
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
