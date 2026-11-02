import { baseApi } from '../baseApi';
import { ENV } from '@/constants/env';
import type {
  RestaurantDetail,
  RestaurantReview,
  SuspendRestaurantBody,
  FullMenuData,
  MenuCategoryData,
} from '../../features/restaurants/types';

function normalizeReviewList(data: unknown): RestaurantReview[] {
  if (Array.isArray(data)) return data as RestaurantReview[];
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { content?: unknown }).content)
  ) {
    return (data as { content: RestaurantReview[] }).content;
  }
  return [];
}

/**
 * Restaurant RTK — P2-ADM-03 (detail + reviews + approve/suspend).
 * No admin list GET (GAP-API-14).
 */
export const restaurantsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRestaurant: builder.query<RestaurantDetail, string>({
      query: (restaurantId) => `/api/bff/restaurants/${restaurantId}`,
      transformResponse: (response: any) => {
        const item: RestaurantDetail = (response && typeof response === 'object' && 'data' in response) ? response.data : response;
        if (!item) return item;

        const baseUrl = ENV.apiBaseUrl.replace(/\/$/, '');
        const resolveUrl = (url?: string | null) => {
          if (!url) return '';
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          if (url.startsWith('/api')) return `${baseUrl}${url}`;
          return `${baseUrl}/${url.replace(/^\/+/, '')}`;
        };

        if (item.logoImageUrl && !item.logoImageUrl.startsWith('http')) {
          item.logoImageUrl = resolveUrl(item.logoImageUrl);
        }
        if (item.coverImageUrl && !item.coverImageUrl.startsWith('http')) {
          item.coverImageUrl = resolveUrl(item.coverImageUrl);
        }

        if (Array.isArray(item.documents)) {
          item.documents = item.documents.map((doc: any) => {
            const rawUrl = doc.documentUrl || doc.fileUrl || doc.url || '';
            const resolved = resolveUrl(rawUrl);
            return {
              ...doc,
              documentUrl: resolved || rawUrl,
              fileUrl: resolved || doc.fileUrl || rawUrl,
              downloadUrl: doc.downloadUrl ? resolveUrl(doc.downloadUrl) : (resolved || rawUrl),
            };
          });
        }

        return item;
      },
      providesTags: (_result, _error, id) => [
        { type: 'Restaurant', id },
        { type: 'Admin', id: 'RESTAURANT' },
      ],
      keepUnusedDataFor: 60,
    }),
    getAdminRestaurants: builder.query<{ items: RestaurantDetail[]; pagination: any }, { status?: string; page?: number; size?: number; sort?: string; zoneId?: string } | void>({
      query: (arg) => {
        const status = typeof arg === 'object' && arg?.status ? arg.status : undefined;
        const page = typeof arg === 'object' && arg?.page !== undefined ? arg.page : 0;
        const size = typeof arg === 'object' && arg?.size !== undefined ? arg.size : 20;
        const sort = typeof arg === 'object' && arg?.sort ? arg.sort : undefined;
        const zoneId = typeof arg === 'object' && arg?.zoneId ? arg.zoneId : undefined;
        return {
          url: `/api/bff/admin/restaurants`,
          params: {
            ...(status ? { status } : {}),
            page,
            size,
            ...(sort ? { sort } : {}),
            ...(zoneId ? { zoneId } : {}),
          },
        };
      },
      transformResponse: (response: any) => {
        const payload = (response && typeof response === 'object' && 'data' in response) ? response.data : response;
        const rawList = payload?.items || payload?.content || (Array.isArray(payload) ? payload : (response?.items || response?.content || (Array.isArray(response) ? response : [])));
        const items: RestaurantDetail[] = Array.isArray(rawList) ? rawList : [];

        // Ensure documents use absolute backend URL in local development
        const baseUrl = ENV.apiBaseUrl.replace(/\/$/, '');
        items.forEach((item: any) => {
          if (item && item.documents && Array.isArray(item.documents)) {
            item.documents.forEach((doc: any) => {
              if (doc.documentUrl && doc.documentUrl.startsWith('/api')) {
                doc.documentUrl = `${baseUrl}${doc.documentUrl}`;
              }
            });
          }
        });

        return {
          items,
          pagination: payload?.pagination || payload?.pageable || response?.pagination || response?.pageable || null,
        };
      },
      providesTags: ['Admin', 'Restaurant', { type: 'Admin', id: 'LIST' }],
    }),
    getRestaurantReviews: builder.query<
      RestaurantReview[],
      { restaurantId: string; page?: number; size?: number; sort?: string }
    >({
      query: ({ restaurantId, page = 0, size = 20, sort }) => ({
        url: `/api/bff/restaurants/${restaurantId}/reviews`,
        params: {
          page,
          size,
          ...(sort ? { sort } : {}),
        },
      }),
      transformResponse: (response: unknown) => normalizeReviewList(response),
      providesTags: (_result, _error, arg) => [
        { type: 'Review', id: arg.restaurantId },
      ],
      keepUnusedDataFor: 60,
    }),
    approveRestaurant: builder.mutation<RestaurantDetail, string>({
      query: (restaurantId) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Restaurant', id },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    suspendRestaurant: builder.mutation<
      RestaurantDetail,
      { restaurantId: string; body: SuspendRestaurantBody }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/suspend`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Restaurant', id: arg.restaurantId },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    deleteRestaurant: builder.mutation<void, string>({
      query: (restaurantId) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Restaurant', id },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    updateAdminRestaurantPositions: builder.mutation<void, { restaurantId: string; position: number }[]>({
      query: (positions) => ({
        url: `/api/bff/admin/restaurants/positions`,
        method: 'PATCH',
        body: positions,
      }),
      invalidatesTags: ['Admin', 'Restaurant', { type: 'Admin', id: 'LIST' }],
    }),
    createAdminRestaurant: builder.mutation<RestaurantDetail, {
      name: string;
      module?: string;
      cuisineCategory?: string;
      cuisineTypes?: string[];
      zone?: string;
      ownerName: string;
      phone: string;
      commissionRate?: number;
    }>({
      query: (body) => ({
        url: `/api/bff/admin/restaurants`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin', 'Restaurant', { type: 'Admin', id: 'LIST' }],
    }),
    getRestaurantMenu: builder.query<FullMenuData, string>({
      query: (restaurantId) => `/api/bff/menu/restaurants/${restaurantId}`,
      transformResponse: (response: any, _meta, restaurantId) => {
        const rawData = (response && typeof response === "object" && "data" in response) ? response.data : response;
        const baseUrl = ENV.apiBaseUrl.replace(/\/$/, "");
        const resolveUrl = (url?: string | null) => {
          if (!url) return null;
          if (url.startsWith("http://") || url.startsWith("https://")) return url;
          if (url.startsWith("/api")) return `${baseUrl}${url}`;
          return `${baseUrl}/${url.replace(/^\/+/, "")}`;
        };

        if (!rawData) {
          return { restaurantId: restaurantId || "", categories: [] };
        }

        let categoriesList: any[] = [];
        if (Array.isArray(rawData)) {
          categoriesList = rawData;
        } else if (Array.isArray(rawData.categories)) {
          categoriesList = rawData.categories;
        }

        const normalizedCategories: MenuCategoryData[] = categoriesList.map((cat: any, index: number) => {
          const itemsList = Array.isArray(cat.items) ? cat.items : [];
          const categoryName = cat.name || "General";
          const categoryId = cat.categoryId || cat.id || `cat-${index}`;

          return {
            categoryId,
            name: categoryName,
            displayOrder: typeof cat.displayOrder === "number" ? cat.displayOrder : index,
            items: itemsList.map((item: any) => ({
              menuItemId: item.menuItemId || item.id || crypto.randomUUID(),
              id: item.menuItemId || item.id,
              price: typeof item.basePrice === 'number' ? item.basePrice : Number(item.basePrice || 0),
              categoryId,
              categoryName,
              name: item.name || "Unnamed Item",
              description: item.description || "",
              basePrice: typeof item.basePrice === "number" ? item.basePrice : Number(item.basePrice || 0),
              isVeg: Boolean(item.isVeg ?? (item.foodType === "VEG")),
              foodType: item.foodType || (item.isVeg ? "VEG" : "NON_VEG"),
              isAvailable: item.isAvailable !== false && item.available !== false,
              imageUrl: item.imageUrl ? resolveUrl(item.imageUrl) : null,
              packageSize: item.packageSize || null,
              preparationTime: item.preparationTime || null,
              gstPct: item.gstPct != null ? Number(item.gstPct) : null,
              variants: Array.isArray(item.variants) ? item.variants : [],
              avgRating: item.avgRating != null ? Number(item.avgRating) : null,
              reviewCount: item.reviewCount != null ? Number(item.reviewCount) : null,
            })),
          };
        });

        return {
          restaurantId: rawData.restaurantId || restaurantId || "",
          categories: normalizedCategories,
          avgRating: rawData.avgRating != null ? Number(rawData.avgRating) : null,
        };
      },
      providesTags: (_result, _error, id) => [{ type: "Restaurant", id: `MENU_${id}` }],
      keepUnusedDataFor: 60,
    }),
    verifyRestaurantDocument: builder.mutation<
      RestaurantDetail,
      { restaurantId: string; documentId: string }
    >({
      query: ({ restaurantId, documentId }) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/documents/${documentId}/verify`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Restaurant', id: arg.restaurantId },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    rejectRestaurantDocument: builder.mutation<
      RestaurantDetail,
      { restaurantId: string; documentId: string; reason?: string }
    >({
      query: ({ restaurantId, documentId, reason }) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/documents/${documentId}/reject`,
        method: 'PATCH',
        body: { reason: reason || 'Document rejected by admin' },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Restaurant', id: arg.restaurantId },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    resetRestaurantDocument: builder.mutation<
      RestaurantDetail,
      { restaurantId: string; documentId: string }
    >({
      query: ({ restaurantId, documentId }) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/documents/${documentId}/reset`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Restaurant', id: arg.restaurantId },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
    updateRestaurantCommission: builder.mutation<
      RestaurantDetail,
      { restaurantId: string; commissionPct: number; notes?: string }
    >({
      query: ({ restaurantId, commissionPct, notes }) => ({
        url: `/api/bff/admin/restaurants/${restaurantId}/commission`,
        method: 'PATCH',
        body: { commissionPct, notes },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Restaurant', id: arg.restaurantId },
        { type: 'Admin', id: 'RESTAURANT' },
        { type: 'Admin', id: 'LIST' },
        'Admin',
      ],
    }),
  }),
});

export const {
  useGetRestaurantQuery,
  useGetAdminRestaurantsQuery,
  useGetRestaurantReviewsQuery,
  useGetRestaurantMenuQuery,
  useApproveRestaurantMutation,
  useSuspendRestaurantMutation,
  useDeleteRestaurantMutation,
  useUpdateAdminRestaurantPositionsMutation,
  useCreateAdminRestaurantMutation,
  useVerifyRestaurantDocumentMutation,
  useRejectRestaurantDocumentMutation,
  useResetRestaurantDocumentMutation,
  useUpdateRestaurantCommissionMutation,
} = restaurantsApi;


