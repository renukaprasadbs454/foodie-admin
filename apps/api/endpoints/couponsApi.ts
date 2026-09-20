import { baseApi } from '../baseApi';
import type {
  Coupon,
  CreateCouponBody,
  DeactivateCouponResult,
} from '../../features/coupons/types';

export interface PromotionBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaType?: string;
  ctaTarget?: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'DRAFT' | 'ARCHIVED';
  displayOrder: number;
}

export interface CreatePromotionBannerBody {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaType?: string;
  ctaTarget?: string;
  status?: string;
  displayOrder: number;
}

/**
 * Coupons RTK — P2-ADM-05 create + deactivate only.
 * No admin coupon list GET (GAP-API-19).
 */
export const couponsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCoupons: builder.query<Coupon[], void>({
      query: () => '/api/bff/admin/coupons',
      providesTags: [{ type: 'Coupon', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),
    createCoupon: builder.mutation<Coupon, CreateCouponBody>({
      query: (body) => ({
        url: '/api/bff/admin/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    deactivateCoupon: builder.mutation<DeactivateCouponResult, string>({
      query: (couponId) => ({
        url: `/api/bff/admin/coupons/${couponId}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Coupon', id },
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    activateCoupon: builder.mutation<DeactivateCouponResult, string>({
      query: (couponId) => ({
        url: `/api/bff/admin/coupons/${couponId}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Coupon', id },
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    deleteCoupon: builder.mutation<boolean, string>({
      query: (couponId) => ({
        url: `/api/bff/admin/coupons/${couponId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    approveCoupon: builder.mutation<Coupon, string>({
      query: (couponId) => ({
        url: `/api/bff/admin/coupons/${couponId}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Coupon', id },
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    rejectCoupon: builder.mutation<Coupon, string>({
      query: (couponId) => ({
        url: `/api/bff/admin/coupons/${couponId}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Coupon', id },
        { type: 'Coupon', id: 'LIST' },
        { type: 'Admin', id: 'COUPON' },
      ],
    }),
    getBanners: builder.query<PromotionBanner[], void>({
      query: () => '/api/bff/admin/banners',
      providesTags: ['Banners'],
    }),
    createBanner: builder.mutation<PromotionBanner, CreatePromotionBannerBody>({
      query: (body) => ({
        url: '/api/bff/admin/banners',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
    updateBanner: builder.mutation<PromotionBanner, { id: string; body: CreatePromotionBannerBody }>({
      query: ({ id, body }) => ({
        url: `/api/bff/admin/banners/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
    activateBanner: builder.mutation<PromotionBanner, string>({
      query: (id) => ({
        url: `/api/bff/admin/banners/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Banners'],
    }),
    deactivateBanner: builder.mutation<PromotionBanner, string>({
      query: (id) => ({
        url: `/api/bff/admin/banners/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Banners'],
    }),
    deleteBanner: builder.mutation<boolean, string>({
      query: (id) => ({
        url: `/api/bff/admin/banners/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Banners'],
    }),
  }),
});

export const {
  useCreateCouponMutation, useDeactivateCouponMutation, useGetCouponsQuery,
  useDeleteCouponMutation, useActivateCouponMutation, useApproveCouponMutation,
  useRejectCouponMutation,
  useGetBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useActivateBannerMutation,
  useDeactivateBannerMutation,
  useDeleteBannerMutation
} = couponsApi;
