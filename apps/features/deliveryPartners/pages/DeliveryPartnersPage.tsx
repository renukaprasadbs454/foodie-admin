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
import type { AdminDeliveryPartner, DeliverymanRecord } from '../types';
export type { DeliverymanRecord };

export function DeliveryPartnersPage() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModalPartner, setRejectModalPartner] = useState<AdminDeliveryPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('Documents incomplete or unreadable');

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

  const partners: AdminDeliveryPartner[] = partnersData?.items ?? [];
  const allPartners: AdminDeliveryPartner[] = allPartnersData?.items ?? partners;

  // Dynamic Dashboard Counts
  const totalFleetCount = allPartnersData?.pagination?.totalElements ?? allPartners.length;
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
          <Text as="h1" variant="heading1" color="#0369A1">
            Delivery Fleet Management
          </Text>
          <Text as="p" variant="caption" color="#0284C7">
            Real-time delivery fleet monitoring, live database partner records, KYC approvals & cash tracking
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              padding: '10px 16px',
              backgroundColor: '#F0F9FF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: isFetching ? 'wait' : 'pointer',
            }}
          >
            {isFetching ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/delivery-payouts')}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            💸 Payouts & Reconciliation
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
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #0284C7',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Total Registered Fleet
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
            {isLoading ? '...' : totalFleetCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #0EA5E9',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Currently Online
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
            {isLoading ? '...' : currentlyOnlineCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #38BDF8',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Pending KYC Reviews
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
            {isLoading ? '...' : pendingKycCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Verified Drivers
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
            {isLoading ? '...' : verifiedCount}
          </Text>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid #BAE6FD',
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
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: statusFilter === tab.key ? '1px solid #0284C7' : '1px solid #BAE6FD',
                background: statusFilter === tab.key ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#F0F9FF',
                color: statusFilter === tab.key ? '#FFFFFF' : '#0369A1',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: statusFilter === tab.key ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by Name, Phone, Vehicle No..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #BAE6FD',
            width: 320,
            maxWidth: '100%',
            fontSize: 14,
            outline: 'none',
            color: '#0369A1',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Dynamic Delivery Partners Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #BAE6FD',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1', fontWeight: 700 }}>
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
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#0284C7' }}>
                  ⏳ Loading dynamic delivery partner database records...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#0369A1' }}>
                  ⚠️ Unable to fetch delivery partners from server. Please verify backend is running.
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#0284C7' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0369A1' }}>
                    No delivery partners found
                  </div>
                  <div style={{ fontSize: 13, color: '#0284C7', marginTop: 4 }}>
                    {searchQuery
                      ? `No partners matching "${searchQuery}" in ${statusFilter} tab`
                      : 'Delivery partners will appear here automatically when employees register'}
                  </div>
                </td>
              </tr>
            ) : (
              partners.map((p) => {
                const docCount = p.documents?.length ?? 0;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #BAE6FD', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0369A1' }}>{p.fullName || 'Unnamed Partner'}</div>
                      <div style={{ fontSize: 11, color: '#0284C7', fontFamily: 'monospace' }}>
                        ID: {p.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0369A1' }}>
                      {p.phoneNumber || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#0369A1' }}>
                        🛵 {p.vehicleType || 'BIKE'} {p.vehicleNumber ? `• ${p.vehicleNumber}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#0284C7' }}>{p.zone || 'Downtown Central'}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {docCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {p.documents.map((d, dIdx) => (
                            <div
                              key={d.id ? `${p.id}-doc-${d.id}` : `${p.id}-doc-${d.docType || 'doc'}-${dIdx}`}
                              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <span style={{ fontWeight: 600, color: '#0369A1' }}>📄 {d.docType}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#F0F9FF',
                                  border: '1px solid #BAE6FD',
                                  color: '#0369A1',
                                }}
                              >
                                {d.verificationStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#0284C7' }}>
                          <em>No documents uploaded</em>
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
                          fontWeight: 700,
                          color: p.isOnline ? '#0369A1' : '#0284C7',
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: p.isOnline ? '#0284C7' : '#94A3B8',
                          }}
                        />
                        {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0369A1' }}>
                      ₹{p.cashInHand ?? 0}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          backgroundColor:
                            p.kycStatus === 'VERIFIED'
                              ? '#F0F9FF'
                              : p.kycStatus === 'REJECTED'
                                ? '#F0F9FF'
                                : '#E0F2FE',
                          color:
                            p.kycStatus === 'VERIFIED'
                              ? '#0369A1'
                              : p.kycStatus === 'REJECTED'
                                ? '#0284C7'
                                : '#0369A1',
                          border: p.kycStatus === 'PENDING' ? '1px solid #38BDF8' : '1px solid #BAE6FD',
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
                              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'wait' : 'pointer',
                              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                            }}
                          >
                            ✓ Approve KYC
                          </button>
                        )}
                        {p.kycStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => setRejectModalPartner(p)}
                            disabled={isRejecting}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#F0F9FF',
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isRejecting ? 'wait' : 'pointer',
                            }}
                          >
                            ✗ Reject
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

      {/* Reject KYC Confirmation Modal */}
      {rejectModalPartner && (
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
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: 440,
              maxWidth: '92%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(2, 132, 199, 0.2)',
              border: '1px solid #BAE6FD',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <Text as="h2" variant="heading2" color="#0369A1">
                Reject Delivery Partner KYC
              </Text>
              <div style={{ fontSize: 13, color: '#0284C7', marginTop: 4 }}>
                Rejecting KYC for <strong>{rejectModalPartner.fullName}</strong>. Please provide a reason:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #BAE6FD',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  color: '#0369A1',
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
                  border: '1px solid #BAE6FD',
                  backgroundColor: '#F0F9FF',
                  color: '#0369A1',
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
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isRejecting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toastMsg.type === 'success' ? '✅' : '⚠️'} {toastMsg.message}
        </div>
      )}
    </div>
  );
}
