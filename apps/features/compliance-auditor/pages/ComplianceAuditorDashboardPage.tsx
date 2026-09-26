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
  const { data: auditLogsData, isLoading: isAuditLogsLoading } = useGetAuditLogsQuery({ page: 0, size: 50 });

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

        const ratingVal = typeof rev.restaurantRating === 'number'
          ? rev.restaurantRating
          : typeof rev.rating === 'number'
          ? rev.rating
          : 5;

        const isResolved = rev.status === 'VERIFIED' || rev.status === 'RESOLVED';

        liveRecords.push({
          id: revId,
          type: 'REVIEW',
          storeName: rev.restaurantName || 'Restaurant',
          storeUid: rev.restaurantId ? `UID: ${String(rev.restaurantId).slice(0, 8)}` : `UID: ${revId.slice(0, 8)}`,
          module: 'Food Quality',
          user: rev.customerName || 'Customer',
          rating: ratingVal,
          status: isResolved ? 'Resolved' : 'Open',
          date: dateStr,
          timestamp: timeStr,
          description: rev.comment || 'Customer submitted review on food & delivery quality.',
          orderId: rev.orderId || 'ORD-N/A',
          auditorApproved: isResolved,
        });
      });
    }

    setRecords(liveRecords);
  }, [supportTicketsData, adminReviewsData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          return {
            ...rec,
            status: 'Resolved' as ComplianceStatus,
            auditorApproved: true,
          };
        }
        return rec;
      })
    );

    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord((prev) => (prev ? { ...prev, status: 'Resolved', auditorApproved: true } : null));
    }

    try {
      const targetRecord = records.find((r) => r.id === id);
      if (targetRecord?.type === 'REVIEW') {
        await approveReviewMutation({ id }).unwrap();
      } else {
        await updateTicketStatusMutation({ id, status: 'RESOLVED', agentNotes: 'Verified and approved by Compliance Auditor' }).unwrap();
      }
      refetchStats();
      refetchReviews();
      refetchTickets();
      showToast(`Record #${id.slice(0, 8)} has been verified and approved by Compliance Auditor.`);
    } catch {
      showToast(`Record #${id.slice(0, 8)} marked as verified locally.`);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Tab filter
      if (activeTab === 'REVIEWS' && rec.type !== 'REVIEW') return false;
      if (activeTab === 'COMPLAINTS' && rec.type !== 'COMPLAINT') return false;

      // Module filter
      if (moduleFilter !== 'ALL' && rec.module !== moduleFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rec.storeName?.toLowerCase().includes(query);
        const matchesUid = rec.storeUid?.toLowerCase().includes(query);
        const matchesUser = rec.user?.toLowerCase().includes(query);
        const matchesId = rec.id?.toLowerCase().includes(query);
        const matchesModule = rec.module?.toLowerCase().includes(query);
        const matchesZone = rec.zone?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesUid || matchesUser || matchesId || matchesModule || matchesZone;
      }

      return true;
    });
  }, [records, activeTab, moduleFilter, statusFilter, searchQuery]);

  // Live counts from database
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
        <span style={{ color: '#0284C7', fontSize: 14 }}>★</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#0369A1' }}>{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderSeverityBadge = (severity: ComplianceSeverity) => {
    const config = {
      High: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
      Medium: { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' },
      Low: { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
    }[severity];

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        {severity}
      </span>
    );
  };

  const renderStatusBadge = (status: ComplianceStatus) => {
    const config = {
      Open: { bg: '#F0F9FF', color: '#0284C7', dot: '#0284C7', border: '#BAE6FD' },
      'In Progress': { bg: '#F0F9FF', color: '#0369A1', dot: '#0369A1', border: '#BAE6FD' },
      Resolved: { bg: '#F0FDF4', color: '#166534', dot: '#22C55E', border: '#BBF7D0' },
      Closed: { bg: '#F0F9FF', color: '#0284C7', dot: '#0EA5E9', border: '#BAE6FD' },
    }[status];

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: config.dot,
          }}
        />
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '0px 0px 40px 0px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(2, 132, 199, 0.3)',
            zIndex: 99999,
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.2s ease',
            border: '1px solid #BAE6FD',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#0369A1',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Compliance Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#0284C7', margin: 0 }}>
            Monitor reviews, complaints and ensure policy compliance across all stores and vendors.
          </p>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: 20 }}>
          {currentDateTime}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Total Reviews Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284C7',
              fontSize: 20,
            }}
          >
            💬
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>Total Reviews</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>
              {totalReviewsCount}
            </div>
            <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>in database</div>
          </div>
        </div>

        {/* Total Complaints Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0369A1',
              fontSize: 20,
            }}
          >
            ⚠️
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>Total Complaints</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>
              {totalComplaintsCount}
            </div>
            <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>in database</div>
          </div>
        </div>

        {/* Audit Logs Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284C7',
              fontSize: 20,
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>Audit Logs</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>
              {totalAuditLogsCount}
            </div>
            <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>entries logged</div>
          </div>
        </div>

        {/* Resolved Issues Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0369A1',
              fontSize: 20,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>Resolved Issues</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>
              {resolvedIssuesCount}
            </div>
            <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>resolved in platform</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #BAE6FD',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Controls Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            backgroundColor: '#F0F9FF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0369A1',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Reviews & Complaints
            </h2>

            {/* Filter Pills */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#FFFFFF',
                border: '1px solid #BAE6FD',
                padding: 4,
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
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'ALL' ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'transparent',
                  color: activeTab === 'ALL' ? '#FFFFFF' : '#0284C7',
                  boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
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
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'REVIEWS' ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'transparent',
                  color: activeTab === 'REVIEWS' ? '#FFFFFF' : '#0284C7',
                  boxShadow: activeTab === 'REVIEWS' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
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
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'COMPLAINTS' ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'transparent',
                  color: activeTab === 'COMPLAINTS' ? '#FFFFFF' : '#0284C7',
                  boxShadow: activeTab === 'COMPLAINTS' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
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
                placeholder="Search by store name, zone, or UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 8,
                  border: '1px solid #BAE6FD',
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0369A1',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#0284C7',
                  fontSize: 14,
                }}
              >
                🔍
              </span>
            </div>

            {/* Filter Toggle */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #BAE6FD',
                  backgroundColor: showFilterDropdown ? '#E0F2FE' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#0369A1',
                  fontSize: 14,
                }}
              >
                ⚙️
              </button>

              {showFilterDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px rgba(2, 132, 199, 0.15)',
                    border: '1px solid #BAE6FD',
                    padding: 16,
                    width: 240,
                    zIndex: 100,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 8 }}>
                    Filter by Status
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #BAE6FD',
                      fontSize: 12,
                      marginBottom: 12,
                      backgroundColor: '#FFFFFF',
                      color: '#0369A1',
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
                      borderRadius: 6,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      fontSize: 12,
                      fontWeight: 700,
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
              <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD' }}>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  ID
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Store Info
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Module
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  User
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Rating / Severity
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isReviewsLoading || isTicketsLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#0284C7' }}>
                    Loading live records from database...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8, color: '#0284C7' }}>ⓘ</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0369A1' }}>
                      No records found in database
                    </div>
                    <div style={{ fontSize: 13, color: '#0284C7', marginTop: 4 }}>
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
                        borderBottom: '1px solid #E0F2FE',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* ID / Type */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#F0F9FF',
                              border: '1px solid #BAE6FD',
                              color: item.type === 'REVIEW' ? '#0369A1' : '#0284C7',
                            }}
                          >
                            {item.type}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
                            {String(item.id).slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Store Info */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#0369A1', fontSize: 13 }}>
                          {item.storeName}
                        </div>
                        <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>
                          {item.storeUid}
                        </div>
                      </td>

                      {/* Module */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0369A1',
                            backgroundColor: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {item.module}
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#0369A1', fontWeight: 600 }}>
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
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#0284C7' }}>
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
                                item.status === 'Resolved' || item.status === 'Closed' ? '#F0F9FF' : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                              color: item.status === 'Resolved' || item.status === 'Closed' ? '#94A3B8' : '#FFFFFF',
                              border: item.status === 'Resolved' || item.status === 'Closed' ? '1px solid #E0F2FE' : 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor:
                                item.status === 'Resolved' || item.status === 'Closed' ? 'not-allowed' : 'pointer',
                              boxShadow: item.status === 'Resolved' || item.status === 'Closed' ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.25)',
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
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
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
            backgroundColor: 'rgba(8, 47, 73, 0.5)',
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
              boxShadow: '0 20px 40px rgba(2, 132, 199, 0.2)',
              border: '1px solid #BAE6FD',
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
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#0369A1',
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {selectedRecord.type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0284C7' }}>
                    {String(selectedRecord.id).slice(0, 8)}
                  </span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0369A1', margin: '8px 0 0 0' }}>
                  {selectedRecord.storeName}
                </h3>
                <p style={{ fontSize: 12, color: '#0284C7', margin: '2px 0 0 0' }}>
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
                  color: '#0284C7',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                backgroundColor: '#F0F9FF',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #BAE6FD',
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>User / Customer</div>
                <div style={{ fontWeight: 700, color: '#0369A1', marginTop: 2 }}>{selectedRecord.user}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>Module Category</div>
                <div style={{ fontWeight: 700, color: '#0369A1', marginTop: 2 }}>{selectedRecord.module}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>Timestamp</div>
                <div style={{ fontWeight: 700, color: '#0369A1', marginTop: 2 }}>{selectedRecord.timestamp}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>Order Ref</div>
                <div style={{ fontWeight: 700, color: '#0369A1', marginTop: 2 }}>{selectedRecord.orderId}</div>
              </div>
            </div>

            {/* Description / Content */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
                Customer Submission & Notes:
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #BAE6FD',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#0369A1',
                }}
              >
                {selectedRecord.description}
              </div>
            </div>

            {/* Severity / Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #BAE6FD', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#0284C7', fontWeight: 600 }}>Compliance Status:</span>
                <span
                  style={{
                    padding: '3px 12px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: '#F0F9FF',
                    color: '#0369A1',
                    border: '1px solid #BAE6FD',
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
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
