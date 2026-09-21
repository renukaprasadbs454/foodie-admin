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
      transformResponse: (response: any): AuditLogsResponse => {
        if (!response) {
          return { content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true };
        }
        if (Array.isArray(response)) {
          return {
            content: response,
            pageNumber: 0,
            pageSize: response.length,
            totalElements: response.length,
            totalPages: 1,
            last: true,
          };
        }
        if (Array.isArray(response.content)) {
          return {
            content: response.content,
            pageNumber: response.pageNumber ?? response.number ?? 0,
            pageSize: response.pageSize ?? response.size ?? response.content.length,
            totalElements: response.totalElements ?? response.content.length,
            totalPages: response.totalPages ?? 1,
            last: response.last ?? true,
          };
        }
        if (Array.isArray(response.data)) {
          return {
            content: response.data,
            pageNumber: response.pageNumber ?? 0,
            pageSize: response.pageSize ?? response.data.length,
            totalElements: response.totalElements ?? response.data.length,
            totalPages: response.totalPages ?? 1,
            last: response.last ?? true,
          };
        }
        return { content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true };
      },
      providesTags: (result) => {
        const items = result?.content || (Array.isArray(result) ? result : []);
        return [
          ...items.map((item: any) => ({ type: 'Admin' as const, id: item.id })),
          { type: 'Admin', id: 'AUDIT_LIST' },
        ];
      },
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogsApi;
