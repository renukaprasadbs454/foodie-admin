'use client';

import React, { useState } from 'react';
import {
  useGetOnlineDeliveryPartnersQuery,
  useAssignDeliveryPartnerMutation,
  type OnlineDeliveryPartner,
} from '@/api/endpoints/ordersApi';

type Props = {
  open: boolean;
  orderId: string;
  orderNumber?: string;
  currentAssignedPartnerName?: string | null;
  onClose: () => void;
  onAssigned: (partner: OnlineDeliveryPartner) => void;
};

export function AssignDeliveryPartnerModal({
  open,
  orderId,
  orderNumber,
  currentAssignedPartnerName,
  onClose,
  onAssigned,
}: Props) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: partners = [],
    isLoading,
    isError,
    refetch,
  } = useGetOnlineDeliveryPartnersQuery(undefined, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  });

  const [assignPartner, assignState] = useAssignDeliveryPartnerMutation();

  if (!open) return null;

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  const handleAssign = async () => {
    if (!selectedPartnerId) {
      setErrorMessage('Please select an online delivery partner from the dropdown.');
      return;
    }
    setErrorMessage(null);

    try {
      await assignPartner({
        orderId,
        deliveryPartnerId: selectedPartnerId,
      }).unwrap();

      const chosen = partners.find((p) => p.id === selectedPartnerId);
      if (chosen) {
        onAssigned(chosen);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'Failed to assign delivery partner. Please try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-dp-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 480,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)',
          }}
        >
          <div>
            <h2
              id="assign-dp-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Assign Delivery Partner
            </h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Order {orderNumber ? `#${orderNumber}` : orderId}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: '#F3F4F6',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563',
              fontSize: 16,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {currentAssignedPartnerName ? (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 12,
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              
              <span>
                Currently assigned to: <strong>{currentAssignedPartnerName}</strong>. Selecting a
                new partner will reassign this order.
              </span>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 12,
                color: '#991B1B',
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="delivery-partner-select"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              Select Online Delivery Partner
            </label>

            {isLoading ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: 'center',
                }}
              >
                Fetching online delivery partners...
              </div>
            ) : isError ? (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: 10,
                  border: '1px solid #FCA5A5',
                  fontSize: 12,
                  color: '#991B1B',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Failed to load delivery partners.</span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : partners.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#FFFBEB',
                  borderRadius: 12,
                  border: '1px solid #FDE68A',
                  fontSize: 13,
                  color: '#92400E',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No Delivery Partners Online</div>
                <div style={{ fontSize: 12, color: '#B45309' }}>
                  There are currently no active delivery partners available for instant assignment.
                </div>
              </div>
            ) : (
              <select
                id="delivery-partner-select"
                aria-label="Delivery Partner Selection"
                value={selectedPartnerId}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  setErrorMessage(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #D1D5DB',
                  fontSize: 13,
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="">— Select an Online Delivery Partner —</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} — {partner.phoneNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Partner Highlight Card */}
          {selectedPartner ? (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                  {selectedPartner.name}
                </div>
                <div style={{ fontSize: 12, color: '#15803D', marginTop: 2 }}>
                  Phone: {selectedPartner.phoneNumber}
                </div>
                {selectedPartner.zone ? (
                  <div style={{ fontSize: 11, color: '#4ADE80', marginTop: 2 }}>
                    Zone: {selectedPartner.zone}
                  </div>
                ) : null}
              </div>
              <span
                style={{
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#22C55E',
                  }}
                />
                ONLINE
              </span>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={assignState.isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedPartnerId || assignState.isLoading}
            style={{
              padding: '8px 20px',
              backgroundColor: selectedPartnerId && !assignState.isLoading ? '#10B981' : '#9CA3AF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedPartnerId && !assignState.isLoading ? 'pointer' : 'not-allowed',
              boxShadow:
                selectedPartnerId && !assignState.isLoading
                  ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                  : 'none',
            }}
          >
            {assignState.isLoading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

