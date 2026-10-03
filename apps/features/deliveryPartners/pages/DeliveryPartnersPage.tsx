'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_15_PARTNER_LIST } from '@/constants/gaps';
import { DeliveryPricingSettingsCard } from '../components/DeliveryPricingSettingsCard';
import {
  useGetAdminDeliveryPartnersQuery,
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
} from '@/api/endpoints/deliveryPartnersApi';
import type { AdminDeliveryPartner, DeliveryDocument, DeliverymanRecord } from '../types';
export type { DeliverymanRecord };

function resolveDocumentUrl(doc?: DeliveryDocument | any): string {
  if (!doc) return '';
  const raw = doc.fileUrl || doc.downloadUrl || doc.fileKey || doc.s3Key || '';
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api/v1/storage/')) {
    return trimmed.replace('/api/v1/storage/', '/api/bff/storage/');
  }
  if (trimmed.startsWith('/api/bff/storage/')) {
    return trimmed;
  }
  if (trimmed.startsWith('storage/')) {
    return `/api/bff/${trimmed}`;
  }
  if (trimmed.startsWith('delivery-partners/')) {
    return `/api/bff/storage/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/api/bff/storage/${trimmed}`;
}

function formatDocType(type?: string): { label: string } {
  const t = (type || 'DOCUMENT').toUpperCase();
  if (t === 'IDENTITY' || t.includes('AADHAAR') || t.includes('PAN') || t.includes('PASSPORT')) {
    return { label: 'Identity Proof (Aadhaar / PAN)' };
  }
  if (t === 'LICENSE' || t === 'DRIVING_LICENCE' || t === 'DRIVING_LICENSE' || t.includes('LICENCE') || t.includes('LICENSE')) {
    return { label: 'Driving Licence' };
  }
  if (t === 'VEHICLE_RC' || t.includes('RC') || t.includes('VEHICLE')) {
    return { label: 'Vehicle Registration (RC)' };
  }
  return { label: t.replace(/_/g, ' ') };
}

function isPdfDocument(url: string, doc?: DeliveryDocument | any): boolean {
  const u = (url || '').toLowerCase();
  const k = (doc?.fileKey || doc?.s3Key || doc?.downloadUrl || doc?.fileUrl || '').toLowerCase();
  return u.includes('.pdf') || k.includes('.pdf');
}

export function DeliveryPartnersPage() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModalPartner, setRejectModalPartner] = useState<AdminDeliveryPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('Documents incomplete or unreadable');

  // Document Preview Modal State
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    partner: AdminDeliveryPartner;
    document: DeliveryDocument;
    docIndex: number;
  } | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [docLoadError, setDocLoadError] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    trackAnalyticsEvent('admin_delivery_partners_viewed', {
      gapId: GAP_API_15_PARTNER_LIST,
    });
  }, []);

  // Fetch partners with status and search filter from database (polls every 4s for live registrations)
  const {
    data: partnersData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetAdminDeliveryPartnersQuery(
    {
      status: statusFilter,
      search: debouncedSearch,
      page: 0,
      size: 100,
    },
    { pollingInterval: 4000 }
  );

  // Fetch full overview stats (all partners) to keep KPI cards accurate across tabs
  const { data: allPartnersData } = useGetAdminDeliveryPartnersQuery(
    {
      page: 0,
      size: 500,
    },
    { pollingInterval: 4000 }
  );

  const [approveKyc, { isLoading: isApproving }] = useApproveDeliveryPartnerKycMutation();
  const [rejectKyc, { isLoading: isRejecting }] = useRejectDeliveryPartnerKycMutation();

  const partners: AdminDeliveryPartner[] =
    (partnersData as any)?.items ??
    (partnersData as any)?.data?.items ??
    (Array.isArray(partnersData) ? partnersData : []);

  const allPartners: AdminDeliveryPartner[] =
    (allPartnersData as any)?.items ??
    (allPartnersData as any)?.data?.items ??
    (Array.isArray(allPartnersData) ? allPartnersData : partners);

  // Dynamic Dashboard Counts
  const totalFleetCount =
    (allPartnersData as any)?.pagination?.totalElements ??
    (allPartnersData as any)?.data?.pagination?.totalElements ??
    allPartners.length;
  const currentlyOnlineCount = allPartners.filter((p) => p.isOnline).length;
  const pendingKycCount = allPartners.filter((p) => p.kycStatus === 'PENDING').length;
  const verifiedCount = allPartners.filter((p) => p.kycStatus === 'VERIFIED').length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleApproveKyc = async (partner: AdminDeliveryPartner) => {
    try {
      await approveKyc(partner.id).unwrap();
      showToast('success', `KYC for "${partner.fullName}" approved successfully.`);
      if (selectedDocPreview && selectedDocPreview.partner.id === partner.id) {
        setSelectedDocPreview({
          ...selectedDocPreview,
          partner: { ...selectedDocPreview.partner, kycStatus: 'VERIFIED' },
          document: { ...selectedDocPreview.document, verificationStatus: 'VERIFIED' },
        });
      }
      refetch();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message ?? 'Failed to approve KYC.');
    }
  };

  const handleConfirmRejectKyc = async () => {
    if (!rejectModalPartner) return;
    try {
      await rejectKyc({
        partnerId: rejectModalPartner.id,
        reason: rejectReason.trim() || 'Documents invalid or incomplete',
      }).unwrap();
      showToast('success', `KYC for "${rejectModalPartner.fullName}" marked as REJECTED.`);
      if (selectedDocPreview && selectedDocPreview.partner.id === rejectModalPartner.id) {
        setSelectedDocPreview({
          ...selectedDocPreview,
          partner: { ...selectedDocPreview.partner, kycStatus: 'REJECTED' },
          document: { ...selectedDocPreview.document, verificationStatus: 'REJECTED' },
        });
      }
      setRejectModalPartner(null);
      setRejectReason('Documents incomplete or unreadable');
      refetch();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message ?? 'Failed to reject KYC.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#111827" style={{ fontWeight: 800 }}>
            Delivery Fleet Management
          </Text>
          <Text as="p" variant="caption" color="#6B7280" style={{ marginTop: 4 }}>
            Real-time delivery fleet monitoring, live database partner records, KYC approvals & cash tracking
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: isFetching ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            {isFetching ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Delivery Partner Pricing Rules Card */}
      <DeliveryPricingSettingsCard />

      {/* Dynamic Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Total Registered Fleet
          </Text>
          <Text as="h2" variant="heading1" color="#111827" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : totalFleetCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Currently Online
          </Text>
          <Text as="h2" variant="heading1" color="#22C55E" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : currentlyOnlineCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Pending KYC Reviews
          </Text>
          <Text as="h2" variant="heading1" color="#F59E0B" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : pendingKycCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Verified Drivers
          </Text>
          <Text as="h2" variant="heading1" color="#2196F3" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : verifiedCount}
          </Text>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'ALL', label: `All Fleet (${totalFleetCount})` },
              { key: 'VERIFIED', label: `Verified (${verifiedCount})` },
              { key: 'PENDING', label: `Pending KYC (${pendingKycCount})` },
              { key: 'REJECTED', label: 'Rejected' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: isActive ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                  background: isActive ? '#E3F2FD' : '#FFFFFF',
                  color: isActive ? '#2196F3' : '#6B7280',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Search by Name, Phone, Vehicle No..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '9px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            width: 320,
            maxWidth: '100%',
            fontSize: 13,
            outline: 'none',
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Dynamic Delivery Partners Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px 20px' }}>Deliveryman Name</th>
              <th style={{ padding: '14px 20px' }}>Contact Phone</th>
              <th style={{ padding: '14px 20px' }}>Vehicle & Zone</th>
              <th style={{ padding: '14px 20px' }}>Documents & KYC</th>
              <th style={{ padding: '14px 20px' }}>Live Availability</th>
              <th style={{ padding: '14px 20px' }}>Cash in Hand</th>
              <th style={{ padding: '14px 20px' }}>KYC Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                  Loading dynamic delivery partner database records...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#EF4444' }}>
                  Unable to fetch delivery partners from server. Please verify backend is running.
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                    No delivery partners found
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    {searchQuery
                      ? `No partners matching "${searchQuery}" in ${statusFilter} tab`
                      : 'Delivery partners will appear here automatically when employees register'}
                  </div>
                </td>
              </tr>
            ) : (
              partners.map((p) => {
                const docs = p.documents || (p as any).docs || [];
                const docCount = docs.length;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{p.fullName || 'Unnamed Partner'}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                        ID: {p.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#374151' }}>
                      {p.phoneNumber || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {p.vehicleType || 'BIKE'} {p.vehicleNumber ? `• ${p.vehicleNumber}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{p.zone || 'Downtown Central'}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {docCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {docs.map((d: any, dIdx: number) => {
                            const status = d.verificationStatus || d.status || 'PENDING';
                            const docUrl = resolveDocumentUrl(d);
                            const key = d.documentId || d.id || `${p.id}-doc-${d.docType || dIdx}`;
                            const isVerified = status === 'VERIFIED';
                            const isRejected = status === 'REJECTED';

                            const statusBg = isVerified ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#E3F2FD';
                            const statusBorder = isVerified ? '#BBF7D0' : isRejected ? '#FECACA' : '#BFDBFE';
                            const statusColor = isVerified ? '#15803D' : isRejected ? '#B91C1C' : '#2196F3';

                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  backgroundColor: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: 8,
                                  padding: '4px 8px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDocLoading(true);
                                    setDocLoadError(false);
                                    setSelectedDocPreview({ partner: p, document: d, docIndex: dIdx });
                                  }}
                                  title="Click to preview document in modal"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: '#2196F3',
                                    fontWeight: 600,
                                    fontSize: 12,
                                  }}
                                >
                                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                                    {d.docType || 'DOCUMENT'}
                                  </span>
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDocLoading(true);
                                      setDocLoadError(false);
                                      setSelectedDocPreview({ partner: p, document: d, docIndex: dIdx });
                                    }}
                                    title="Click to view document"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      backgroundColor: statusBg,
                                      border: `1px solid ${statusBorder}`,
                                      color: statusColor,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {status}
                                  </button>

                                  {docUrl && (
                                    <a
                                      href={docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open original file in new browser tab"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 20,
                                        height: 20,
                                        borderRadius: 4,
                                        backgroundColor: '#E3F2FD',
                                        border: '1px solid #BFDBFE',
                                        color: '#2196F3',
                                        fontSize: 11,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                          No documents uploaded
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 20,
                          backgroundColor: p.isOnline ? '#DCFCE7' : '#F3F4F6',
                          color: p.isOnline ? '#15803D' : '#6B7280',
                          border: `1px solid ${p.isOnline ? '#BBF7D0' : '#E5E7EB'}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: p.isOnline ? '#22C55E' : '#9CA3AF',
                          }}
                        />
                        {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#111827' }}>
                      ₹{p.cashInHand ?? 0}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          backgroundColor:
                            p.kycStatus === 'VERIFIED'
                              ? '#DCFCE7'
                              : p.kycStatus === 'REJECTED'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                          color:
                            p.kycStatus === 'VERIFIED'
                              ? '#15803D'
                              : p.kycStatus === 'REJECTED'
                                ? '#B91C1C'
                                : '#B45309',
                          border:
                            p.kycStatus === 'VERIFIED'
                              ? '1px solid #BBF7D0'
                              : p.kycStatus === 'REJECTED'
                                ? '1px solid #FECACA'
                                : '1px solid #FDE68A',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 20,
                          display: 'inline-block',
                        }}
                      >
                        {p.kycStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {p.kycStatus !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleApproveKyc(p)}
                            disabled={isApproving}
                            style={{
                              padding: '6px 14px',
                              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'wait' : 'pointer',
                              boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                            }}
                          >
                            Approve KYC
                          </button>
                        )}
                        {p.kycStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => setRejectModalPartner(p)}
                            disabled={isRejecting}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              border: '1px solid #FECACA',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isRejecting ? 'wait' : 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Document Preview Modal */}
      {selectedDocPreview && (() => {
        const partner = selectedDocPreview.partner;
        const docs = partner.documents || (partner as any).docs || [];
        const currentDoc = selectedDocPreview.document;
        const currentUrl = resolveDocumentUrl(currentDoc);
        const docInfo = formatDocType(currentDoc.docType || currentDoc.type);
        const isPdf = isPdfDocument(currentUrl, currentDoc);
        const isPending = currentDoc.verificationStatus === 'PENDING';
        const isVerified = currentDoc.verificationStatus === 'VERIFIED';
        const isRejected = currentDoc.verificationStatus === 'REJECTED';

        const statusBg = isVerified ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#E3F2FD';
        const statusBorder = isVerified ? '#BBF7D0' : isRejected ? '#FECACA' : '#BFDBFE';
        const statusColor = isVerified ? '#15803D' : isRejected ? '#B91C1C' : '#2196F3';

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setSelectedDocPreview(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                width: 780,
                maxWidth: '96%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text as="h2" variant="heading2" color="#111827" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                      {docInfo.label}
                    </Text>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: statusBg,
                        border: `1px solid ${statusBorder}`,
                        color: statusColor,
                      }}
                    >
                      {currentDoc.verificationStatus || 'PENDING'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Partner: <strong style={{ color: '#111827' }}>{partner.fullName}</strong> ({partner.phoneNumber || 'No phone'})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentUrl && (
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        color: '#2196F3',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ↗ Open in New Tab
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocPreview(null)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      color: '#6B7280',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Multi-Document Switcher Tabs */}
              {docs.length > 1 && (
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                  }}
                >
                  {docs.map((docItem: any, idx: number) => {
                    const itemType = formatDocType(docItem.docType || docItem.type);
                    const isActive = selectedDocPreview.docIndex === idx;
                    const itemStatus = docItem.verificationStatus || docItem.status || 'PENDING';
                    return (
                      <button
                        key={docItem.documentId || docItem.id || `tab-${idx}`}
                        type="button"
                        onClick={() => {
                          setIsDocLoading(true);
                          setDocLoadError(false);
                          setSelectedDocPreview({
                            partner,
                            document: docItem,
                            docIndex: idx,
                          });
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: isActive ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                          backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                          color: isActive ? '#2196F3' : '#6B7280',
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{docItem.docType || 'Doc'}</span>
                        <span style={{ fontSize: 10, opacity: 0.85 }}>
                          ({itemStatus})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Document Preview Content Viewport */}
              <div
                style={{
                  flex: 1,
                  minHeight: 380,
                  maxHeight: '62vh',
                  padding: 20,
                  overflowY: 'auto',
                  backgroundColor: '#0F172A',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Loading indicator */}
                {isDocLoading && !docLoadError && currentUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      gap: 12,
                      color: '#E3F2FD',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Loading document preview...</span>
                  </div>
                )}

                {/* Main Media Preview */}
                {!currentUrl ? (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
                      Document File Not Found
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      No file URL or storage key was provided for this document record.
                    </div>
                  </div>
                ) : docLoadError ? (
                  <div style={{ textAlign: 'center', color: '#F87171', padding: 40, maxWidth: 440 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F87171' }}>
                      Unable to Render Inline Preview
                    </div>
                    <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 8, lineHeight: 1.5 }}>
                      The file format or network policy prevented direct preview rendering. You can still open and view the raw file directly:
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '10px 18px',
                          background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          textDecoration: 'none',
                        }}
                      >
                        ↗ Open File in Browser
                      </a>
                    </div>
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={currentUrl}
                    title={docInfo.label}
                    onLoad={() => setIsDocLoading(false)}
                    onError={() => {
                      setIsDocLoading(false);
                      setDocLoadError(true);
                    }}
                    style={{
                      width: '100%',
                      height: '520px',
                      border: 'none',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                ) : (
                  <img
                    src={currentUrl}
                    alt={docInfo.label}
                    onLoad={() => setIsDocLoading(false)}
                    onError={() => {
                      setIsDocLoading(false);
                      setDocLoadError(true);
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '520px',
                      objectFit: 'contain',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                )}
              </div>

              {/* Modal Footer with KYC Approval / Rejection Actions */}
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {currentDoc.uploadedAt ? (
                    <span>Uploaded: {new Date(currentDoc.uploadedAt).toLocaleString()}</span>
                  ) : (
                    <span>Format: {isPdf ? 'PDF Document' : 'Image / Scanned File'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {partner.kycStatus !== 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => handleApproveKyc(partner)}
                      disabled={isApproving}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isApproving ? 'wait' : 'pointer',
                        boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                      }}
                    >
                      Approve Partner KYC
                    </button>
                  )}
                  {partner.kycStatus !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => setRejectModalPartner(partner)}
                      disabled={isRejecting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FEE2E2',
                        color: '#B91C1C',
                        border: '1px solid #FECACA',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isRejecting ? 'wait' : 'pointer',
                      }}
                    >
                      Reject KYC
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocPreview(null)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject KYC Confirmation Modal */}
      {rejectModalPartner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              width: 440,
              maxWidth: '92%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <Text as="h2" variant="heading2" color="#111827" style={{ fontWeight: 700 }}>
                Reject Delivery Partner KYC
              </Text>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Rejecting KYC for <strong style={{ color: '#111827' }}>{rejectModalPartner.fullName}</strong>. Please provide a reason:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setRejectModalPartner(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKyc}
                disabled={isRejecting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isRejecting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                }}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toastMsg.message}
        </div>
      )}
    </div>
  );
}

