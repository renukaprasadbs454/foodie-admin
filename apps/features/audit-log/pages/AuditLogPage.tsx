'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Text, trackAnalyticsEvent, useTheme, EmptyState } from 'foodie-shared-web';
import { useAppSelector } from '@/store/hooks';
import { selectAdminRole } from '@/features/auth/authSlice';
import { useGetAuditLogsQuery } from '@/api/endpoints/auditLogsApi';
import { canAccessAuditLog } from '@/lib/routeGuards';
import type { AuditLogRecord } from '../types';
import { AuditLogDetailModal } from '../components/AuditLogDetailModal';

export function AuditLogPage() {
  const { tokens } = useTheme();
  const role = useAppSelector(selectAdminRole);
  const isAuthorized = canAccessAuditLog(role);

  // Filters State
  const [resourceType, setResourceType] = useState<string>('ALL');
  const [action, setAction] = useState<string>('ALL');
  const [resourceId, setResourceId] = useState<string>('');
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(10);

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Analytics view track
  useEffect(() => {
    trackAnalyticsEvent('admin_audit_logs_viewed');
  }, []);

  // RTK Query API fetch - Live Database Records
  const {
    data: apiData,
    isLoading,
    isError,
    refetch,
  } = useGetAuditLogsQuery(
    {
      resourceType: resourceType === 'ALL' ? undefined : resourceType,
      action: action === 'ALL' ? undefined : action,
      resourceId: resourceId.trim() || undefined,
      adminUserId: adminUserId.trim() || undefined,
      createdAtFrom: dateFrom || undefined,
      createdAtTo: dateTo || undefined,
      page,
      size: pageSize,
      sort: sortOrder === 'NEWEST' ? 'createdAt,desc' : 'createdAt,asc',
    },
    {
      skip: !isAuthorized,
    }
  );

  // Extract real records from backend response
  const logsList: AuditLogRecord[] = useMemo(() => {
    if (apiData && Array.isArray((apiData as any).content)) {
      return (apiData as any).content;
    }
    if (Array.isArray(apiData)) {
      return apiData as AuditLogRecord[];
    }
    return [];
  }, [apiData]);

  const totalElements: number = useMemo(() => {
    if (apiData && typeof (apiData as any).totalElements === 'number') {
      return (apiData as any).totalElements;
    }
    return logsList.length;
  }, [apiData, logsList]);

  const totalPages: number = useMemo(() => {
    if (apiData && typeof (apiData as any).totalPages === 'number') {
      return (apiData as any).totalPages;
    }
    return totalElements > 0 ? Math.ceil(totalElements / pageSize) : 0;
  }, [apiData, totalElements, pageSize]);

  const isLastPage: boolean = useMemo(() => {
    if (apiData && typeof (apiData as any).last === 'boolean') {
      return (apiData as any).last;
    }
    return page >= Math.max(0, totalPages - 1);
  }, [apiData, page, totalPages]);

  const handleClearFilters = () => {
    setResourceType('ALL');
    setAction('ALL');
    setResourceId('');
    setAdminUserId('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('NEWEST');
    setPage(0);
  };

  const getActionBadgeStyle = (act: string) => {
    switch (act) {
      case 'APPROVE':
      case 'KYC_APPROVE':
      case 'CREATE':
        return { color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' };
      case 'SUSPEND':
      case 'DEACTIVATE':
      case 'REFUND':
        return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
      case 'OVERRIDE_STATUS':
        return { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' };
      default:
        return { color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' };
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <EmptyState
          title="Permission Denied"
          description="You do not have administrative clearance to access the platform audit logs. AUDITOR, FINANCE_ADMIN, or SUPER_ADMIN privileges required."
          aria-label="unauthorized access error"
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text as="h1" variant="heading1" color="#0369A1" style={{ margin: 0 }}>
              System Audit Logs
            </Text>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0369A1',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                padding: '4px 10px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  backgroundColor: '#0284C7',
                  borderRadius: '50%',
                }}
              />
              Live Database ({totalElements} {totalElements === 1 ? 'entry' : 'entries'})
            </span>
          </div>
          <Text as="p" variant="caption" color="#0284C7" style={{ margin: '4px 0 0' }}>
            Monitor and track administrative changes, vendor approvals, payment refunds, and fleet status updates recorded in the backend.
          </Text>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isLoading ? 'Fetching...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Filter Panel */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #BAE6FD',
          padding: 20,
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Admin User ID Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Operator (UUID or Name)</label>
            <input
              type="text"
              value={adminUserId}
              onChange={(e) => {
                setAdminUserId(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name or UUID..."
              style={{
                padding: '10px 12px',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                color: '#0369A1',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Resource ID Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Target Resource ID (UUID)</label>
            <input
              type="text"
              value={resourceId}
              onChange={(e) => {
                setResourceId(e.target.value);
                setPage(0);
              }}
              placeholder="Enter exact resource UUID..."
              style={{
                padding: '10px 12px',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                color: '#0369A1',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Resource Type Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Resource Type</label>
            <select
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(0);
              }}
              style={{
                padding: '10px 12px',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                color: '#0369A1',
                outline: 'none',
              }}
            >
              <option value="ALL">All Types</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="DELIVERY_PARTNER">Delivery Partner</option>
              <option value="ORDER">Order</option>
              <option value="PAYMENT">Payment</option>
              <option value="COUPON">Coupon</option>
            </select>
          </div>

          {/* Action Type Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Action Type</label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              style={{
                padding: '10px 12px',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                color: '#0369A1',
                outline: 'none',
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="APPROVE">APPROVE</option>
              <option value="KYC_APPROVE">KYC_APPROVE</option>
              <option value="SUSPEND">SUSPEND</option>
              <option value="DEACTIVATE">DEACTIVATE</option>
              <option value="REFUND">REFUND</option>
              <option value="OVERRIDE_STATUS">OVERRIDE_STATUS</option>
              <option value="CREATE">CREATE</option>
            </select>
          </div>
        </div>

        {/* Date Ranges and Sorting */}
        <div
          style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingTop: 12,
            borderTop: '1px dashed #BAE6FD',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {/* Created From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Created From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #BAE6FD',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#0369A1',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>

            {/* Created To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Created To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #BAE6FD',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#0369A1',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Sorting</label>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'NEWEST' | 'OLDEST');
                  setPage(0);
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #BAE6FD',
                  borderRadius: 8,
                  fontSize: 13,
                  backgroundColor: '#FFFFFF',
                  color: '#0369A1',
                  outline: 'none',
                }}
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            style={{
              padding: '9px 16px',
              backgroundColor: '#F0F9FF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table Area */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #BAE6FD',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#0284C7' }}>
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14 }}>Loading system audit logs from database...</div>
          </div>
        ) : logsList.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <EmptyState
              title="No Audit Logs Found in Database"
              description="No audit logs were found matching your current filter parameters. Administrative actions and status overrides will automatically be logged here."
              aria-label="empty audit logs search results"
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F0F9FF', color: '#0369A1', borderBottom: '1px solid #BAE6FD', fontSize: 13 }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Action</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Resource Type</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Resource ID</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Performed By</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Timestamp</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logsList.map((log) => {
                  const badge = getActionBadgeStyle(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #E0F2FE',
                        fontSize: 13,
                        transition: 'background-color 0.15s',
                        color: '#0369A1',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      {/* Action Badge */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: badge.color,
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Resource Type */}
                      <td style={{ padding: '14px 20px', fontWeight: 600 }}>{log.resourceType}</td>

                      {/* Target UUID */}
                      <td style={{ padding: '14px 20px' }}>
                        <code style={{ fontSize: 12, color: '#0369A1', fontFamily: 'monospace' }}>
                          {log.resourceId}
                        </code>
                      </td>

                      {/* Operator User */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0369A1' }}>
                          {log.adminUserName || log.adminUserId || 'System Operator'}
                        </div>
                        {log.adminUserRole && (
                          <div style={{ fontSize: 11, color: '#0284C7' }}>Role: {log.adminUserRole}</div>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 20px', color: '#0284C7' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </td>

                      {/* Details Trigger */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)';
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#0284C7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F0F9FF';
                            e.currentTarget.style.color = '#0369A1';
                            e.currentTarget.style.borderColor = '#BAE6FD';
                          }}
                        >
                          State Diff
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F0F9FF',
            }}
          >
            <span style={{ fontSize: 13, color: '#0284C7' }}>
              Showing Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> ({totalElements} records in database)
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '6px 14px',
                  backgroundColor: page === 0 ? '#F0F9FF' : '#FFFFFF',
                  color: page === 0 ? '#94A3B8' : '#0369A1',
                  border: `1px solid ${page === 0 ? '#E0F2FE' : '#BAE6FD'}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: page === 0 ? 'default' : 'pointer',
                  boxShadow: page === 0 ? 'none' : '0 1px 3px rgba(2, 132, 199, 0.1)',
                }}
              >
                ◀ Previous
              </button>
              <button
                type="button"
                disabled={isLastPage}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: isLastPage ? '#F0F9FF' : '#FFFFFF',
                  color: isLastPage ? '#94A3B8' : '#0369A1',
                  border: `1px solid ${isLastPage ? '#E0F2FE' : '#BAE6FD'}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isLastPage ? 'default' : 'pointer',
                  boxShadow: isLastPage ? 'none' : '0 1px 3px rgba(2, 132, 199, 0.1)',
                }}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
