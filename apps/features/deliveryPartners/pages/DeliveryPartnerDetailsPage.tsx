'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'foodie-shared-web';
import {
  useGetAdminDeliveryPartnersQuery,
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
  useGetDeliveryPartnerBankDetailsQuery,
  useApproveBankDetailsMutation,
  useRejectBankDetailsMutation,
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
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: partnersData, isLoading } = useGetAdminDeliveryPartnersQuery({
    page: 0,
    size: 100,
  });

  const { data: bankData } = useGetDeliveryPartnerBankDetailsQuery(partnerId ?? '', {
    skip: !partnerId,
  });

  const [approveKyc, { isLoading: isApproving }] = useApproveDeliveryPartnerKycMutation();
  const [rejectKyc, { isLoading: isRejecting }] = useRejectDeliveryPartnerKycMutation();
  const [approveBank, { isLoading: isApprovingBank }] = useApproveBankDetailsMutation();
  const [rejectBank, { isLoading: isRejectingBank }] = useRejectBankDetailsMutation();

  const partner: AdminDeliveryPartner | undefined = partnersData?.items?.find(
    (p: AdminDeliveryPartner) => p.id === partnerId
  );

  const bankDetails = bankData || partner?.bankDetails;

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

  const handleApproveBank = async () => {
    if (!partner) return;
    try {
      await approveBank(partner.id).unwrap();
      setToastMsg({ type: 'success', message: `${partner.fullName}'s bank details have been verified.` });
    } catch {
      setToastMsg({ type: 'error', message: 'Failed to verify bank details.' });
    }
  };

  const handleRejectBank = async () => {
    if (!partner) return;
    try {
      await rejectBank({ partnerId: partner.id, reason: 'Bank account verification failed.' }).unwrap();
      setToastMsg({ type: 'success', message: `${partner.fullName}'s bank details have been rejected.` });
    } catch {
      setToastMsg({ type: 'error', message: 'Failed to reject bank details.' });
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
            {partner.documents.map((doc, docIdx) => (
              <div
                key={doc.id ? `doc-${doc.id}` : `doc-${doc.docType || 'doc'}-${docIdx}`}
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

        {/* Bank Account Details Section */}
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', color: tokens.color.textPrimary }}>
          Bank Account Details
        </h3>
        {bankDetails ? (
          <div
            style={{
              borderRadius: '12px',
              border: `1px solid ${tokens.color.border}`,
              backgroundColor: tokens.color.background,
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: tokens.color.textPrimary }}>
                  🏦 {bankDetails.bankName} {bankDetails.branchName ? `(${bankDetails.branchName})` : ''}
                </div>
                <div style={{ fontSize: '12px', color: tokens.color.textSecondary, marginTop: '2px' }}>
                  Account Holder: {bankDetails.accountHolderName} • Type: {bankDetails.accountType || 'SAVINGS'}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor:
                    bankDetails.verificationStatus === 'VERIFIED'
                      ? '#ECFDF5'
                      : bankDetails.verificationStatus === 'REJECTED'
                      ? '#FEF2F2'
                      : '#FEF3C7',
                  color:
                    bankDetails.verificationStatus === 'VERIFIED'
                      ? '#059669'
                      : bankDetails.verificationStatus === 'REJECTED'
                      ? '#DC2626'
                      : '#D97706',
                }}
              >
                {bankDetails.verificationStatus}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '13px',
                paddingTop: '12px',
                borderTop: `1px solid ${tokens.color.border}`,
              }}
            >
              <div>
                <span style={{ color: tokens.color.textSecondary }}>Account Number: </span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {showFullAccount
                    ? bankDetails.accountNumber
                    : (bankDetails.maskedAccountNumber || `•••• •••• ${bankDetails.accountNumber.slice(-4)}`)}
                </span>
                <button
                  onClick={() => setShowFullAccount(!showFullAccount)}
                  style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    color: tokens.color.accent,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {showFullAccount ? 'Hide' : 'Reveal'}
                </button>
              </div>

              <div>
                <span style={{ color: tokens.color.textSecondary }}>IFSC Code: </span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{bankDetails.ifscCode}</span>
              </div>

              {bankDetails.updatedAt && (
                <div>
                  <span style={{ color: tokens.color.textSecondary }}>Submitted: </span>
                  <span style={{ fontWeight: 500 }}>{new Date(bankDetails.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {bankDetails.verificationStatus === 'PENDING' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={handleApproveBank}
                  disabled={isApprovingBank}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isApprovingBank ? 'Approving...' : '✓ Approve Bank Details'}
                </button>
                <button
                  onClick={handleRejectBank}
                  disabled={isRejectingBank}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isRejectingBank ? 'Rejecting...' : '✗ Reject Bank Details'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: tokens.color.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            Bank details have not been submitted yet.
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
