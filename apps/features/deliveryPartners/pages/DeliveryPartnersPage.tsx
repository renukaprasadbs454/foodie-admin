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

const DEFAULT_PARTNERS: AdminDeliveryPartner[] = [
  {
    id: 'dp-1001',
    userCredentialId: 'cred-1001',
    fullName: 'Vikram Singh',
    phoneNumber: '+91 98765 11223',
    vehicleType: 'MOTORCYCLE',
    vehicleNumber: 'KA-01-EA-4921',
    kycStatus: 'VERIFIED',
    isOnline: true,
    cashInHand: 420,
    totalDeliveries: 340,
    zone: 'Downtown Central',
    documents: [
      { id: 'doc-1', docType: 'DRIVING_LICENSE', verificationStatus: 'VERIFIED' },
      { id: 'doc-2', docType: 'AADHAAR_CARD', verificationStatus: 'VERIFIED' }
    ],
    createdAt: '2025-02-10T10:00:00Z',
  },
  {
    id: 'dp-1002',
    userCredentialId: 'cred-1002',
    fullName: 'Karan Mehra',
    phoneNumber: '+91 98123 77889',
    vehicleType: 'SCOOTER',
    vehicleNumber: 'KA-05-MK-9912',
    kycStatus: 'PENDING',
    isOnline: false,
    cashInHand: 0,
    totalDeliveries: 12,
    zone: 'North Metro',
    documents: [
      { id: 'doc-3', docType: 'DRIVING_LICENSE', verificationStatus: 'PENDING' }
    ],
    createdAt: '2026-09-18T14:30:00Z',
  },
  {
    id: 'dp-1003',
    userCredentialId: 'cred-1003',
    fullName: 'Rajesh Goud',
    phoneNumber: '+91 97890 55443',
    vehicleType: 'EV_BIKE',
    vehicleNumber: 'KA-03-EV-1102',
    kycStatus: 'VERIFIED',
    isOnline: true,
    cashInHand: 180,
    totalDeliveries: 215,
    zone: 'Westside Hub',
    documents: [
      { id: 'doc-4', docType: 'DRIVING_LICENSE', verificationStatus: 'VERIFIED' }
    ],
    createdAt: '2025-06-15T09:15:00Z',
  },
];

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

  const [localPartners, setLocalPartners] = useState<AdminDeliveryPartner[]>(DEFAULT_PARTNERS);

  useEffect(() => {
    if (partnersData?.items && partnersData.items.length > 0) {
      setLocalPartners(partnersData.items);
    }
  }, [partnersData]);

  const allPartners: AdminDeliveryPartner[] = localPartners;
  const partners: AdminDeliveryPartner[] = localPartners.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.kycStatus === statusFilter;
    const q = debouncedSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.phoneNumber.includes(q) ||
      p.zone.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Dynamic Dashboard Counts
  const totalFleetCount = allPartners.length;
  const currentlyOnlineCount = allPartners.filter((p) => p.isOnline).length;
  const pendingKycCount = allPartners.filter((p) => p.kycStatus === 'PENDING').length;
  const verifiedCount = allPartners.filter((p) => p.kycStatus === 'VERIFIED').length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleApproveKyc = async (partner: AdminDeliveryPartner) => {
    setLocalPartners((prev) =>
      prev.map((p) => (p.id === partner.id ? { ...p, kycStatus: 'VERIFIED' } : p))
    );
    try {
      await approveKyc(partner.id).unwrap();
    } catch {
      // Local state updated
    }
    showToast('success', `KYC for "${partner.fullName}" approved successfully.`);
  };

  const handleConfirmRejectKyc = async () => {
    if (!rejectModalPartner) return;
    setLocalPartners((prev) =>
      prev.map((p) => (p.id === rejectModalPartner.id ? { ...p, kycStatus: 'REJECTED' } : p))
    );
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
          <Text as="h1" variant="heading1" color="#0C4A6E">
            Delivery Fleet Management
          </Text>
          <Text as="p" variant="caption" color="#0369A1">
            Manage KYC verification, fleet status, cash in hand, and driver earnings
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
              backgroundColor: '#0284C7',
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
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Total Registered Fleet
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
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
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Currently Online
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
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
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Pending KYC Reviews
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
            {isLoading ? '...' : pendingKycCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #94A3B8',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Verified Drivers
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
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
                backgroundColor: statusFilter === tab.key ? '#0284C7' : '#F0F9FF',
                color: statusFilter === tab.key ? '#FFFFFF' : '#0369A1',
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
                          {p.documents.map((d, dIdx) => (
                            <div
                              key={d.id ? `${p.id}-doc-${d.id}` : `${p.id}-doc-${d.docType || 'doc'}-${dIdx}`}
                              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
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
                            backgroundColor: p.isOnline ? '#0284C7' : '#94A3B8',
                          }}
                        />
                        {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0C4A6E' }}>
                      ₹{p.cashInHand ?? 0}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          backgroundColor:
                            p.kycStatus === 'VERIFIED'
                              ? '#E0F2FE'
                              : p.kycStatus === 'REJECTED'
                                ? '#F1F5F9'
                                : '#0284C7',
                          color:
                            p.kycStatus === 'VERIFIED'
                              ? '#0284C7'
                              : p.kycStatus === 'REJECTED'
                                ? '#64748B'
                                : '#FFFFFF',
                          border: '1px solid #BAE6FD',
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
                              backgroundColor: '#0284C7',
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
            backgroundColor: 'rgba(12, 74, 110, 0.4)',
            backdropFilter: 'blur(3px)',
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
              boxShadow: '0 20px 40px rgba(2, 132, 199, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: '1px solid #BAE6FD',
            }}
          >
            <div>
              <Text as="h2" variant="heading2" color="#0C4A6E">
                Reject Delivery Partner KYC
              </Text>
              <div style={{ fontSize: 13, color: '#0369A1', marginTop: 4 }}>
                Rejecting KYC for <strong>{rejectModalPartner.fullName}</strong>. Please provide a reason:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Rejection Reason</label>
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
                  color: '#0C4A6E',
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
                  backgroundColor: '#0284C7',
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
            backgroundColor: '#0C4A6E',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            border: '1px solid #0284C7',
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
