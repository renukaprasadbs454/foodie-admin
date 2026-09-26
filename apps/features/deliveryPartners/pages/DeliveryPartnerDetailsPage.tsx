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
          color: '#0284C7',
          cursor: 'pointer',
          fontWeight: 700,
          marginBottom: '20px',
        }}
      >
        ← Back to Delivery Partners
      </button>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #BAE6FD',
          padding: '24px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0369A1' }}>
              {partner.fullName}
            </h1>
            <div style={{ color: '#0284C7', fontSize: '14px', marginTop: '4px' }}>
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
                  ? '#F0F9FF'
                  : partner.kycStatus === 'REJECTED'
                  ? '#F0F9FF'
                  : '#E0F2FE',
              color:
                partner.kycStatus === 'VERIFIED'
                  ? '#0369A1'
                  : partner.kycStatus === 'REJECTED'
                  ? '#0284C7'
                  : '#0369A1',
              border: partner.kycStatus === 'PENDING' ? '1px solid #38BDF8' : '1px solid #BAE6FD',
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
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600 }}>Vehicle</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0369A1', marginTop: '4px' }}>
              {partner.vehicleType} ({partner.vehicleNumber || 'No plate'})
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600 }}>Total Deliveries</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0369A1', marginTop: '4px' }}>
              {partner.totalDeliveries}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600 }}>Cash in Hand</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0369A1', marginTop: '4px' }}>
              ₹{Number(partner.cashInHand).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600 }}>Status</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: partner.isOnline ? '#0284C7' : '#94A3B8', marginTop: '4px' }}>
              {partner.isOnline ? '● Online' : '○ Offline'}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#0369A1' }}>
          KYC Documents ({partner.documents?.length || 0})
        </h3>
        {partner.documents && partner.documents.length > 0 ? (
          <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
            {partner.documents.map((doc, docIdx) => (
              <div
                key={doc.id ? `doc-${doc.id}` : `doc-${doc.docType || 'doc'}-${docIdx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #BAE6FD',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0369A1' }}>
                    {doc.docType}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284C7' }}>
                    Status: {doc.verificationStatus}
                  </div>
                </div>
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: '#0284C7', fontWeight: 700 }}
                  >
                    View Document →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#0284C7', fontSize: '14px', marginBottom: '24px' }}>
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
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                cursor: isApproving ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
                backgroundColor: '#F0F9FF',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
                fontWeight: 700,
                cursor: isRejecting ? 'wait' : 'pointer',
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
            backgroundColor: 'rgba(8, 47, 73, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '450px',
              width: '90%',
              border: '1px solid #BAE6FD',
              boxShadow: '0 20px 40px rgba(2, 132, 199, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0369A1' }}>
              Reject Delivery Partner KYC
            </h3>
            <p style={{ color: '#0284C7', fontSize: '14px', marginBottom: '16px' }}>
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
                border: '1px solid #BAE6FD',
                marginBottom: '16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                color: '#0369A1',
                backgroundColor: '#FFFFFF',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#F0F9FF',
                  color: '#0369A1',
                  border: '1px solid #BAE6FD',
                  cursor: 'pointer',
                  fontWeight: 600,
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
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: isRejecting ? 'wait' : 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
