'use client';

import React, { useEffect, useState } from 'react';
import {
  useGetCustomerDetailsQuery,
  useUpdateCustomerStatusMutation,
} from '@/api/endpoints/customersApi';
import type { CustomerAddressItem, CustomerOrderItem } from '../types/customerTypes';

export interface CustomerFullDetailsDrawerProps {
  open: boolean;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  onClose: () => void;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'C';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CustomerFullDetailsDrawer({
  open,
  customerId,
  customerName,
  customerPhone,
  onClose,
}: CustomerFullDetailsDrawerProps) {
  // Determine the most specific identifier available for dynamic lookup
  const lookupKey = (customerId && customerId.trim())
    ? customerId.trim()
    : (customerPhone && customerPhone.trim())
    ? customerPhone.trim()
    : (customerName && customerName.trim())
    ? customerName.trim()
    : '';

  const {
    data: detailData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetCustomerDetailsQuery(lookupKey, {
    skip: !open || !lookupKey,
    refetchOnMountOrArgChange: true,
  });

  const [updateCustomerStatus, { isLoading: isUpdatingStatus }] = useUpdateCustomerStatusMutation();
  const [statusActionMsg, setStatusActionMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ADDRESSES' | 'ORDERS'>('OVERVIEW');
  const [imageFailed, setImageFailed] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setImageFailed(false);
    } else {
      document.body.style.overflow = '';
      setStatusActionMsg(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const rawCustomer = (detailData as any)?.data?.customer || (detailData as any)?.customer || (detailData as any)?.data || detailData;
  const rawAddresses: CustomerAddressItem[] = (detailData as any)?.data?.addresses || (detailData as any)?.addresses || [];
  const rawOrders: CustomerOrderItem[] = (detailData as any)?.data?.orders || (detailData as any)?.orders || [];

  const displayName = rawCustomer?.fullName || rawCustomer?.name || customerName || 'Customer';
  const displayPhone = rawCustomer?.phoneNumber || rawCustomer?.phone || customerPhone || 'Not available';
  const displayEmail = rawCustomer?.email || 'Not available';
  const rawStatus = String(rawCustomer?.accountStatus || rawCustomer?.status || 'ACTIVE').toUpperCase();
  const isActive = rawStatus === 'ACTIVE';

  // Dynamic values from DB: if no data show zero
  const walletBalance = Number(rawCustomer?.walletBalance ?? rawCustomer?.wallet ?? 0).toFixed(2);
  const totalOrders = rawCustomer?.totalOrderCount ?? rawCustomer?.totalOrders ?? (Array.isArray(rawOrders) ? rawOrders.length : 0);
  const totalSpend = Number(rawCustomer?.totalSpend ?? 0).toFixed(2);
  const loyaltyTier = String(rawCustomer?.loyaltyTier || 'STANDARD').toUpperCase();

  // Dynamic profile photo check: only display if present in DB and not a static mock URL
  const rawPhoto = rawCustomer?.profilePhoto || rawCustomer?.avatarUrl || null;
  const photoUrl = (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && !rawPhoto.includes('unsplash.com'))
    ? rawPhoto.trim()
    : null;

  const handleToggleStatus = async () => {
    if (!rawCustomer?.id) return;
    const newStatus = isActive ? 'SUSPENDED' : 'ACTIVE';
    try {
      setStatusActionMsg(null);
      await updateCustomerStatus({
        id: rawCustomer.id,
        accountStatus: newStatus,
        reason: isActive ? 'Account blocked by Super Admin from Orders view' : 'Account reactivated by Super Admin',
      }).unwrap();
      setStatusActionMsg(`Account successfully ${newStatus === 'ACTIVE' ? 'activated' : 'blocked'}.`);
      refetch();
    } catch (err: any) {
      setStatusActionMsg(`Failed to update status: ${err?.message || 'Server error'}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Dark Backdrop (Click to Close) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Centered Modal Overlay Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 51,
          animation: 'modalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalScaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
              Customer Full Details
            </h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Live customer profile and address book from database
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer details drawer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#4B5563',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#4B5563';
            }}
          >
            &times;
          </button>
        </div>

        {/* Status Toast */}
        {statusActionMsg && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: statusActionMsg.includes('Failed') ? '#FEF2F2' : '#ECFDF5',
              borderBottom: `1px solid ${statusActionMsg.includes('Failed') ? '#FECACA' : '#A7F3D0'}`,
              color: statusActionMsg.includes('Failed') ? '#991B1B' : '#065F46',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{statusActionMsg}</span>
            <button
              onClick={() => setStatusActionMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid #E5E7EB',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>Loading customer profile...</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Querying database for {lookupKey}</div>
            </div>
          ) : isError && !rawCustomer?.id ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: '#FEF2F2',
                borderRadius: 14,
                border: '1px solid #FEE2E2',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: '#991B1B' }}>
                Unable to load customer details
              </div>
              <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 4, maxWidth: 360, margin: '6px auto 16px' }}>
                Could not retrieve records for <strong>{lookupKey}</strong>. The server may be unreachable.
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Profile Hero Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 16,
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Dynamic Avatar: Show DB image if exists; otherwise initials avatar */}
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: 22,
                      flexShrink: 0,
                      border: '2px solid #E5E7EB',
                      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)',
                    }}
                  >
                    {photoUrl && !imageFailed ? (
                      <img
                        src={photoUrl}
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImageFailed(true)}
                      />
                    ) : (
                      <span>{getInitials(displayName)}</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 19,
                          fontWeight: 700,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayName}
                      </h3>
                      {/* Active / Blocked Status Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 9999,
                          backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                          color: isActive ? '#15803D' : '#B91C1C',
                          border: `1px solid ${isActive ? '#86EFAC' : '#FCA5A5'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#16A34A' : '#DC2626',
                          }}
                        />
                        {isActive ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </div>

                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        <span style={{ color: '#6B7280', marginRight: 6 }}>Phone:</span>
                        <a
                          href={`tel:${displayPhone}`}
                          style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {displayPhone}
                        </a>
                      </div>
                      <div style={{ fontSize: 12, color: '#4B5563' }}>
                        <span style={{ color: '#6B7280', marginRight: 6 }}>Email:</span>
                        <a
                          href={`mailto:${displayEmail}`}
                          style={{ color: '#4B5563', textDecoration: 'none' }}
                        >
                          {displayEmail}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Actions Bar */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        textTransform: 'uppercase',
                      }}
                    >
                      {loyaltyTier} MEMBER
                    </span>
                    {rawCustomer?.id && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          color: '#6B7280',
                          backgroundColor: '#F9FAFB',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        ID: {rawCustomer.id.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {rawCustomer?.id && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={handleToggleStatus}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                        border: '1px solid',
                        backgroundColor: isActive ? '#FEF2F2' : '#ECFDF5',
                        borderColor: isActive ? '#FECACA' : '#A7F3D0',
                        color: isActive ? '#DC2626' : '#059669',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isUpdatingStatus
                        ? 'Updating...'
                        : isActive
                        ? 'Block Customer'
                        : 'Activate Account'}
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Metric Cards Grid - Plain Text Labels Without Emojis */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {/* 1. Wallet Balance */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    WALLET BALANCE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                    ₹{walletBalance}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                    Instant refund and cashback balance
                  </div>
                </div>

                {/* 2. Total Orders */}
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL ORDERS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1D4ED8', marginTop: 4 }}>
                    {totalOrders}
                  </div>
                  <div style={{ fontSize: 11, color: '#2563EB', marginTop: 2 }}>
                    Lifetime completed orders
                  </div>
                </div>

                {/* 3. Total Spend */}
                <div
                  style={{
                    backgroundColor: '#FAF5FF',
                    border: '1px solid #E9D5FF',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL SPEND
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7E22CE', marginTop: 4 }}>
                    ₹{totalSpend}
                  </div>
                  <div style={{ fontSize: 11, color: '#9333EA', marginTop: 2 }}>
                    Gross GMV contribution
                  </div>
                </div>

                {/* 4. Account Status */}
                <div
                  style={{
                    backgroundColor: isActive ? '#F8FAFC' : '#FEF2F2',
                    border: `1px solid ${isActive ? '#E2E8F0' : '#FECACA'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ACCOUNT STATUS
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: isActive ? '#059669' : '#DC2626',
                      marginTop: 4,
                    }}
                  >
                    {isActive ? 'ACTIVE' : 'BLOCKED'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {isActive ? 'Permitted to place orders' : 'Suspended from checkout'}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  borderBottom: '1px solid #E5E7EB',
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: 13,
                    fontWeight: activeTab === 'OVERVIEW' ? 700 : 500,
                    color: activeTab === 'OVERVIEW' ? '#059669' : '#6B7280',
                    borderBottom: `2px solid ${activeTab === 'OVERVIEW' ? '#059669' : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  Overview & Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ADDRESSES')}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: 13,
                    fontWeight: activeTab === 'ADDRESSES' ? 700 : 500,
                    color: activeTab === 'ADDRESSES' ? '#059669' : '#6B7280',
                    borderBottom: `2px solid ${activeTab === 'ADDRESSES' ? '#059669' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Saved Addresses</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 9999,
                      backgroundColor: activeTab === 'ADDRESSES' ? '#D1FAE5' : '#F3F4F6',
                      color: activeTab === 'ADDRESSES' ? '#065F46' : '#4B5563',
                    }}
                  >
                    {rawAddresses.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ORDERS')}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: 13,
                    fontWeight: activeTab === 'ORDERS' ? 700 : 500,
                    color: activeTab === 'ORDERS' ? '#059669' : '#6B7280',
                    borderBottom: `2px solid ${activeTab === 'ORDERS' ? '#059669' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Orders</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 9999,
                      backgroundColor: activeTab === 'ORDERS' ? '#D1FAE5' : '#F3F4F6',
                      color: activeTab === 'ORDERS' ? '#065F46' : '#4B5563',
                    }}
                  >
                    {rawOrders.length}
                  </span>
                </button>
              </div>

              {/* Tab 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Customer Information Table */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      ACCOUNT INFORMATION
                    </div>
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                        <span style={{ color: '#6B7280' }}>Full Name</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{displayName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                        <span style={{ color: '#6B7280' }}>Mobile Phone</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{displayPhone}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                        <span style={{ color: '#6B7280' }}>Email Address</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{displayEmail}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                        <span style={{ color: '#6B7280' }}>Default Address</span>
                        <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: 260 }}>
                          {rawAddresses.find(a => a.isDefault)?.streetAddress || rawAddresses[0]?.streetAddress || 'None configured'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                        <span style={{ color: '#6B7280' }}>Member Since</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>
                          {rawCustomer?.joinedDate || 'Recent Member'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6B7280' }}>Cash on Delivery</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: rawCustomer?.isCodDisabled ? '#DC2626' : '#16A34A',
                          }}
                        >
                          {rawCustomer?.isCodDisabled ? 'Disabled' : 'Allowed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Saved Address Preview */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        Primary Delivery Location
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ADDRESSES')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#059669',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        View all ({rawAddresses.length}) &rarr;
                      </button>
                    </div>

                    {rawAddresses.length > 0 ? (
                      <div
                        style={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: 8,
                          padding: '12px 14px',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                            {rawAddresses[0].title || 'Home'}
                          </span>
                          {rawAddresses[0].isDefault && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                              }}
                            >
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>
                          {rawAddresses[0].apartment ? `${rawAddresses[0].apartment}, ` : ''}
                          {rawAddresses[0].streetAddress}
                          {rawAddresses[0].landmark ? `, Near ${rawAddresses[0].landmark}` : ''}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                          {rawAddresses[0].city}{rawAddresses[0].state ? `, ${rawAddresses[0].state}` : ''} {rawAddresses[0].postalCode}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                        No delivery address recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: ALL SAVED ADDRESSES */}
              {activeTab === 'ADDRESSES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                    All saved addresses associated with this customer profile in backend database:
                  </div>

                  {rawAddresses.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderRadius: 12,
                        border: '1px dashed #D1D5DB',
                        color: '#6B7280',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>
                        No Saved Addresses Found
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        The customer has not saved any address entries in their account.
                      </div>
                    </div>
                  ) : (
                    rawAddresses.map((addr, idx) => (
                      <div
                        key={addr.id || `addr-${idx}`}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: `1px solid ${addr.isDefault ? '#86EFAC' : '#E5E7EB'}`,
                          borderRadius: 12,
                          padding: '14px 16px',
                          boxShadow: addr.isDefault ? '0 0 0 1px #86EFAC' : 'none',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                            {addr.title || 'Saved Address'}
                          </span>
                          {addr.isDefault && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: 9999,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                              }}
                            >
                              DEFAULT
                            </span>
                          )}
                        </div>

                        {addr.name && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
                            Recipient: {addr.name} {addr.phone ? `(${addr.phone})` : ''}
                          </div>
                        )}

                        <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.5 }}>
                          {addr.apartment ? `${addr.apartment}, ` : ''}
                          {addr.streetAddress}
                          {addr.landmark ? `, Near ${addr.landmark}` : ''}
                        </div>

                        <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4, fontWeight: 500 }}>
                          {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode ? `- ${addr.postalCode}` : ''}
                        </div>

                        {(addr.latitude != null && addr.longitude != null) && (
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF', marginTop: 6 }}>
                            Coordinates: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: ORDERS */}
              {activeTab === 'ORDERS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                    Order history for this customer:
                  </div>

                  {rawOrders.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderRadius: 12,
                        border: '1px dashed #D1D5DB',
                        color: '#6B7280',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>
                        No Orders Placed Yet
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        This customer currently has no recorded orders in the database.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {rawOrders.map((ord) => (
                        <div
                          key={ord.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: 10,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#2563EB', fontFamily: 'monospace' }}>
                                #{ord.orderNumber || ord.id.slice(0, 8)}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: ord.status === 'DELIVERED' ? '#DCFCE7' : ord.status === 'CANCELLED' ? '#FEE2E2' : '#EFF6FF',
                                  color: ord.status === 'DELIVERED' ? '#15803D' : ord.status === 'CANCELLED' ? '#B91C1C' : '#1D4ED8',
                                }}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>
                              {ord.restaurantName || 'Restaurant'}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                              {ord.createdAt ? ord.createdAt.slice(0, 10) : 'Recent'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                              ₹{typeof ord.totalAmount === 'number' ? ord.totalAmount.toFixed(2) : ord.totalAmount}
                            </div>
                            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                              {ord.paymentMethod || 'Online'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {rawCustomer?.id ? `Customer ID: ${rawCustomer.id}` : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
