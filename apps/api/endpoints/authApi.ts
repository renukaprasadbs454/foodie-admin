import { baseApi } from '../baseApi';
import type { AdminRole } from 'foodie-shared-web';

export type AdminLoginRequest = {
  email: string;
  password: string;
  deviceInfo?: string;
  expectedZoneId?: string;
};

export type AdminRoleOption = {
  key: string;
  role: string;
  label: string;
  zoneId?: string | null;
  zoneName?: string | null;
  defaultEmail?: string | null;
};

export type AdminLoginIdentity = {
  userId: string;
  userType: 'ADMIN';
  role: AdminRole;
  fullName?: string;
  email?: string;
  assignedZoneId?: string | null;
  assignedZoneName?: string | null;
};

export type AdminUserProfile = {
  adminUserId: string;
  userCredentialId: string;
  fullName: string;
  role: AdminRole;
  profileImageKey?: string | null;
  restaurantId?: string | null;
  permissions?: string[];
  assignedZoneId?: string | null;
  assignedZoneName?: string | null;
};

export const authApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    login: builder.mutation<AdminLoginIdentity, AdminLoginRequest>({
      query: (body) => ({
        url: '/api/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<null, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    getAdminMe: builder.query<AdminUserProfile, void>({
      query: () => ({
        url: '/api/bff/admin/users/me',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      },
      providesTags: ['Auth'],
    }),
    getAdminRoles: builder.query<AdminRoleOption[], void>({
      query: () => ({
        url: '/api/auth/roles',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const raw = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
        return raw.filter((r: any) => {
          const l = (r.label || '').toLowerCase();
          const zn = (r.zoneName || '').toLowerCase();
          const k = (r.key || '').toLowerCase();
          return !l.includes('customer') && !zn.includes('customer') && !k.includes('customer');
        });
      },
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetAdminMeQuery,
  useGetAdminRolesQuery,
} = authApi;

