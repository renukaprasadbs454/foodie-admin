import { baseApi } from '../baseApi';

export interface LocationZoneDto {
    id: string;
    zoneName: string;
    cityName: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    polygonCoordinates: string;
    activeDrivers?: number;
    surgeMultiplier?: number;
    status: string;
    restaurantEnabled: boolean;
    deliveryPartnerEnabled: boolean;
    customerOrderingEnabled: boolean;
}

export interface CityDto {
    id: string;
    cityName: string;
    state: string;
    activeZonesCount: number;
    activeMerchantsCount: number;
    status: string;
}

export interface UnserviceableRequestDto {
    id: string;
    restaurantName: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    cityName: string;
    latitude: number;
    longitude: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export interface ServiceAreaDto {
    id: string;
    areaName: string;
    cityName: string;
    pincode: string;
    coverageStatus: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'UNAVAILABLE';
    totalOutlets: number;
}

export interface DeliveryChargesDto {
    baseCharge: number;
    baseDistanceKm: number;
    additionalChargePerKm: number;
    freeDeliveryMinOrder: number;
    nightSurcharge: number;
    surgeMultiplier: number;
}

export interface RadiusSettingsDto {
    maxDeliveryRadius: number;
    customerSearchRadius: number;
    driverDispatchRadius: number;
    distanceCalculationMode: 'GPS_ROAD' | 'HAVERSINE';
}

export const locationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getZones: builder.query<LocationZoneDto[], void>({
            query: () => `/api/bff/admin/location/zones`,
            providesTags: ['LocationZone'],
        }),
        createZone: builder.mutation<LocationZoneDto, Partial<LocationZoneDto>>({
            query: (body) => ({
                url: '/api/bff/admin/location/zones',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['LocationZone', 'City'],
        }),
        updateZoneToggles: builder.mutation<LocationZoneDto, { id: string, restaurantEnabled?: boolean, deliveryPartnerEnabled?: boolean, customerOrderingEnabled?: boolean }>({
            query: ({ id, ...body }) => {
                const queryParams = new URLSearchParams();
                if (body.restaurantEnabled !== undefined) queryParams.append('restaurantEnabled', String(body.restaurantEnabled));
                if (body.deliveryPartnerEnabled !== undefined) queryParams.append('deliveryPartnerEnabled', String(body.deliveryPartnerEnabled));
                if (body.customerOrderingEnabled !== undefined) queryParams.append('customerOrderingEnabled', String(body.customerOrderingEnabled));

                return {
                    url: `/api/bff/admin/location/zones/${id}/toggles?${queryParams.toString()}`,
                    method: 'PATCH',
                };
            },
            invalidatesTags: ['LocationZone', 'City'],
        }),
        getCities: builder.query<CityDto[], void>({
            query: () => `/api/bff/admin/location/cities`,
            providesTags: ['City'],
        }),
        createCity: builder.mutation<CityDto, Partial<CityDto>>({
            query: (body) => ({
                url: '/api/bff/admin/location/cities',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['City'],
        }),
        updateCityStatus: builder.mutation<CityDto, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/api/bff/admin/location/cities/${id}/status?status=${status}`,
                method: 'PATCH',
            }),
            invalidatesTags: ['City'],
        }),
        deleteCity: builder.mutation<void, string>({
            query: (id) => ({
                url: `/api/bff/admin/location/cities/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['City'],
        }),
        updateZoneStatus: builder.mutation<LocationZoneDto, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/api/bff/admin/location/zones/${id}/status?status=${status}`,
                method: 'PATCH',
            }),
            invalidatesTags: ['LocationZone', 'City'],
        }),
        deleteZone: builder.mutation<void, string>({
            query: (id) => ({
                url: `/api/bff/admin/location/zones/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['LocationZone', 'City'],
        }),
        getUnserviceableRequests: builder.query<UnserviceableRequestDto[], void>({
            query: () => `/api/bff/admin/location/unserviceable-requests`,
            providesTags: ['UnserviceableRequest'],
        }),
        createUnserviceableRequest: builder.mutation<UnserviceableRequestDto, Partial<UnserviceableRequestDto>>({
            query: (body) => ({
                url: '/api/bff/admin/location/unserviceable-requests',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['UnserviceableRequest'],
        }),
        updateUnserviceableRequestStatus: builder.mutation<UnserviceableRequestDto, { requestId: string; status: string }>({
            query: ({ requestId, status }) => ({
                url: `/api/bff/admin/location/unserviceable-requests/${requestId}/status?status=${status}`,
                method: 'PUT',
            }),
            invalidatesTags: ['UnserviceableRequest'],
        }),
        approveUnserviceableRequest: builder.mutation<LocationZoneDto, string>({
            query: (requestId) => ({
                url: `/api/bff/admin/location/unserviceable-requests/${requestId}/approve`,
                method: 'POST',
            }),
            invalidatesTags: ['UnserviceableRequest', 'LocationZone', 'City'],
        }),
        getServiceAreas: builder.query<ServiceAreaDto[], void>({
            query: () => `/api/bff/admin/location/service-areas`,
            providesTags: ['ServiceArea'],
        }),
        createServiceArea: builder.mutation<ServiceAreaDto, Partial<ServiceAreaDto>>({
            query: (body) => ({
                url: '/api/bff/admin/location/service-areas',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ServiceArea'],
        }),
        deleteServiceArea: builder.mutation<void, string>({
            query: (id) => ({
                url: `/api/bff/admin/location/service-areas/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ServiceArea'],
        }),
        getDeliveryCharges: builder.query<DeliveryChargesDto, void>({
            query: () => `/api/bff/admin/location/delivery-charges`,
            providesTags: ['DeliveryCharges'],
        }),
        updateDeliveryCharges: builder.mutation<DeliveryChargesDto, DeliveryChargesDto>({
            query: (body) => ({
                url: '/api/bff/admin/location/delivery-charges',
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['DeliveryCharges'],
        }),
        getRadiusSettings: builder.query<RadiusSettingsDto, void>({
            query: () => `/api/bff/admin/location/radius-settings`,
            providesTags: ['RadiusSettings'],
        }),
        updateRadiusSettings: builder.mutation<RadiusSettingsDto, RadiusSettingsDto>({
            query: (body) => ({
                url: '/api/bff/admin/location/radius-settings',
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['RadiusSettings'],
        }),
    }),
});

export const {
    useGetZonesQuery,
    useCreateZoneMutation,
    useUpdateZoneTogglesMutation,
    useGetCitiesQuery,
    useCreateCityMutation,
    useUpdateCityStatusMutation,
    useDeleteCityMutation,
    useUpdateZoneStatusMutation,
    useDeleteZoneMutation,
    useGetUnserviceableRequestsQuery,
    useCreateUnserviceableRequestMutation,
    useUpdateUnserviceableRequestStatusMutation,
    useApproveUnserviceableRequestMutation,
    useGetServiceAreasQuery,
    useCreateServiceAreaMutation,
    useDeleteServiceAreaMutation,
    useGetDeliveryChargesQuery,
    useUpdateDeliveryChargesMutation,
    useGetRadiusSettingsQuery,
    useUpdateRadiusSettingsMutation,
} = locationApi;
