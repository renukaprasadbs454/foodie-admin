import { baseApi } from '../baseApi';
import type { AuditLogsResponse } from '../../features/audit-log/types';

/**
 * Audit Logs RTK Query endpoints — P2-ADM-06.
 * Access restricted to SUPER_ADMIN.
 */
export const auditLogsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      AuditLogsResponse,
      {
        resourceType?: string;
        action?: string;
        resourceId?: string;
        adminUserId?: string;
        createdAtFrom?: string;
        createdAtTo?: string;
        page?: number;
        size?: number;
        sort?: string;
      }
    >({
      query: (params) => ({
        url: '/api/bff/admin/audit-logs',
        params,
      }),
      providesTags: (result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.content)
            ? result.content
            : Array.isArray((result as any)?.items)
              ? (result as any).items
              : [];
        return [
          ...list.filter((item: any) => Boolean(item && item.id)).map(({ id }: any) => ({ type: 'Admin' as const, id })),
          { type: 'Admin' as const, id: 'AUDIT_LIST' },
        ];
      },
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogsApi;
