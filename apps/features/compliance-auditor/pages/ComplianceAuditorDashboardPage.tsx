'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useGetAuditLogsQuery } from '@/api/endpoints/auditLogsApi';
import { useGetSupportTicketsQuery, useUpdateTicketStatusMutation } from '@/api/endpoints/customersApi';
import { useGetAdminReviewsQuery, useGetComplianceStatsQuery, useApproveReviewMutation } from '@/api/endpoints/reviewsApi';
import type {
  ComplianceRecord,
  ComplianceSeverity,
  ComplianceStatus,
} from '../types';

export function ComplianceAuditorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'REVIEWS' | 'COMPLAINTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ComplianceRecord | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  // Live client date & time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDateTime(`${dateStr} | ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data from backend endpoints
  const { data: statsData, refetch: refetchStats } = useGetComplianceStatsQuery();
  const { data: adminReviewsData, isLoading: isReviewsLoading, refetch: refetchReviews } = useGetAdminReviewsQuery();
  const { data: supportTicketsData, isLoading: isTicketsLoading, refetch: refetchTickets } = useGetSupportTicketsQuery();
  const { data: auditLogsData } = useGetAuditLogsQuery({ page: 0, size: 50 });

  const [approveReviewMutation] = useApproveReviewMutation();
  const [updateTicketStatusMutation] = useUpdateTicketStatusMutation();

  // Map real database records into ComplianceRecord format
  useEffect(() => {
    const liveRecords: ComplianceRecord[] = [];

    // 1. Map real support tickets / complaints from database
    if (Array.isArray(supportTicketsData)) {
      supportTicketsData.forEach((ticket: any) => {
        const id = ticket.id ? String(ticket.id) : (ticket.ticketNumber || `CP-${Math.random().toString(36).slice(2, 7)}`);
        const severity: ComplianceSeverity =
          ticket.priority === 'HIGH' || ticket.priority === 'URGENT'
            ? 'High'
            : ticket.priority === 'LOW'
            ? 'Low'
            : 'Medium';

        const status: ComplianceStatus =
          ticket.status === 'RESOLVED'
            ? 'Resolved'
            : ticket.status === 'CLOSED'
            ? 'Closed'
            : ticket.status === 'IN_PROGRESS'
            ? 'In Progress'
            : 'Open';

        const category = ticket.category
          ? ticket.category.replace(/_/g, ' ')
          : 'Service Issue';

        const dateStr = ticket.createdAt
          ? new Date(ticket.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

        const timeStr = ticket.createdAt
          ? new Date(ticket.createdAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : new Date().toLocaleString();

        liveRecords.push({
          id,
          type: 'COMPLAINT',
          storeName: ticket.restaurantName || ticket.storeName || 'Restaurant Order',
          storeUid: ticket.restaurantId ? `UID: ${String(ticket.restaurantId).slice(0, 8)}` : `UID: ${String(id).slice(0, 8)}`,
          module: category as any,
          user: ticket.customerName || ticket.userName || 'Customer',
          severity,
          status,
          date: dateStr,
          timestamp: timeStr,
          description: ticket.details || ticket.issueTitle || ticket.subject || 'Customer complaint logged in database.',
          orderId: ticket.orderId || 'ORD-N/A',
          auditorApproved: status === 'Resolved' || status === 'Closed',
        });
      });
    }

    // 2. Map real customer reviews directly from backend database review table
    if (Array.isArray(adminReviewsData)) {
      adminReviewsData.forEach((rev: any, idx: number) => {
        const revId = rev.id ? String(rev.id) : `RV-${idx + 1}`;
        const dateStr = rev.createdAt
          ? new Date(rev.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

        const timeStr = rev.createdAt
          ? new Date(rev.createdAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : new Date().toLocaleString();

        liveRecords.push({
          id: revId,
          type: 'REVIEW',
          storeName: rev.restaurantName || rev.storeName || 'Partner Store',
          storeUid: rev.restaurantId ? `UID: ${String(rev.restaurantId).slice(0, 8)}` : `UID: ${String(revId).slice(0, 8)}`,
          module: 'Food Quality',
          user: rev.customerName || rev.userName || 'Customer',
          rating: typeof rev.rating === 'number' ? rev.rating : 5,
          status: rev.status === 'FLAGGED' ? 'Open' : 'Resolved',
          date: dateStr,
          timestamp: timeStr,
          description: rev.comment || 'Customer submitted review.',
          orderId: rev.orderId || 'ORD-N/A',
          auditorApproved: rev.status !== 'FLAGGED',
        });
      });
    }

    setRecords(liveRecords);
  }, [supportTicketsData, adminReviewsData]);

  // Handle Approve button click
  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const record = records.find((r) => r.id === id);
    if (!record) return;

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Resolved' as ComplianceStatus,
              auditorApproved: true,
            }
          : r
      )
    );

    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord((prev) =>
        prev
          ? {
              ...prev,
              status: 'Resolved' as ComplianceStatus,
              auditorApproved: true,
            }
          : null
      );
    }

    setToastMessage(`Record ${String(id).slice(0, 8)} approved and resolved.`);
    setTimeout(() => setToastMessage(null), 3500);

    try {
      if (record.type === 'REVIEW') {
        await approveReviewMutation({ id }).unwrap();
        refetchReviews();
      } else {
        await updateTicketStatusMutation({ id, status: 'RESOLVED' }).unwrap();
        refetchTickets();
      }
      refetchStats();
    } catch {
      // Non-fatal, optimistic status preserved
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Tab filter
      if (activeTab === 'REVIEWS' && r.type !== 'REVIEW') return false;
      if (activeTab === 'COMPLAINTS' && r.type !== 'COMPLAINT') return false;

      // Module filter
      if (moduleFilter !== 'ALL' && r.module !== moduleFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesStore = r.storeName.toLowerCase().includes(query);
        const matchesUid = r.storeUid.toLowerCase().includes(query);
        const matchesUser = r.user.toLowerCase().includes(query);
        const matchesId = String(r.id).toLowerCase().includes(query);
        return matchesStore || matchesUid || matchesUser || matchesId;
      }

      return true;
    });
  }, [records, activeTab, moduleFilter, statusFilter, searchQuery]);

  const totalReviewsCount = useMemo(
    () => (statsData?.totalReviews !== undefined ? statsData.totalReviews : records.filter((r) => r.type === 'REVIEW').length),
    [statsData, records]
  );

  const totalComplaintsCount = useMemo(
    () => (statsData?.totalComplaints !== undefined ? statsData.totalComplaints : records.filter((r) => r.type === 'COMPLAINT').length),
    [statsData, records]
  );

  const totalAuditLogsCount = useMemo(() => {
    if (statsData?.auditLogs !== undefined) return statsData.auditLogs;
    if (Array.isArray(auditLogsData)) return auditLogsData.length;
    if (auditLogsData && typeof (auditLogsData as any).totalElements === 'number') return (auditLogsData as any).totalElements;
    return 0;
  }, [statsData, auditLogsData]);

  const resolvedIssuesCount = useMemo(
    () => (statsData?.resolvedIssues !== undefined ? statsData.resolvedIssues : records.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length),
    [statsData, records]
  );

  const renderRatingStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#2196F3' }}>{rating.toFixed(1)} / 5</span>
      </div>
    );
  };

  const renderSeverityBadge = (severity: ComplianceSeverity) => {
    const config = {
      High: { bg: '#FEE2E2', color: '#EF4444' },
      Medium: { bg: '#FEF3C7', color: '#B45309' },
      Low: { bg: '#F3F4F6', color: '#6B7280' },
    }[severity];

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 8px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: config.bg,
          color: config.color,
        }}
      >
        {severity}
      </span>
    );
  };

  const renderStatusBadge = (status: ComplianceStatus) => {
    const config = {
      Open: { bg: '#E3F2FD', color: '#2196F3' },
      'In Progress': { bg: '#FEF3C7', color: '#B45309' },
      Resolved: { bg: '#DCFCE7', color: '#15803D' },
      Closed: { bg: '#F3F4F6', color: '#6B7280' },
    }[status];

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: config.bg,
          color: config.color,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
            zIndex: 99999,
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 4px 0',
            }}
          >
            Compliance Dashboard
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Monitor reviews, complaints and ensure policy compliance across all stores and vendors.
          </p>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '6px 14px', borderRadius: 9999 }}>
          {currentDateTime}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Reviews Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reviews</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>
            {totalReviewsCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>in database</div>
        </div>

        {/* Total Complaints Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Complaints</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>
            {totalComplaintsCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>in database</div>
        </div>

        {/* Audit Logs Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Logs</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2196F3', marginTop: 4 }}>
            {totalAuditLogsCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>entries logged</div>
        </div>

        {/* Resolved Issues Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved Issues</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', marginTop: 4 }}>
            {resolvedIssuesCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>resolved in platform</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Controls Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            backgroundColor: '#F9FAFB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#111827',
                margin: 0,
              }}
            >
              Reviews & Complaints
            </h2>

            {/* Filter Pills */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                padding: 3,
                borderRadius: 9999,
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                style={{
                  padding: '5px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'ALL' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
                  color: activeTab === 'ALL' ? '#FFFFFF' : '#6B7280',
                  boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REVIEWS')}
                style={{
                  padding: '5px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'REVIEWS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
                  color: activeTab === 'REVIEWS' ? '#FFFFFF' : '#6B7280',
                  boxShadow: activeTab === 'REVIEWS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Reviews ({records.filter((r) => r.type === 'REVIEW').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLAINTS')}
                style={{
                  padding: '5px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'COMPLAINTS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
                  color: activeTab === 'COMPLAINTS' ? '#FFFFFF' : '#6B7280',
                  boxShadow: activeTab === 'COMPLAINTS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Complaints ({records.filter((r) => r.type === 'COMPLAINT').length})
              </button>
            </div>
          </div>

          {/* Search & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 260 }}>
              <input
                type="text"
                placeholder="Search by store, zone, UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filter Toggle */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  backgroundColor: showFilterDropdown ? '#E3F2FD' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: '#111827',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Filters
              </button>

              {showFilterDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #E5E7EB',
                    padding: 16,
                    width: 240,
                    zIndex: 100,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Filter by Status
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                      marginBottom: 12,
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setModuleFilter('ALL');
                      setStatusFilter('ALL');
                      setSearchQuery('');
                      setShowFilterDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ID
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Store Info
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Module
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  User
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rating / Severity
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isReviewsLoading || isTicketsLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                    Loading live records from database...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      No records found in database
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      Live reviews and complaints logged in the backend database will appear here in real-time.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      {/* ID / Type */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                            }}
                          >
                            {item.type}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                            {String(item.id).slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Store Info */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                          {item.storeName}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          {item.storeUid}
                        </div>
                      </td>

                      {/* Module */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#374151',
                            backgroundColor: '#F3F4F6',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {item.module}
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
                        {item.user}
                      </td>

                      {/* Rating / Severity */}
                      <td style={{ padding: '14px 20px' }}>
                        {item.type === 'REVIEW' && typeof item.rating === 'number'
                          ? renderRatingStars(item.rating)
                          : item.severity
                          ? renderSeverityBadge(item.severity)
                          : '-'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>{renderStatusBadge(item.status)}</td>

                      {/* Date */}
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#6B7280' }}>
                        {item.date}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            onClick={(e) => handleApprove(item.id, e)}
                            disabled={item.status === 'Resolved' || item.status === 'Closed'}
                            style={{
                              background:
                                item.status === 'Resolved' || item.status === 'Closed' ? '#F3F4F6' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                              color: item.status === 'Resolved' || item.status === 'Closed' ? '#9CA3AF' : '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor:
                                item.status === 'Resolved' || item.status === 'Closed' ? 'not-allowed' : 'pointer',
                              boxShadow: item.status === 'Resolved' || item.status === 'Closed' ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRecord(item)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#2196F3',
                              border: '1px solid #E5E7EB',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#2196F3',
                      backgroundColor: '#E3F2FD',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {selectedRecord.type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>
                    {String(selectedRecord.id).slice(0, 8)}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '8px 0 0 0' }}>
                  {selectedRecord.storeName}
                </h3>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0 0' }}>
                  {selectedRecord.storeUid}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#6B7280',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                backgroundColor: '#F9FAFB',
                padding: 16,
                borderRadius: 14,
                border: '1px solid #E5E7EB',
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User / Customer</div>
                <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>{selectedRecord.user}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module Category</div>
                <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>{selectedRecord.module}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</div>
                <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>{selectedRecord.timestamp}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Ref</div>
                <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>{selectedRecord.orderId}</div>
              </div>
            </div>

            {/* Description / Content */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Customer Submission & Notes:
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#374151',
                }}
              >
                {selectedRecord.description}
              </div>
            </div>

            {/* Severity / Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Compliance Status:</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: '#E3F2FD',
                    color: '#2196F3',
                  }}
                >
                  {selectedRecord.status}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRecord.id)}
                  style={{
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                  }}
                >
                  Approve & Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
