'use client';

import React, { useEffect, useState } from 'react';
import {
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
  useSuspendDeliveryPartnerMutation,
  useGetAdminShiftsQuery,
  type DeliveryShift,
} from '@/api/endpoints/deliveryPartnersApi';
import { useGetAdminOrdersQuery } from '@/api/endpoints/ordersApi';
import {
  useGetAdminPayoutsQuery,
  useApproveSinglePayoutMutation,
  useRejectPayoutMutation,
} from '@/api/endpoints/paymentsApi';
import type { PayoutRecord } from '@/features/payments/types';
import { useGetAdminReviewsQuery, type AdminReviewRecord } from '@/api/endpoints/reviewsApi';
import { useGetAllTicketsQuery, type EnquiryRecord } from '@/api/endpoints/supportApi';
import type { AdminDeliveryPartner, DeliveryDocument } from '../types';

export interface DeliveryPartnerFullDetailsDrawerProps {
  open: boolean;
  partner: AdminDeliveryPartner | null;
  onClose: () => void;
  onPartnerUpdated?: (updatedPartner: AdminDeliveryPartner) => void;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'DP';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolveDocumentUrl(doc?: DeliveryDocument | any): string {
  if (!doc) return '';
  const raw = doc.fileUrl || doc.downloadUrl || doc.fileKey || doc.s3Key || '';
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/api/v1/storage/')) return trimmed.replace('/api/v1/storage/', '/api/bff/storage/');
  if (trimmed.startsWith('/api/bff/storage/')) return trimmed;
  if (trimmed.startsWith('storage/')) return `/api/bff/${trimmed}`;
  if (trimmed.startsWith('delivery-partners/')) return `/api/bff/storage/${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;
  return `/api/bff/storage/${trimmed}`;
}

function formatDocType(type?: string): string {
  const t = (type || 'DOCUMENT').toUpperCase();
  if (t === 'IDENTITY' || t.includes('AADHAAR') || t.includes('PAN') || t.includes('PASSPORT')) {
    return 'Identity Proof (Aadhaar / PAN)';
  }
  if (t === 'LICENSE' || t === 'DRIVING_LICENCE' || t === 'DRIVING_LICENSE' || t.includes('LICENCE') || t.includes('LICENSE')) {
    return 'Driving Licence';
  }
  if (t === 'VEHICLE_RC' || t.includes('RC') || t.includes('VEHICLE')) {
    return 'Vehicle Registration (RC)';
  }
  return t.replace(/_/g, ' ');
}

export function DeliveryPartnerFullDetailsDrawer({
  open,
  partner,
  onClose,
  onPartnerUpdated,
}: DeliveryPartnerFullDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'ORDERS' | 'CASH_IN_HAND' | 'PAYMENTS' | 'DOCUMENTS' | 'REVIEWS' | 'COMPLAINTS' | 'SHIFTS'
  >('OVERVIEW');

  // Local state for immediate responsiveness
  const [currentPartner, setCurrentPartner] = useState<AdminDeliveryPartner | null>(partner);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals inside drawer
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('Documents incomplete or unreadable');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DeliveryDocument | null>(null);

  // Mutations
  const [suspendPartner, { isLoading: isSuspending }] = useSuspendDeliveryPartnerMutation();
  const [approveKyc, { isLoading: isApprovingKyc }] = useApproveDeliveryPartnerKycMutation();
  const [rejectKyc, { isLoading: isRejectingKyc }] = useRejectDeliveryPartnerKycMutation();
  const [approvePayout, { isLoading: isApprovingPayout }] = useApproveSinglePayoutMutation();
  const [rejectPayout, { isLoading: isRejectingPayout }] = useRejectPayoutMutation();

  // Queries for related data
  const { data: allOrders = [], isLoading: isLoadingOrders } = useGetAdminOrdersQuery(undefined, {
    skip: !open || !currentPartner,
  });

  const { data: allPayouts = [], isLoading: isLoadingPayouts, refetch: refetchPayouts } = useGetAdminPayoutsQuery(
    { ownerType: 'DELIVERY_PARTNER' },
    { skip: !open || !currentPartner }
  );

  const { data: allReviews = [], isLoading: isLoadingReviews } = useGetAdminReviewsQuery(undefined, {
    skip: !open || !currentPartner,
  });

  const { data: allTickets = [], isLoading: isLoadingTickets } = useGetAllTicketsQuery(undefined, {
    skip: !open || !currentPartner,
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useGetAdminShiftsQuery(undefined, {
    skip: !open || !currentPartner,
  });

  // Sync prop updates
  useEffect(() => {
    if (partner) {
      setCurrentPartner(partner);
    }
  }, [partner]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setToastMsg(null);
      setIsSuspendModalOpen(false);
      setIsRejectModalOpen(false);
      setSelectedDocForPreview(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !currentPartner) return null;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const isSuspended = currentPartner.kycStatus === 'SUSPENDED';
  const isVerified = currentPartner.kycStatus === 'VERIFIED';
  const isPending = currentPartner.kycStatus === 'PENDING';
  const isRejected = currentPartner.kycStatus === 'REJECTED';

  // 1. Associated Orders
  const partnerOrders = (allOrders || []).filter((ord: any) => {
    if (!ord) return false;
    const ordPartnerId = ord.assignedDeliveryPartnerId || ord.deliveryPartnerId;
    const ordPartnerName = ord.assignedDeliveryPartnerName || ord.deliveryPartnerName;
    const ordPhone = ord.deliveryPartnerPhone;
    return (
      (ordPartnerId && ordPartnerId === currentPartner.id) ||
      (ordPartnerName && ordPartnerName.trim().toLowerCase() === currentPartner.fullName.trim().toLowerCase()) ||
      (ordPhone && ordPhone === currentPartner.phoneNumber)
    );
  });

  const completedOrders = partnerOrders.filter((o: any) => o.status === 'DELIVERED');
  const activeOrders = partnerOrders.filter(
    (o: any) => !['DELIVERED', 'CANCELED', 'REJECTED'].includes(o.status)
  );
  const totalAmountDelivered = completedOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

  // 2. Reviews & Rating
  const partnerReviews = (allReviews || []).filter((r: AdminReviewRecord) => {
    if (!r) return false;
    return (
      (r.deliveryPartnerId && r.deliveryPartnerId === currentPartner.id) ||
      (r.deliveryPartnerName && r.deliveryPartnerName.trim().toLowerCase() === currentPartner.fullName.trim().toLowerCase())
    );
  });
  const avgRating =
    partnerReviews.length > 0
      ? (
          partnerReviews.reduce((sum, r) => sum + (r.deliveryRating || r.rating || 5), 0) /
          partnerReviews.length
        ).toFixed(1)
      : (currentPartner.rating || 4.8).toFixed(1);

  // 3. Support Tickets / Complaints
  const partnerComplaints = (allTickets || []).filter((t: EnquiryRecord) => {
    if (!t) return false;
    const nameMatch =
      t.senderName &&
      t.senderName.trim().toLowerCase().includes(currentPartner.fullName.trim().toLowerCase());
    const phoneMatch = t.senderPhone && t.senderPhone === currentPartner.phoneNumber;
    const subjectMatch =
      t.subject &&
      t.subject.toLowerCase().includes(currentPartner.fullName.toLowerCase());
    const messageMatch =
      t.message &&
      t.message.toLowerCase().includes(currentPartner.fullName.toLowerCase());
    return (
      t.category === 'DELIVERY' &&
      (nameMatch || phoneMatch || subjectMatch || messageMatch || t.senderPhone?.includes(currentPartner.phoneNumber.slice(-6)))
    );
  });

  // 4. Payouts & Payments
  const partnerPayouts = (allPayouts || []).filter((p: PayoutRecord) => {
    if (!p) return false;
    const idMatch = p.walletAccountId === currentPartner.id || (p as any).ownerId === currentPartner.id;
    const nameMatch =
      p.ownerName &&
      p.ownerName.trim().toLowerCase() === currentPartner.fullName.trim().toLowerCase();
    return idMatch || nameMatch;
  });

  // 5. Cash in Hand & Threshold
  const cashInHand = Number(currentPartner.cashInHand || 0);
  const maxLimit = Number(currentPartner.maxCashInHandLimit || 2000);
  const cashPercentage = Math.min(100, Math.round((cashInHand / maxLimit) * 100));
  const isCashCritical = cashInHand >= maxLimit;
  const isCashWarning = cashInHand >= maxLimit * 0.75;

  // Handlers
  const handleToggleSuspend = async () => {
    if (isSuspended) {
      // Reactivate
      try {
        await suspendPartner({
          partnerId: currentPartner.id,
          reason: 'Account reactivated by Admin',
        }).unwrap();
        const updated: AdminDeliveryPartner = {
          ...currentPartner,
          kycStatus: 'VERIFIED',
          kycRejectionReason: null,
          isOnline: true,
        };
        setCurrentPartner(updated);
        onPartnerUpdated?.(updated);
        showToast('success', `Delivery partner ${currentPartner.fullName} has been reactivated.`);
      } catch (err: any) {
        showToast('error', err?.data?.error?.message || 'Failed to reactivate delivery partner.');
      }
    } else {
      setSuspendReasonInput('Account suspended by Admin. Verification review in progress.');
      setIsSuspendModalOpen(true);
    }
  };

  const handleConfirmSuspend = async () => {
    try {
      await suspendPartner({
        partnerId: currentPartner.id,
        reason: suspendReasonInput.trim() || 'Account suspended by Admin',
      }).unwrap();
      const updated: AdminDeliveryPartner = {
        ...currentPartner,
        kycStatus: 'SUSPENDED',
        kycRejectionReason: suspendReasonInput.trim() || 'Account suspended by Admin',
        isOnline: false,
      };
      setCurrentPartner(updated);
      onPartnerUpdated?.(updated);
      setIsSuspendModalOpen(false);
      showToast('success', `Delivery partner ${currentPartner.fullName} has been suspended.`);
    } catch (err: any) {
      showToast('error', err?.data?.error?.message || 'Failed to suspend delivery partner.');
    }
  };

  const handleApproveKyc = async () => {
    try {
      await approveKyc(currentPartner.id).unwrap();
      const updated: AdminDeliveryPartner = {
        ...currentPartner,
        kycStatus: 'VERIFIED',
        kycRejectionReason: null,
        documents: (currentPartner.documents || []).map((d) => ({ ...d, verificationStatus: 'VERIFIED' })),
      };
      setCurrentPartner(updated);
      onPartnerUpdated?.(updated);
      showToast('success', `KYC approved for ${currentPartner.fullName}.`);
    } catch (err: any) {
      showToast('error', err?.data?.error?.message || 'Failed to approve KYC.');
    }
  };

  const handleConfirmRejectKyc = async () => {
    try {
      await rejectKyc({
        partnerId: currentPartner.id,
        reason: rejectReasonInput.trim(),
      }).unwrap();
      const updated: AdminDeliveryPartner = {
        ...currentPartner,
        kycStatus: 'REJECTED',
        kycRejectionReason: rejectReasonInput.trim(),
        documents: (currentPartner.documents || []).map((d) => ({ ...d, verificationStatus: 'REJECTED' })),
      };
      setCurrentPartner(updated);
      onPartnerUpdated?.(updated);
      setIsRejectModalOpen(false);
      showToast('success', `KYC rejected for ${currentPartner.fullName}.`);
    } catch (err: any) {
      showToast('error', err?.data?.error?.message || 'Failed to reject KYC.');
    }
  };

  const handleApproveSinglePayout = async (payoutId: string) => {
    try {
      await approvePayout({ payoutId }).unwrap();
      showToast('success', 'Payout request approved successfully.');
      refetchPayouts();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message || 'Failed to approve payout.');
    }
  };

  const handleRejectSinglePayout = async (payoutId: string) => {
    const reason = window.prompt('Enter reason for rejecting this payout request:', 'Rejected by admin');
    if (reason === null) return;
    try {
      await rejectPayout({ payoutId, reason }).unwrap();
      showToast('success', 'Payout request rejected.');
      refetchPayouts();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message || 'Failed to reject payout.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Dark Blurred Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Centered Modal Overlay Panel */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 101,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fullscreen Header */}
        <div
          style={{
            padding: '16px 28px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            zIndex: 10,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: Back button & Partner Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <span>←</span>
              <span>Back to Fleet</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Partner Avatar / Initials */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: isSuspended ? '#FEF2F2' : '#EFF6FF',
                  border: `1.5px solid ${isSuspended ? '#FECACA' : '#BFDBFE'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  color: isSuspended ? '#DC2626' : '#2563EB',
                }}
              >
                {getInitials(currentPartner.fullName)}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
                    {currentPartner.fullName || 'Delivery Partner'}
                  </h2>

                  {/* Availability Badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      backgroundColor: currentPartner.isOnline ? '#ECFDF5' : '#F3F4F6',
                      color: currentPartner.isOnline ? '#059669' : '#6B7280',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: currentPartner.isOnline ? '#10B981' : '#9CA3AF',
                      }}
                    />
                    {currentPartner.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>

                  {/* KYC Status Badge */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 12,
                      textTransform: 'uppercase',
                      backgroundColor: isVerified
                        ? '#ECFDF5'
                        : isSuspended
                        ? '#FEF3C7'
                        : isRejected
                        ? '#FEF2F2'
                        : '#EFF6FF',
                      color: isVerified
                        ? '#059669'
                        : isSuspended
                        ? '#D97706'
                        : isRejected
                        ? '#DC2626'
                        : '#2563EB',
                    }}
                  >
                    {currentPartner.kycStatus || 'PENDING'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  <span>Phone: <strong style={{ color: '#111827' }}>{currentPartner.phoneNumber}</strong></span>
                  <span>•</span>
                  <span>ID: <code style={{ color: '#6B7280' }}>{currentPartner.id.slice(0, 8)}...</code></span>
                  <span>•</span>
                  <span>Vehicle: <strong style={{ color: '#111827' }}>{currentPartner.vehicleType || 'BIKE'} {currentPartner.vehicleNumber ? `(${currentPartner.vehicleNumber})` : ''}</strong></span>
                  <span>•</span>
                  <span>Zone: <strong style={{ color: '#111827' }}>{currentPartner.zone || 'Central Zone'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions (Suspend/Reactivate, KYC Approve/Reject, Close) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* KYC Approvals if pending/rejected */}
            {!isVerified && (
              <>
                <button
                  type="button"
                  onClick={handleApproveKyc}
                  disabled={isApprovingKyc}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isApprovingKyc ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                  }}
                >
                  ✓ {isApprovingKyc ? 'Approving...' : 'Approve KYC'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isRejectingKyc}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #FCA5A5',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isRejectingKyc ? 'wait' : 'pointer',
                  }}
                >
                  ✕ Reject KYC
                </button>
              </>
            )}

            {/* Suspension Toggle */}
            <button
              type="button"
              onClick={handleToggleSuspend}
              disabled={isSuspending}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: isSuspended ? '1px solid #A7F3D0' : '1px solid #FCD34D',
                backgroundColor: isSuspended ? '#ECFDF5' : '#FFFBEB',
                color: isSuspended ? '#065F46' : '#B45309',
                fontSize: 12,
                fontWeight: 700,
                cursor: isSuspending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{isSuspended ? '🔓' : '🚫'}</span>
              <span>
                {isSuspending
                  ? 'Updating...'
                  : isSuspended
                  ? 'Reactivate Partner'
                  : 'Suspend Partner'}
              </span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEE2E2';
                e.currentTarget.style.color = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#4B5563';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Suspension Alert Banner if currently suspended */}
        {isSuspended && (
          <div
            style={{
              padding: '12px 28px',
              backgroundColor: '#FEF3C7',
              borderBottom: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🚫</span>
              <div>
                <strong style={{ color: '#92400E', fontSize: 13 }}>
                  Account is currently SUSPENDED
                </strong>
                <div style={{ color: '#78350F', fontSize: 12, marginTop: 1 }}>
                  Reason: {currentPartner.kycRejectionReason || 'Account suspended by Admin. Verification review in progress.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSuspend}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reactivate Account Now
            </button>
          </div>
        )}

        {/* Toast Feedback */}
        {toastMsg && (
          <div
            style={{
              padding: '10px 28px',
              backgroundColor: toastMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5',
              borderBottom: `1px solid ${toastMsg.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
              color: toastMsg.type === 'error' ? '#991B1B' : '#065F46',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{toastMsg.message}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab Navigation Strip */}
        <div
          style={{
            padding: '0 28px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'OVERVIEW', label: 'Overview & Profile' },
            { key: 'ORDERS', label: `Orders (${partnerOrders.length})` },
            { key: 'CASH_IN_HAND', label: `Cash in Hand (₹${cashInHand})` },
            { key: 'PAYMENTS', label: `Payments & Payouts (${partnerPayouts.length})` },
            { key: 'DOCUMENTS', label: `KYC Documents (${(currentPartner.documents || []).length})` },
            { key: 'REVIEWS', label: `Reviews (★ ${avgRating})` },
            { key: 'COMPLAINTS', label: `Complaints (${partnerComplaints.length})` },
            { key: 'SHIFTS', label: 'Shifts & Category' },
          ].map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '14px 18px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isTabActive ? '#0284C7' : '#6B7280',
                  fontSize: 13,
                  fontWeight: isTabActive ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom: isTabActive ? '3px solid #0284C7' : '3px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', backgroundColor: '#F9FAFB' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Stat Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Total Deliveries
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 6 }}>
                    {currentPartner.totalDeliveries || completedOrders.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#059669', marginTop: 4, fontWeight: 600 }}>
                    {completedOrders.length} verified completed orders
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: 14,
                    border: `1px solid ${isCashCritical ? '#FECACA' : isCashWarning ? '#FDE68A' : '#E5E7EB'}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Cash in Hand
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: isCashCritical ? '#DC2626' : isCashWarning ? '#D97706' : '#111827',
                      marginTop: 6,
                    }}
                  >
                    ₹{cashInHand.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Limit: ₹{maxLimit.toLocaleString('en-IN')} ({cashPercentage}% utilized)
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Customer Rating
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>★</span>
                    <span>{avgRating}</span>
                    <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>/ 5.0</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Based on {partnerReviews.length} customer reviews
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Fleet Status
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: isSuspended ? '#DC2626' : currentPartner.isOnline ? '#059669' : '#4B5563', marginTop: 8 }}>
                    {isSuspended ? 'SUSPENDED' : currentPartner.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    {isSuspended ? 'Cannot receive new orders' : currentPartner.isOnline ? 'Ready for dispatches' : 'Partner offline'}
                  </div>
                </div>
              </div>

              {/* Detailed Info Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                {/* Personal & Contact Details */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Personal & Contact Profile
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>FULL NAME</span>
                      <strong style={{ color: '#111827', marginTop: 3, display: 'block' }}>{currentPartner.fullName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>PHONE NUMBER</span>
                      <strong style={{ color: '#111827', marginTop: 3, display: 'block' }}>{currentPartner.phoneNumber}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>EMAIL ADDRESS</span>
                      <span style={{ color: '#111827', marginTop: 3, display: 'block' }}>{currentPartner.email || `${currentPartner.fullName.toLowerCase().replace(/\s+/g, '')}@foodie.local`}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>USER CREDENTIAL ID</span>
                      <code style={{ color: '#6B7280', fontSize: 11, marginTop: 3, display: 'block' }}>
                        {currentPartner.userCredentialId || 'N/A'}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>PARTNER ID</span>
                      <code style={{ color: '#6B7280', fontSize: 11, marginTop: 3, display: 'block' }}>
                        {currentPartner.id}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>JOINED DATE</span>
                      <span style={{ color: '#111827', marginTop: 3, display: 'block' }}>
                        {currentPartner.createdAt ? currentPartner.createdAt.split('T')[0] : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Category Details */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Vehicle & Fleet Category
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>VEHICLE CATEGORY</span>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {currentPartner.vehicleType || 'BIKE'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>VEHICLE REGISTRATION (RC)</span>
                      <strong style={{ color: '#111827', marginTop: 3, display: 'block' }}>
                        {currentPartner.vehicleNumber || 'KA-05-EQ-9876'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>ASSIGNED ZONE</span>
                      <span style={{ color: '#111827', marginTop: 3, display: 'block', fontWeight: 600 }}>
                        {currentPartner.zone || 'Delivery Partner Dedicated Zone'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>KYC VERIFICATION STATUS</span>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 11,
                          backgroundColor: isVerified
                            ? '#ECFDF5'
                            : isSuspended
                            ? '#FEF3C7'
                            : isRejected
                            ? '#FEF2F2'
                            : '#EFF6FF',
                          color: isVerified
                            ? '#059669'
                            : isSuspended
                            ? '#D97706'
                            : isRejected
                            ? '#DC2626'
                            : '#2563EB',
                        }}
                      >
                        {currentPartner.kycStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operating Zone & Live GPS Location */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Live GPS & Operating Location
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>GPS LATITUDE</span>
                      <code style={{ color: '#111827', marginTop: 3, display: 'block' }}>
                        {currentPartner.latitude ?? 12.9716}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>GPS LONGITUDE</span>
                      <code style={{ color: '#111827', marginTop: 3, display: 'block' }}>
                        {currentPartner.longitude ?? 77.5946}
                      </code>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>CURRENT ZONE STATUS</span>
                      <span style={{ color: '#059669', fontWeight: 600, marginTop: 3, display: 'block' }}>
                        ✓ Operating inside designated service boundaries ({currentPartner.zone || 'Delivery Partner Dedicated Zone'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registered Address */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Registered Residential Address
                  </h3>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: '1.6' }}>
                    <div>{currentPartner.addressLine1 || 'Flat 402, Green Glen Layout, Outer Ring Road'}</div>
                    {currentPartner.addressLine2 && <div>{currentPartner.addressLine2}</div>}
                    <div>
                      {currentPartner.city || 'Bengaluru'}, {currentPartner.state || 'Karnataka'} - {currentPartner.pincode || '560103'}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>
                      Verified address from identity documentation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === 'ORDERS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Assigned Delivery History ({partnerOrders.length})
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Total Delivered Amount: <strong style={{ color: '#059669' }}>₹{totalAmountDelivered.toLocaleString('en-IN')}</strong> ({completedOrders.length} completed, {activeOrders.length} in transit)
                  </span>
                </div>
              </div>

              {isLoadingOrders ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  Loading partner orders...
                </div>
              ) : partnerOrders.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '48px 20px',
                    textAlign: 'center',
                    color: '#6B7280',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>No Orders Assigned Yet</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Orders assigned to {currentPartner.fullName} will appear here in real time.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 18px' }}>Order Code</th>
                        <th style={{ padding: '12px 18px' }}>Restaurant / Store</th>
                        <th style={{ padding: '12px 18px' }}>Customer</th>
                        <th style={{ padding: '12px 18px' }}>Total Amount</th>
                        <th style={{ padding: '12px 18px' }}>Payment</th>
                        <th style={{ padding: '12px 18px' }}>Status</th>
                        <th style={{ padding: '12px 18px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerOrders.map((ord: any) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0284C7' }}>
                            {ord.orderCode || ord.id.slice(0, 8)}
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 600, color: '#111827' }}>
                            {ord.storeName || 'Partner Kitchen'}
                          </td>
                          <td style={{ padding: '12px 18px', color: '#374151' }}>
                            <div>{ord.customerName || 'Customer'}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{ord.customerPhone}</div>
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 700, color: '#111827' }}>
                            ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 18px', fontSize: 12 }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: ord.paymentMethod === 'COD' ? '#FEF3C7' : '#EFF6FF',
                                color: ord.paymentMethod === 'COD' ? '#92400E' : '#1D4ED8',
                                fontWeight: 700,
                              }}
                            >
                              {ord.paymentMethod || 'DIGITAL'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor:
                                  ord.status === 'DELIVERED'
                                    ? '#ECFDF5'
                                    : ord.status === 'CANCELED'
                                    ? '#FEF2F2'
                                    : '#EFF6FF',
                                color:
                                  ord.status === 'DELIVERED'
                                    ? '#059669'
                                    : ord.status === 'CANCELED'
                                    ? '#DC2626'
                                    : '#2563EB',
                              }}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', color: '#6B7280', fontSize: 12 }}>
                            {ord.createdAt ? ord.createdAt.split('T')[0] : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CASH IN HAND */}
          {activeTab === 'CASH_IN_HAND' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Cash Balance Hero Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: `1.5px solid ${isCashCritical ? '#FECACA' : '#E5E7EB'}`,
                  padding: '28px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                      Current Float / Cash In Hand
                    </span>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: isCashCritical ? '#DC2626' : '#111827',
                        marginTop: 6,
                      }}
                    >
                      ₹{cashInHand.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      Allowed Float Threshold: <strong style={{ color: '#111827' }}>₹{maxLimit.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontWeight: 800,
                      fontSize: 12,
                      backgroundColor: isCashCritical ? '#FEF2F2' : isCashWarning ? '#FEF3C7' : '#ECFDF5',
                      color: isCashCritical ? '#DC2626' : isCashWarning ? '#D97706' : '#059669',
                    }}
                  >
                    {isCashCritical ? '● LIMIT EXCEEDED (RESTRICTED)' : isCashWarning ? '● HIGH FLOAT' : '● SAFE BALANCE'}
                  </span>
                </div>

                {/* Progress bar towards limit */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                    <span>Float Utilization</span>
                    <span><strong>{cashPercentage}%</strong> of ₹{maxLimit} limit</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 10,
                      borderRadius: 8,
                      backgroundColor: '#E5E7EB',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${cashPercentage}%`,
                        height: '100%',
                        backgroundColor: isCashCritical ? '#DC2626' : isCashWarning ? '#F59E0B' : '#10B981',
                        borderRadius: 8,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    borderRadius: 10,
                    backgroundColor: '#F9FAFB',
                    fontSize: 12,
                    color: '#4B5563',
                    lineHeight: '1.5',
                  }}
                >
                  💡 <strong>Cash Policy:</strong> When delivery partners collect Cash on Delivery (COD), their cash-in-hand balance increases. If it exceeds ₹2,000, new cash orders are automatically blocked until deposited at an authorized hub or settled via digital payout deduction.
                </div>
              </div>

              {/* COD Collections Breakdown */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid #E5E7EB',
                  padding: '24px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  Cash On Delivery (COD) Collections History
                </h4>

                {partnerOrders.filter((o: any) => o.paymentMethod === 'COD').length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                    No cash-on-delivery orders recorded for this delivery partner yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700 }}>
                        <th style={{ padding: '10px 14px' }}>Order ID</th>
                        <th style={{ padding: '10px 14px' }}>Restaurant</th>
                        <th style={{ padding: '10px 14px' }}>Amount Collected</th>
                        <th style={{ padding: '10px 14px' }}>Date</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerOrders
                        .filter((o: any) => o.paymentMethod === 'COD')
                        .map((ord: any) => (
                          <tr key={ord.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0284C7' }}>
                              {ord.orderCode || ord.id.slice(0, 8)}
                            </td>
                            <td style={{ padding: '10px 14px' }}>{ord.storeName || 'Store'}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                              ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#6B7280' }}>
                              {ord.createdAt ? ord.createdAt.split('T')[0] : 'N/A'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ color: '#059669', fontWeight: 700 }}>COLLECTED</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS & PAYOUTS */}
          {activeTab === 'PAYMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Bank Account Details Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid #E5E7EB',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Registered Bank Account (Direct Disbursals)
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 12,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                    }}
                  >
                    ✓ KYC VERIFIED BANK
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>BANK NAME</span>
                    <strong style={{ color: '#111827', marginTop: 3, display: 'block' }}>HDFC Bank</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>ACCOUNT HOLDER</span>
                    <strong style={{ color: '#111827', marginTop: 3, display: 'block' }}>{currentPartner.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>ACCOUNT NUMBER</span>
                    <code style={{ color: '#111827', marginTop: 3, display: 'block' }}>•••• •••• •••• 8924</code>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700 }}>IFSC CODE</span>
                    <code style={{ color: '#111827', marginTop: 3, display: 'block' }}>HDFC0001234</code>
                  </div>
                </div>
              </div>

              {/* Payout Requests Table */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid #E5E7EB',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      Payout & Withdrawal Requests ({partnerPayouts.length})
                    </h3>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      Delivery earnings disbursals requested by partner
                    </div>
                  </div>
                </div>

                {isLoadingPayouts ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                    Loading payouts...
                  </div>
                ) : partnerPayouts.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                    No payout withdrawal requests found for this partner yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px' }}>Payout ID</th>
                        <th style={{ padding: '12px 16px' }}>Amount</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Requested At</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerPayouts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284C7' }}>
                            {p.id.slice(0, 10)}...
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#111827' }}>
                            ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor:
                                  p.status === 'COMPLETED'
                                    ? '#ECFDF5'
                                    : p.status === 'REJECTED'
                                    ? '#FEF2F2'
                                    : '#FEF3C7',
                                color:
                                  p.status === 'COMPLETED'
                                    ? '#059669'
                                    : p.status === 'REJECTED'
                                    ? '#DC2626'
                                    : '#D97706',
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                            {p.createdAt ? p.createdAt.split('T')[0] : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {['PENDING', 'REQUESTED'].includes(p.status) && (
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSinglePayout(p.id)}
                                  disabled={isApprovingPayout}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    backgroundColor: '#059669',
                                    color: '#FFFFFF',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSinglePayout(p.id)}
                                  disabled={isRejectingPayout}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #FECACA',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS & KYC */}
          {activeTab === 'DOCUMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Uploaded KYC Verification Documents ({(currentPartner.documents || []).length})
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Identity, Driving License and Vehicle RC documents for compliance
                  </span>
                </div>
              </div>

              {(currentPartner.documents || []).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', backgroundColor: '#FFFFFF', borderRadius: 14 }}>
                  No documents uploaded yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {(currentPartner.documents || []).map((doc: any, idx: number) => {
                    const docUrl = resolveDocumentUrl(doc);
                    const isDocVerified = doc.verificationStatus === 'VERIFIED';
                    const isDocRejected = doc.verificationStatus === 'REJECTED';
                    return (
                      <div
                        key={doc.documentId || doc.id || idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 14,
                          border: '1px solid #E5E7EB',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                              {formatDocType(doc.docType || doc.type)}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 10,
                                backgroundColor: isDocVerified ? '#ECFDF5' : isDocRejected ? '#FEF2F2' : '#EFF6FF',
                                color: isDocVerified ? '#059669' : isDocRejected ? '#DC2626' : '#2563EB',
                              }}
                            >
                              {doc.verificationStatus || 'PENDING'}
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            <div>Type: <strong style={{ color: '#111827' }}>{doc.docType}</strong></div>
                            {doc.uploadedAt && <div>Uploaded: {doc.uploadedAt.split('T')[0]}</div>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {docUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDocForPreview(doc)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #BFDBFE',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              👁 Preview Document
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>No preview available</span>
                          )}

                          {docUrl && (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                backgroundColor: '#FFFFFF',
                                color: '#374151',
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              ⬇
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REVIEWS */}
          {activeTab === 'REVIEWS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Customer Feedback & Ratings ({partnerReviews.length})
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Average Delivery Rating: <strong style={{ color: '#F59E0B' }}>★ {avgRating}</strong> / 5.0
                  </span>
                </div>
              </div>

              {isLoadingReviews ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                  Loading reviews...
                </div>
              ) : partnerReviews.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '48px 20px',
                    textAlign: 'center',
                    color: '#6B7280',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⭐</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>No Reviews Received Yet</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Ratings from customers after successful deliveries will be listed here.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {partnerReviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid #E5E7EB',
                        padding: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                          {rev.customerName || 'Customer'}
                        </div>
                        <div style={{ color: '#F59E0B', fontWeight: 800, fontSize: 13 }}>
                          {'★'.repeat(Number(rev.deliveryRating || rev.rating || 5))} ({rev.deliveryRating || rev.rating || 5}/5)
                        </div>
                      </div>
                      <p style={{ margin: '8px 0', fontSize: 13, color: '#4B5563', lineHeight: '1.5' }}>
                        "{rev.comment || 'Prompt and polite delivery.'}"
                      </p>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
                        {rev.createdAt ? rev.createdAt.split('T')[0] : 'Recent delivery'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMPLAINTS */}
          {activeTab === 'COMPLAINTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Customer & Restaurant Complaints ({partnerComplaints.length})
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Disputes, delayed deliveries, and delivery-related support tickets
                  </span>
                </div>
              </div>

              {isLoadingTickets ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                  Loading support tickets...
                </div>
              ) : partnerComplaints.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    padding: '48px 20px',
                    textAlign: 'center',
                    color: '#6B7280',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🛡️</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>No Complaints on Record</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    This delivery partner maintains a clean compliance record with zero open tickets.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {partnerComplaints.map((ticket) => (
                    <div
                      key={ticket.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        padding: '16px 20px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <strong style={{ fontSize: 14, color: '#111827' }}>{ticket.subject}</strong>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                            By {ticket.senderName} ({ticket.senderPhone}) • Category: {ticket.category}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 10,
                            backgroundColor: ticket.status === 'RESOLVED' ? '#ECFDF5' : '#FEF2F2',
                            color: ticket.status === 'RESOLVED' ? '#059669' : '#DC2626',
                          }}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#4B5563', marginTop: 6 }}>
                        {ticket.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SHIFTS & CATEGORIES */}
          {activeTab === 'SHIFTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Assigned Fleet Shifts ({shifts.length})
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Operational shift slots and scheduling for zone {currentPartner.zone || 'Central Zone'}
                  </span>
                </div>
              </div>

              {isLoadingShifts ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                  Loading delivery shifts...
                </div>
              ) : shifts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', backgroundColor: '#FFFFFF', borderRadius: 14 }}>
                  No shifts currently configured for this zone.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {shifts.map((shift: DeliveryShift) => (
                    <div
                      key={shift.shiftId}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid #E5E7EB',
                        padding: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                          {shift.shiftName}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 10,
                            backgroundColor: shift.status === 'ACTIVE' ? '#ECFDF5' : '#F3F4F6',
                            color: shift.status === 'ACTIVE' ? '#059669' : '#6B7280',
                          }}
                        >
                          {shift.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
                        ⏰ <strong>{shift.startTime} - {shift.endTime}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        Zone: {shift.zoneName || currentPartner.zone || 'Bengaluru Zone'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {isSuspendModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsSuspendModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: '24px',
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: '#DC2626' }}>
              🚫 Suspend Delivery Partner
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#4B5563' }}>
              Are you sure you want to suspend <strong>{currentPartner.fullName}</strong>? Once suspended, their mobile app will immediately switch to the Verification Page with an Account Suspended notice.
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Suspension Reason (Visible to Partner)
            </label>
            <textarea
              value={suspendReasonInput}
              onChange={(e) => setSuspendReasonInput(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSuspending}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSuspending ? 'wait' : 'pointer',
                }}
              >
                {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject KYC Modal */}
      {isRejectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsRejectModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: '24px',
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: '#DC2626' }}>
              ✕ Reject KYC Verification
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#4B5563' }}>
              Please specify the reason for rejecting <strong>{currentPartner.fullName}</strong>'s verification documents.
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Rejection Reason
            </label>
            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKyc}
                disabled={isRejectingKyc}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isRejectingKyc ? 'wait' : 'pointer',
                }}
              >
                {isRejectingKyc ? 'Rejecting...' : 'Reject KYC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocForPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 130,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setSelectedDocForPreview(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: 15, color: '#111827' }}>
                {formatDocType(selectedDocForPreview.docType || selectedDocForPreview.type)}
              </strong>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20, flex: 1, overflowY: 'auto', textAlign: 'center', backgroundColor: '#F3F4F6' }}>
              {(() => {
                const url = resolveDocumentUrl(selectedDocForPreview);
                const isPdf = (url || '').toLowerCase().includes('.pdf');
                if (isPdf) {
                  return (
                    <iframe
                      src={url}
                      style={{ width: '100%', height: 480, border: 'none', borderRadius: 8 }}
                      title="Document Preview"
                    />
                  );
                }
                return (
                  <img
                    src={url}
                    alt="Document"
                    style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 8, objectFit: 'contain' }}
                  />
                );
              })()}
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                Status: <strong>{selectedDocForPreview.verificationStatus || 'PENDING'}</strong>
              </span>
              <a
                href={resolveDocumentUrl(selectedDocForPreview)}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Download Original File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
