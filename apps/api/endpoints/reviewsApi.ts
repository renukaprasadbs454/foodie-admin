import { baseApi } from '../baseApi';

export interface AdminReviewRecord {
  id: string;
  orderId?: string;
  restaurantId?: string;
  restaurantName?: string;
  customerId?: string;
  customerName?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  restaurantRating?: number;
  rating?: number;
  deliveryRating?: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN' | 'VERIFIED' | 'RESOLVED';
  isReported?: boolean;
}

export interface ComplianceStatsResponse {
  totalReviews: number;
  totalComplaints: number;
  auditLogs: number;
  resolvedIssues: number;
}

export const reviewsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminReviews: builder.query<
      AdminReviewRecord[],
      {
        storeName?: string;
        minRating?: number;
        page?: number;
        size?: number;
      } | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.storeName) queryParams.set('storeName', params.storeName);
        if (params?.minRating) queryParams.set('minRating', String(params.minRating));
        if (params?.page !== undefined) queryParams.set('page', String(params.page));
        if (params?.size !== undefined) queryParams.set('size', String(params.size));
        const searchStr = queryParams.toString();
        return `/api/bff/admin/reviews${searchStr ? `?${searchStr}` : ''}`;
      },
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response && Array.isArray(response.data)) {
          return response.data;
        }
        if (response && Array.isArray(response.items)) {
          return response.items;
        }
        return [];
      },
      providesTags: (result) => [
        ...(Array.isArray(result)
          ? result.map(({ id }) => ({ type: 'Review' as const, id }))
          : []),
        { type: 'Review' as const, id: 'ADMIN_REVIEWS_LIST' },
      ],
      keepUnusedDataFor: 30,
    }),

    getComplianceStats: builder.query<ComplianceStatsResponse, void>({
      query: () => '/api/bff/admin/reviews/stats',
      transformResponse: (response: any) => {
        if (response && typeof response === 'object') {
          return {
            totalReviews: response.totalReviews ?? 0,
            totalComplaints: response.totalComplaints ?? 0,
            auditLogs: response.auditLogs ?? 0,
            resolvedIssues: response.resolvedIssues ?? 0,
          };
        }
        return { totalReviews: 0, totalComplaints: 0, auditLogs: 0, resolvedIssues: 0 };
      },
      providesTags: [{ type: 'Review' as const, id: 'COMPLIANCE_STATS' }],
      keepUnusedDataFor: 30,
    }),

    approveReview: builder.mutation<{ id: string; status: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/bff/admin/reviews/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Review', id: 'ADMIN_REVIEWS_LIST' },
        { type: 'Review', id: 'COMPLIANCE_STATS' },
      ],
    }),

    flagReview: builder.mutation<{ reviewId: string; status: string }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/bff/admin/reviews/${id}/flag`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [
        { type: 'Review', id: 'ADMIN_REVIEWS_LIST' },
        { type: 'Review', id: 'COMPLIANCE_STATS' },
      ],
    }),
  }),
});

export const {
  useGetAdminReviewsQuery,
  useGetComplianceStatsQuery,
  useApproveReviewMutation,
  useFlagReviewMutation,
} = reviewsApi;
