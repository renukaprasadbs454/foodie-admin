import { baseApi } from '../baseApi';
import type { AdminUser, UserAccountStatus, UserLoginDevice } from '@/features/users/types/usersTypes';
import type { AdminRole } from 'foodie-shared-web';

export interface CreateAdminUserBody {
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  department?: string;
  password?: string;
  assignedZoneId?: string;
  assignedZoneName?: string;
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
    getAdminUserById: builder.query<AdminUser, string>({
      query: (userId) => `/api/bff/admin/users/${encodeURIComponent(userId)}`,
      transformResponse: (response: any) => {
        if (response?.data) return response.data;
        return response;
      },
      providesTags: (_result, _error, id) => ['Admin', { type: 'Admin', id }],
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
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    updateAdminUserZones: builder.mutation<AdminUser, { userId: string; assignedZoneIds: string[] }>({
      query: ({ userId, assignedZoneIds }) => ({
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}/zones`,
        method: 'PATCH',
        body: { assignedZoneIds },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    updateAdminUserStatus: builder.mutation<AdminUser, { userId: string; status: UserAccountStatus }>({
      query: ({ userId, status }) => ({
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    updateAdminUserPassword: builder.mutation<AdminUser, { userId: string; email?: string; password: string }>({
      query: ({ userId, email, password }) => ({
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}/password`,
        method: 'PATCH',
        body: { email, password },
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    deleteAdminUser: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Admin', { type: 'Admin', id: 'USERS_LIST' }],
    }),
    getUserLoginDevices: builder.query<UserLoginDevice[], string>({
      query: (userId) => `/api/bff/admin/users/${encodeURIComponent(userId)}/login-devices`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        return [];
      },
      providesTags: (_result, _error, id) => ['Admin', { type: 'Admin', id: `DEVICES_${id}` }],
    }),
    logoutAllUserDevices: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        url: `/api/bff/admin/users/${encodeURIComponent(userId)}/logout-all-devices`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        'Admin',
        { type: 'Admin', id: `DEVICES_${id}` },
        { type: 'Admin', id: 'USERS_LIST' },
      ],
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useGetAdminUserByIdQuery,
  useLazyGetAdminUserByIdQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserRoleMutation,
  useUpdateAdminUserZonesMutation,
  useUpdateAdminUserStatusMutation,
  useUpdateAdminUserPasswordMutation,
  useDeleteAdminUserMutation,
  useGetUserLoginDevicesQuery,
  useLazyGetUserLoginDevicesQuery,
  useLogoutAllUserDevicesMutation,
} = usersApi;
