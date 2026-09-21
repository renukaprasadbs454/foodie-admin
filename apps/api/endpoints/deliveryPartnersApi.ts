import { baseApi } from '../baseApi';
import type {
  AdminDeliveryPartnersResponse,
  DeliveryPartnerProfile,
} from '../../features/deliveryPartners/types';

export interface DeliveryPricingConfig {
  minPricePerDelivery: number;
  moneyPerKm: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpdateDeliveryPricingRequest {
  minPricePerDelivery: number;
  moneyPerKm: number;
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
      transformResponse: (res: any) => {
        if (!res) return { items: [], total: 0, page: 0, size: 50 };
        if (Array.isArray(res)) return { items: res, total: res.length, page: 0, size: res.length };
        if (Array.isArray(res.items)) return res;
        if (Array.isArray(res.content)) return { items: res.content, total: res.totalElements ?? res.content.length, page: res.number ?? 0, size: res.size ?? res.content.length };
        if (Array.isArray(res.data)) return { items: res.data, total: res.data.length, page: 0, size: res.data.length };
        return { items: [], total: 0, page: 0, size: 50 };
      },
      providesTags: (result) => {
        const items = result?.items || (Array.isArray(result) ? result : []);
        return [
          ...items.map((item: any) => ({ type: 'Delivery' as const, id: item.id })),
          { type: 'Admin', id: 'DELIVERY_LIST' },
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
