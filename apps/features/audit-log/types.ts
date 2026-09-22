export interface AuditLogRecord {
  id: string;
  adminUserId: string;
  adminUserName?: string;
  adminUserRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  content: AuditLogRecord[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

