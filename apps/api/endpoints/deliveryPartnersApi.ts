import { baseApi } from '../baseApi';
import {
  isDeliveryPartnerKycEligible,
  type AdminDeliveryPartnersResponse,
  type DeliveryPartnerProfile,
} from '../../features/deliveryPartners/types';

export interface DeliveryPricingConfig {
  minPricePerDelivery: number;
  moneyPerKm: number;
  pricingBasis?: 'UNIVERSAL' | 'ZONE';
  universalConfig?: any;
  zoneConfigs?: Record<string, any>;
  zones?: any[];
  configData?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateDeliveryPricingRequest {
  minPricePerDelivery: number;
  moneyPerKm: number;
  pricingBasis?: string;
  universalConfig?: any;
  zoneConfigs?: Record<string, any>;
  zones?: any[];
  configData?: string;
}

export interface GetAdminDeliveryPartnersParams {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface RejectKycRequest {
  partnerId: string;
  reason?: string;
}

export const deliveryPartnersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDeliveryPartners: builder.query<AdminDeliveryPartnersResponse, GetAdminDeliveryPartnersParams | void>({
      query: (params) => ({
        url: '/api/bff/admin/delivery-partners',
        params: {
          status: params?.status && params.status !== 'ALL' ? params.status : undefined,
          search: params?.search ? params.search : undefined,
          page: params?.page ?? 0,
          size: params?.size ?? 50,
          sort: params?.sort ?? 'createdAt,desc',
        },
      }),
      transformResponse: (response: any): AdminDeliveryPartnersResponse => {
        const raw = response?.data || response;
        if (Array.isArray(raw)) {
          const eligible = raw.filter(isDeliveryPartnerKycEligible);
          return {
            items: eligible,
            pagination: { page: 0, size: eligible.length, totalElements: eligible.length, totalPages: 1 },
          };
        }
        const items = (raw?.items || []).filter(isDeliveryPartnerKycEligible);
        return {
          items,
          pagination: {
            page: raw?.pagination?.page ?? 0,
            size: raw?.pagination?.size ?? 50,
            totalElements: items.length,
            totalPages: Math.max(1, Math.ceil(items.length / (raw?.pagination?.size || 50))),
          },
        };
      },
      providesTags: (result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.items)
            ? result.items
            : Array.isArray((result as any)?.content)
              ? (result as any).content
              : [];
        return [
          ...list.filter((item: any) => Boolean(item && item.id)).map(({ id }: any) => ({ type: 'Delivery' as const, id })),
          { type: 'Admin' as const, id: 'DELIVERY_LIST' },
        ];
      },
    }),
    approveDeliveryPartnerKyc: builder.mutation<DeliveryPartnerProfile, string>({
      query: (partnerId) => ({
        url: `/api/bff/admin/delivery-partners/${partnerId}/kyc-approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Delivery', id },
        { type: 'Admin', id: 'DELIVERY_LIST' },
        { type: 'Admin', id: 'DELIVERY' },
      ],
    }),
    rejectDeliveryPartnerKyc: builder.mutation<DeliveryPartnerProfile, RejectKycRequest>({
      query: ({ partnerId, reason }) => ({
        url: `/api/bff/admin/delivery-partners/${partnerId}/kyc-reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { partnerId }) => [
        { type: 'Delivery', id: partnerId },
        { type: 'Admin', id: 'DELIVERY_LIST' },
        { type: 'Admin', id: 'DELIVERY' },
      ],
    }),
    getDeliveryPricing: builder.query<DeliveryPricingConfig, void>({
      query: () => '/api/bff/admin/delivery-pricing',
      providesTags: [{ type: 'Admin', id: 'DELIVERY_PRICING' }],
    }),
    updateDeliveryPricing: builder.mutation<DeliveryPricingConfig, UpdateDeliveryPricingRequest>({
      query: (body) => ({
        url: '/api/bff/admin/delivery-pricing',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Admin', id: 'DELIVERY_PRICING' }],
    }),
  }),
});

export const {
  useGetAdminDeliveryPartnersQuery,
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
  useGetDeliveryPricingQuery,
  useUpdateDeliveryPricingMutation,
} = deliveryPartnersApi;
