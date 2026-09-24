export type ComplianceItemType = 'REVIEW' | 'COMPLAINT';

export type ComplianceSeverity = 'High' | 'Medium' | 'Low';

export type ComplianceStatus = 'Resolved' | 'In Progress' | 'Open' | 'Closed';

export interface ComplianceRecord {
  id: string;
  type: ComplianceItemType;
  storeName: string;
  storeUid: string;
  module: 'Food Quality' | 'Service' | 'Ambience' | 'Hygiene' | 'Delivery' | 'Packaging' | 'Billing';
  user: string;
  rating?: number;
  severity?: ComplianceSeverity;
  status: ComplianceStatus;
  date: string;
  timestamp: string;
  description: string;
  zone?: string;
  orderId?: string;
  resolutionNotes?: string;
  auditorApproved?: boolean;
}

export interface ComplianceDashboardMetrics {
  totalReviews: number;
  reviewsTrend: string;
  totalComplaints: number;
  complaintsTrend: string;
  auditLogs: number;
  auditLogsTrend: string;
  resolvedIssues: number;
  resolvedTrend: string;
}
