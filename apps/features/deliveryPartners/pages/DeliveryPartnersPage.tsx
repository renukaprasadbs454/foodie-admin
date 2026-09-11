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
          <Text as="h1" variant="heading1" color="#09090B">
            Delivery Fleet Management
          </Text>
          <Text as="p" variant="caption" color="#71717A">
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
              backgroundColor: '#F4F4F5',
              color: '#09090B',
              border: '1px solid #E4E4E7',
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
              backgroundColor: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
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
            border: '1px solid #E4E4E7',
            borderTop: '4px solid #000000',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <Text as="span" variant="caption" color="#71717A">
            Total Registered Fleet
          </Text>
          <Text as="h2" variant="heading1" color="#09090B" style={{ marginTop: 4 }}>
            {isLoading ? '...' : totalFleetCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #E4E4E7',
            borderTop: '4px solid #18181B',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <Text as="span" variant="caption" color="#71717A">
            Currently Online
          </Text>
          <Text as="h2" variant="heading1" color="#09090B" style={{ marginTop: 4 }}>
            {isLoading ? '...' : currentlyOnlineCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #E4E4E7',
            borderTop: '4px solid #000000',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <Text as="span" variant="caption" color="#71717A">
            Pending KYC Reviews
          </Text>
          <Text as="h2" variant="heading1" color="#09090B" style={{ marginTop: 4 }}>
            {isLoading ? '...' : pendingKycCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #E4E4E7',
            borderTop: '4px solid #71717A',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <Text as="span" variant="caption" color="#71717A">
            Verified Drivers
          </Text>
          <Text as="h2" variant="heading1" color="#09090B" style={{ marginTop: 4 }}>
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
          border: '1px solid #E4E4E7',
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
                border: 'none',
                backgroundColor: statusFilter === tab.key ? '#000000' : '#F4F4F5',
                color: statusFilter === tab.key ? '#FFFFFF' : '#09090B',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
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
            border: '1px solid #E4E4E7',
            width: 320,
            maxWidth: '100%',
            fontSize: 14,
            outline: 'none',
            color: '#09090B',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Dynamic Delivery Partners Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E4E4E7',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '1px solid #E4E4E7', color: '#09090B', fontWeight: 700 }}>
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
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#71717A' }}>
                  ⏳ Loading dynamic delivery partner database records...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#09090B' }}>
                  ⚠️ Unable to fetch delivery partners from server. Please verify backend is running.
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#71717A' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#09090B' }}>
                    No delivery partners found
                  </div>
                  <div style={{ fontSize: 13, color: '#71717A', marginTop: 4 }}>
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
                  <tr key={p.id} style={{ borderBottom: '1px solid #E4E4E7', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#09090B' }}>{p.fullName || 'Unnamed Partner'}</div>
                      <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace' }}>
                        ID: {p.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#09090B' }}>
                      {p.phoneNumber || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#09090B' }}>
                        🛵 {p.vehicleType || 'BIKE'} {p.vehicleNumber ? `• ${p.vehicleNumber}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#71717A' }}>{p.zone || 'Downtown Central'}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {docCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {p.documents.map((d) => (
                            <div key={d.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: '#09090B' }}>📄 {d.docType}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#F4F4F5',
                                  border: '1px solid #E4E4E7',
                                  color: '#09090B',
                                }}
                              >
                                {d.verificationStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#71717A' }}>
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
                          color: p.isOnline ? '#09090B' : '#71717A',
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: p.isOnline ? '#000000' : '#71717A',
                          }}
                        />
                        {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#09090B' }}>
                      ₹{p.cashInHand ?? 0}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          backgroundColor:
                            p.kycStatus === 'VERIFIED'
                              ? '#F4F4F5'
                              : p.kycStatus === 'REJECTED'
                                ? '#E4E4E7'
                                : '#000000',
                          color:
                            p.kycStatus === 'VERIFIED'
                              ? '#09090B'
                              : p.kycStatus === 'REJECTED'
                                ? '#71717A'
                                : '#FFFFFF',
                          border: '1px solid #E4E4E7',
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
                              backgroundColor: '#000000',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'wait' : 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
                              backgroundColor: '#F4F4F5',
                              color: '#09090B',
                              border: '1px solid #E4E4E7',
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
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <Text as="h2" variant="heading2" color="#09090B">
                Reject Delivery Partner KYC
              </Text>
              <div style={{ fontSize: 13, color: '#71717A', marginTop: 4 }}>
                Rejecting KYC for <strong>{rejectModalPartner.fullName}</strong>. Please provide a reason:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #E4E4E7',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  color: '#09090B',
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
                  border: '1px solid #E4E4E7',
                  backgroundColor: '#F4F4F5',
                  color: '#09090B',
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
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isRejecting ? 'wait' : 'pointer',
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
            backgroundColor: '#000000',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
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
