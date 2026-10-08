import { baseApi } from '../baseApi';
import type { AdminUser, UserAccountStatus } from '@/features/users/types/usersTypes';
import type { AdminRole } from 'foodie-shared-web';

export interface CreateAdminUserBody {
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  department?: string;
}

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminUsers: builder.query<AdminUser[], void>({
      query: () => '/api/bff/admin/users',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.items)) return response.items;
        return [];
      },
      providesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    createAdminUser: builder.mutation<AdminUser, CreateAdminUserBody>({
      query: (body) => ({
        url: '/api/bff/admin/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    updateAdminUserRole: builder.mutation<AdminUser, { userId: string; role: AdminRole }>({
      query: ({ userId, role }) => ({
        url: `/api/bff/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    updateAdminUserStatus: builder.mutation<AdminUser, { userId: string; status: UserAccountStatus }>({
      query: ({ userId, status }) => ({
        url: `/api/bff/admin/users/${userId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserRoleMutation,
  useUpdateAdminUserStatusMutation,
} = usersApi;
