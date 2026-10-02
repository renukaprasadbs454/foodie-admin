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

export const locationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getZones: builder.query<LocationZoneDto[], void>({
            query: () => `/api/bff/admin/location/zones?_t=${Date.now()}`,
            transformResponse: (response: any) => response?.data || [],
            providesTags: ['LocationZone'],
        }),
        createZone: builder.mutation<LocationZoneDto, Partial<LocationZoneDto>>({
            query: (body) => ({
                url: '/api/bff/admin/location/zones',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['LocationZone'],
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
            invalidatesTags: ['LocationZone'],
        }),
        getCities: builder.query<CityDto[], void>({
            query: () => `/api/bff/admin/location/cities?_t=${Date.now()}`,
            transformResponse: (response: any) => response?.data || [],
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
    }),
});

export const {
    useGetZonesQuery,
    useCreateZoneMutation,
    useUpdateZoneTogglesMutation,
    useGetCitiesQuery,
    useCreateCityMutation,
} = locationApi;
