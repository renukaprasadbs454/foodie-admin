import { baseApi } from '../baseApi';

export interface ZoneSettingsDto {
  zoneId: string;
  zoneName?: string;
  cityName?: string;
  // Tax / GST
  gstinNumber: string;
  foodGstRate: string;
  deliveryGstRate: string;
  tcsTaxRate: string;
  // Payment Settings
  cashfreeEnabled: boolean;
  stripeEnabled: boolean;
  codEnabled: boolean;
  codMaxLimit: string;
  // App Settings & Operational Parameters
  minAppVersion: string;
  maxDeliveryRadius: string;
  forceUpdateEnabled: boolean;
  maintenanceMode: boolean;
  // Zone Powers
  customerOrderingEnabled?: boolean;
  restaurantEnabled?: boolean;
  deliveryPartnerEnabled?: boolean;
  // Delivery Charges
  baseDeliveryCharge?: string;
  baseDistanceKm?: string;
  additionalChargePerKm?: string;
  freeDeliveryMinOrder?: string;
  nightSurcharge?: string;
  surgeMultiplier?: string;
  // Policy & Contact
  zoneDeliveryPolicyNotice?: string;
  zoneSupportContactPhone?: string;
  zoneSupportContactEmail?: string;
  // Metadata
  updatedAt?: string;
  updatedBy?: string;
  isCustomOverride?: boolean;
}

export const settingsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getZoneSettings: builder.query<ZoneSettingsDto, { zoneId?: string } | void>({
      query: (arg) => {
        const zoneId = typeof arg === 'object' && arg?.zoneId ? arg.zoneId : undefined;
        return zoneId ? `/api/bff/admin/settings?zoneId=${encodeURIComponent(zoneId)}` : '/api/bff/admin/settings';
      },
      transformResponse: (response: any) => {
        if (response?.data) return response.data;
        return response;
      },
      providesTags: ['Admin', 'LocationZone'],
    }),
    getAllZoneSettings: builder.query<Record<string, ZoneSettingsDto>, void>({
      query: () => '/api/bff/admin/settings?all=true',
      transformResponse: (response: any) => {
        if (response?.data) return response.data;
        return response;
      },
      providesTags: ['Admin', 'LocationZone'],
    }),
    updateZoneSettings: builder.mutation<ZoneSettingsDto, Partial<ZoneSettingsDto> & { zoneId: string }>({
      query: ({ zoneId, ...body }) => ({
        url: `/api/bff/admin/settings?zoneId=${encodeURIComponent(zoneId)}`,
        method: 'PUT',
        body: { zoneId, ...body },
      }),
      invalidatesTags: ['Admin', 'LocationZone', 'RadiusSettings', 'DeliveryCharges'],
    }),
    resetZoneSettings: builder.mutation<{ success: boolean; zoneId: string }, { zoneId: string }>({
      query: ({ zoneId }) => ({
        url: `/api/bff/admin/settings?zoneId=${encodeURIComponent(zoneId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Admin', 'LocationZone', 'RadiusSettings', 'DeliveryCharges'],
    }),
  }),
});

export const {
  useGetZoneSettingsQuery,
  useGetAllZoneSettingsQuery,
  useUpdateZoneSettingsMutation,
  useResetZoneSettingsMutation,
} = settingsApi;
