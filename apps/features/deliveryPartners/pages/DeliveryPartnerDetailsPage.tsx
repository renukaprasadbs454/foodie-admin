'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'foodie-shared-web';
import {
  useGetAdminDeliveryPartnersQuery,
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
} from '@/api/endpoints/deliveryPartnersApi';
import type { AdminDeliveryPartner } from '../types';

interface DeliveryPartnerDetailsPageProps {
  partnerId?: string;
}

export function DeliveryPartnerDetailsPage({ partnerId }: DeliveryPartnerDetailsPageProps) {
  const { tokens } = useTheme();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState('Documents incomplete or unreadable');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: partnersData, isLoading } = useGetAdminDeliveryPartnersQuery({
    page: 0,
    size: 100,
  });

  const [approveKyc, { isLoading: isApproving }] = useApproveDeliveryPartnerKycMutation();
  const [rejectKyc, { isLoading: isRejecting }] = useRejectDeliveryPartnerKycMutation();

  const partner: AdminDeliveryPartner | undefined = partnersData?.items?.find(
    (p: AdminDeliveryPartner) => p.id === partnerId
  );

  const handleApprove = async () => {
    if (!partner) return;
    try {
      await approveKyc(partner.id).unwrap();
      setToastMsg({ type: 'success', message: `${partner.fullName}'s KYC has been approved.` });
    } catch {
      setToastMsg({ type: 'error', message: 'Failed to approve KYC.' });
    }
  };

  const handleReject = async () => {
    if (!partner) return;
    try {
      await rejectKyc({ partnerId: partner.id, reason: rejectReason }).unwrap();
      setShowRejectModal(false);
      setToastMsg({ type: 'success', message: `${partner.fullName}'s KYC has been rejected.` });
    } catch {
      setToastMsg({ type: 'error', message: 'Failed to reject KYC.' });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: tokens.color.textSecondary }}>
        Loading partner details...
      </div>
    );
  }

  if (!partner) {
    return (
      <div style={{ padding: '32px' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.color.accent,
            cursor: 'pointer',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          ← Back to Delivery Partners
        </button>
        <div style={{ color: tokens.color.textSecondary }}>Delivery partner not found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {toastMsg && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            backgroundColor: toastMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: toastMsg.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${toastMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          {toastMsg.message}
        </div>
      )}

      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          color: tokens.color.accent,
          cursor: 'pointer',
          fontWeight: 600,
          marginBottom: '20px',
        }}
      >
        ← Back to Delivery Partners
      </button>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: '12px',
          border: `1px solid ${tokens.color.border}`,
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: tokens.color.textPrimary }}>
              {partner.fullName}
            </h1>
            <div style={{ color: tokens.color.textSecondary, fontSize: '14px', marginTop: '4px' }}>
              {partner.phoneNumber} • {partner.zone}
            </div>
          </div>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor:
                partner.kycStatus === 'VERIFIED'
                  ? '#ECFDF5'
                  : partner.kycStatus === 'REJECTED'
                  ? '#FEF2F2'
                  : '#FFFBEB',
              color:
                partner.kycStatus === 'VERIFIED'
                  ? '#059669'
                  : partner.kycStatus === 'REJECTED'
                  ? '#DC2626'
                  : '#D97706',
            }}
          >
            KYC: {partner.kycStatus}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: tokens.color.background }}>
            <div style={{ fontSize: '12px', color: tokens.color.textSecondary }}>Vehicle</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.color.textPrimary, marginTop: '4px' }}>
              {partner.vehicleType} ({partner.vehicleNumber || 'No plate'})
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: tokens.color.background }}>
            <div style={{ fontSize: '12px', color: tokens.color.textSecondary }}>Total Deliveries</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.color.textPrimary, marginTop: '4px' }}>
              {partner.totalDeliveries}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: tokens.color.background }}>
            <div style={{ fontSize: '12px', color: tokens.color.textSecondary }}>Cash in Hand</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.color.textPrimary, marginTop: '4px' }}>
              ₹{Number(partner.cashInHand).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: tokens.color.background }}>
            <div style={{ fontSize: '12px', color: tokens.color.textSecondary }}>Status</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: partner.isOnline ? '#059669' : '#6B7280', marginTop: '4px' }}>
              {partner.isOnline ? '● Online' : '○ Offline'}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: tokens.color.textPrimary }}>
          KYC Documents ({partner.documents?.length || 0})
        </h3>
        {partner.documents && partner.documents.length > 0 ? (
          <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
            {partner.documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${tokens.color.border}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: tokens.color.textPrimary }}>
                    {doc.docType}
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.color.textSecondary }}>
                    Status: {doc.verificationStatus}
                  </div>
                </div>
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: tokens.color.accent, fontWeight: 600 }}
                  >
                    View Document →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: tokens.color.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            No documents uploaded yet.
          </div>
        )}

        {partner.kycStatus === 'PENDING' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isApproving ? 'Approving...' : '✓ Approve KYC'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isRejecting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✗ Reject KYC
            </button>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: tokens.color.surface,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '450px',
              width: '90%',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: tokens.color.textPrimary }}>
              Reject Delivery Partner KYC
            </h3>
            <p style={{ color: tokens.color.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
              Please provide a reason for rejecting {partner.fullName}&apos;s KYC.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${tokens.color.border}`,
                marginBottom: '16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'none',
                  border: `1px solid ${tokens.color.border}`,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
