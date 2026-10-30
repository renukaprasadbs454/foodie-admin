'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useTheme,
  useConnectivity,
  Text,
  Toast,
} from 'foodie-shared-web';
import {
  useGetCustomerDetailsQuery,
  useUpdateCustomerStatusMutation,
  useUpdateCustomerCodMutation,
  useDeleteCustomerMutation,
} from '@/api/endpoints/customersApi';
import { formatMoneyInr } from '../../analytics/types';
import { calculateCustomerLtvBadge } from '../types/customerTypes';

type Props = {
  customerId: string;
};

type ActiveTab = 'ORDERS' | 'PAYMENTS' | 'COMPLAINTS' | 'ADDRESSES' | 'REVIEWS' | 'CONTROLS';

export function CustomerDetailsPage({ customerId }: Props) {
  const router = useRouter();
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ORDERS');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState(false);

  // Modals state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  // Query and Mutations
  const {
    data: detailData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetCustomerDetailsQuery(customerId, {
    skip: !customerId,
    refetchOnFocus: true,
  });

  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateCustomerStatusMutation();
  const [updateCod, { isLoading: isUpdatingCod }] = useUpdateCustomerCodMutation();
  const [deleteCustomer, { isLoading: isDeletingCustomer }] = useDeleteCustomerMutation();

  const customer = detailData?.customer;
  const addresses = detailData?.addresses || [];
  const orders = detailData?.orders || [];
  const payments = detailData?.payments || [];
  const complaints = detailData?.complaints || [];
  const reviews = detailData?.reviews || [];

  const handleCopyId = () => {
    if (!customer?.id) return;
    navigator.clipboard.writeText(customer.id);
    setCopiedId(true);
    setToast({ message: 'Customer ID copied to clipboard', variant: 'info' });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleToggleCod = async () => {
    if (!customer) return;
    const targetCodDisabled = !customer.isCodDisabled;
    try {
      await updateCod({
        id: customer.id,
        isCodDisabled: targetCodDisabled,
      }).unwrap();
      setToast({
        message: targetCodDisabled
          ? 'Cash on Delivery (COD) disabled for this customer.'
          : 'Cash on Delivery (COD) enabled for this customer.',
        variant: 'success',
      });
      void refetch();
    } catch (err: any) {
      setToast({
        message: err?.data?.message || err?.message || 'Failed to update COD permission.',
        variant: 'error',
      });
    }
  };

  const handleOpenSuspendModal = () => {
    setSuspendReason('');
    setSuspendError(null);
    setSuspendModalOpen(true);
  };

  const handleConfirmStatusChange = async (targetStatus: 'ACTIVE' | 'SUSPENDED') => {
    if (!customer) return;

    if (targetStatus === 'SUSPENDED') {
      if (!suspendReason.trim() || suspendReason.trim().length < 3) {
        setSuspendError('A valid suspension reason is mandatory (minimum 3 characters).');
        return;
      }
    }

    try {
      await updateStatus({
        id: customer.id,
        accountStatus: targetStatus,
        reason: targetStatus === 'SUSPENDED' ? suspendReason.trim() : undefined,
      }).unwrap();

      setSuspendModalOpen(false);
      setToast({
        message: targetStatus === 'SUSPENDED'
          ? `Customer account suspended: ${suspendReason.trim()}`
          : 'Customer account re-activated successfully.',
        variant: 'success',
      });
      void refetch();
    } catch (err: any) {
      setSuspendError(err?.data?.message || err?.message || 'Failed to update customer account status.');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm permanent purging.');
      return;
    }

    try {
      await deleteCustomer({ id: customer.id }).unwrap();
      setDeleteModalOpen(false);
      setToast({
        message: 'Customer account and personal data permanently purged.',
        variant: 'success',
      });
      setTimeout(() => {
        router.push('/customers');
      }, 1200);
    } catch (err: any) {
      setDeleteError(err?.data?.message || err?.message || 'Failed to delete customer data.');
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === 'ALL') return true;
    return String(o.status).toUpperCase() === orderStatusFilter.toUpperCase();
  });

  const ltvTier = customer ? calculateCustomerLtvBadge(customer.totalSpend) : { tier: 'BRONZE', color: '#0284C7', bg: '#F4F4F5' };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 120, height: 36, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
        </div>
        <div style={{ height: 160, backgroundColor: '#F3F4F6', borderRadius: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: 100, backgroundColor: '#F3F4F6', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>👤</div>
        <Text as="h2" variant="heading2">Customer Not Found</Text>
        <Text as="p" variant="caption" color={tokens.color.textSecondary}>
          The customer record with ID &quot;{customerId}&quot; could not be retrieved from database.
        </Text>
        <button
          type="button"
          onClick={() => router.push('/customers')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Return to Customers Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Top Breadcrumb & Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={() => router.push('/customers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            backgroundColor: '#FFFFFF',
            border: `1px solid ${tokens.color.border}`,
            borderRadius: 8,
            color: tokens.color.textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <span>←</span>
          <span>Back to Customers</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: `1px solid ${tokens.color.border}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔄</span>
            <span>{isFetching ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          {/* COD Toggle Control */}
          <button
            type="button"
            onClick={() => void handleToggleCod()}
            disabled={isUpdatingCod || !isConnected}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${customer.isCodDisabled ? '#10B981' : '#F59E0B'}`,
              backgroundColor: customer.isCodDisabled ? '#ECFDF5' : '#FFFBEB',
              color: customer.isCodDisabled ? '#065F46' : '#92400E',
              fontSize: 13,
              fontWeight: 700,
              cursor: isUpdatingCod ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{customer.isCodDisabled ? '🛡️' : '⚠️'}</span>
            <span>{customer.isCodDisabled ? 'Enable COD' : 'Disable COD'}</span>
          </button>

          {/* Suspend / Unsuspend Control */}
          {customer.accountStatus === 'ACTIVE' ? (
            <button
              type="button"
              onClick={handleOpenSuspendModal}
              disabled={isUpdatingStatus || !isConnected}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #FECACA',
                backgroundColor: '#FEE2E2',
                color: '#B91C1C',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⛔</span>
              <span>Suspend User</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleConfirmStatusChange('ACTIVE')}
              disabled={isUpdatingStatus || !isConnected}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #BBF7D0',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>✅</span>
              <span>Re-activate User</span>
            </button>
          )}

          {/* Delete User Data */}
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText('');
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
            disabled={isDeletingCustomer || !isConnected}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #EF4444',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🗑️</span>
            <span>Delete User Data</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: 20,
          padding: 28,
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              flexShrink: 0,
            }}
          >
            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#FFFFFF' }}>
                {customer.name}
              </h1>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  backgroundColor: customer.accountStatus === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: customer.accountStatus === 'ACTIVE' ? '#4ADE80' : '#F87171',
                  border: `1px solid ${customer.accountStatus === 'ACTIVE' ? '#22C55E' : '#EF4444'}`,
                }}
              >
                ● {customer.accountStatus === 'ACTIVE' ? 'Active Account' : 'Suspended'}
              </span>

              {/* LTV Tier */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#BAE6FD',
                  border: '1px solid rgba(186, 230, 253, 0.4)',
                }}
              >
                🏆 {customer.loyaltyTier || ltvTier.tier}
              </span>

              {/* COD Status */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  backgroundColor: customer.isCodDisabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: customer.isCodDisabled ? '#FCA5A5' : '#6EE7B7',
                  border: `1px solid ${customer.isCodDisabled ? '#F87171' : '#10B981'}`,
                }}
              >
                {customer.isCodDisabled ? '🚫 COD Blocked' : '💵 COD Enabled'}
              </span>
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#94A3B8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✉️</span>
                <span style={{ color: '#E2E8F0' }}>{customer.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📞</span>
                <span style={{ color: '#E2E8F0' }}>{customer.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📍</span>
                <span>{customer.city || customer.zoneName || 'Bangalore'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📅</span>
                <span>Joined: {customer.joinedDate}</span>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Customer UUID:</span>
              <code style={{ fontSize: 11, color: '#38BDF8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
                {customer.id}
              </code>
              <button
                type="button"
                onClick={handleCopyId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedId ? '#4ADE80' : '#94A3B8',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                {copiedId ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* If suspended, prominent reason banner */}
        {customer.accountStatus === 'SUSPENDED' && customer.suspensionReason && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              borderRadius: 12,
              padding: '12px 16px',
              maxWidth: 400,
            }}
          >
            <div style={{ color: '#F87171', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span>
              <span>SUSPENSION REASON RECORDED</span>
            </div>
            <div style={{ color: '#FEE2E2', fontSize: 13, marginTop: 4 }}>
              &quot;{customer.suspensionReason}&quot;
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spend</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{formatMoneyInr(customer.totalSpend)}</div>
          <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>Gross completed orders</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Orders</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284C7', marginTop: 4 }}>{customer.totalOrders}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            {customer.totalOrdersDelivered ?? 0} delivered • {customer.totalOrdersCancelled ?? 0} cancelled
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Order Value</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            ₹{customer.avgOrderValue ? customer.avgOrderValue.toFixed(2) : (customer.totalOrders > 0 ? (customer.totalSpend / customer.totalOrders).toFixed(2) : '0.00')}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Per valid order basket</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Saved Addresses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{addresses.length}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Delivery locations on file</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash on Delivery</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: customer.isCodDisabled ? '#DC2626' : '#16A34A', marginTop: 4 }}>
            {customer.isCodDisabled ? 'Restricted' : 'Allowed'}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{customer.isCodDisabled ? 'Prepaid payment only' : 'COD enabled'}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: `1px solid ${tokens.color.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Support Tickets</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: complaints.length > 0 ? '#D97706' : '#0F172A', marginTop: 4 }}>
            {complaints.length}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            {complaints.filter((c) => c.status === 'OPEN').length} active enquiries
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: `2px solid ${tokens.color.border}`,
          paddingBottom: 2,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'ORDERS', label: 'Order History', count: orders.length, icon: '📦' },
          { key: 'PAYMENTS', label: 'Payments & Transactions', count: payments.length, icon: '💳' },
          { key: 'COMPLAINTS', label: 'Complaints & Support', count: complaints.length, icon: '🎫' },
          { key: 'ADDRESSES', label: 'User Locations', count: addresses.length, icon: '📍' },
          { key: 'REVIEWS', label: 'Reviews & Feedback', count: reviews.length, icon: '⭐' },
          { key: 'CONTROLS', label: 'Account Controls & Security', count: null, icon: '🛡️' },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                borderBottom: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                marginBottom: -4,
                color: isSelected ? '#0284C7' : '#64748B',
                fontWeight: isSelected ? 700 : 600,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  style={{
                    backgroundColor: isSelected ? '#E0F2FE' : '#F1F5F9',
                    color: isSelected ? '#0369A1' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 12,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}

      {/* 1. ORDERS TAB */}
      {activeTab === 'ORDERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ALL', 'DELIVERED', 'COMPLETED', 'CONFIRMED', 'PREPARING', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${orderStatusFilter === st ? '#0284C7' : '#E2E8F0'}`,
                    backgroundColor: orderStatusFilter === st ? '#0284C7' : '#FFFFFF',
                    color: orderStatusFilter === st ? '#FFFFFF' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}` }}>
              <div style={{ fontSize: 36 }}>🛒</div>
              <div style={{ fontWeight: 600, color: '#1E293B', marginTop: 8 }}>No orders found</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>This customer has no orders matching the selected status.</div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}`, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${tokens.color.border}`, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 16px' }}>Order Number</th>
                    <th style={{ padding: '12px 16px' }}>Store / Restaurant</th>
                    <th style={{ padding: '12px 16px' }}>Amount</th>
                    <th style={{ padding: '12px 16px' }}>Payment</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Placed Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => {
                    const isDelivered = ['DELIVERED', 'COMPLETED'].includes(String(ord.status).toUpperCase());
                    const isCancelled = ['CANCELLED', 'REJECTED', 'CANCELED'].includes(String(ord.status).toUpperCase());

                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: '#0284C7' }}>{ord.orderNumber}</span>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>ID: {ord.id.substring(0, 8)}...</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{ord.restaurantName}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{ord.deliveryAddress || 'Indiranagar, Bangalore'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                          {formatMoneyInr(ord.totalAmount)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, backgroundColor: '#F1F5F9', color: '#475569' }}>
                            {ord.paymentMethod || 'ONLINE_UPI'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 20,
                              backgroundColor: isDelivered ? '#DCFCE7' : isCancelled ? '#FEE2E2' : '#FEF3C7',
                              color: isDelivered ? '#15803D' : isCancelled ? '#B91C1C' : '#B45309',
                              border: `1px solid ${isDelivered ? '#BBF7D0' : isCancelled ? '#FECACA' : '#FDE68A'}`,
                            }}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B' }}>
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => router.push(`/orders?search=${encodeURIComponent(ord.orderNumber)}`)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#0284C7',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View Order →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. PAYMENTS TAB */}
      {activeTab === 'PAYMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}`, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${tokens.color.border}`, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 16px' }}>Payment / Trans ID</th>
                  <th style={{ padding: '12px 16px' }}>Order Reference</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Payment Method</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No payment transaction records found for this customer.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{p.id}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#0284C7' }}>{p.orderNumber || p.orderId}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                        {formatMoneyInr(p.amount)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 20,
                            backgroundColor: p.status === 'SUCCESS' ? '#DCFCE7' : p.status === 'REFUNDED' ? '#EDE9FE' : '#FEE2E2',
                            color: p.status === 'SUCCESS' ? '#15803D' : p.status === 'REFUNDED' ? '#6D28D9' : '#B91C1C',
                            border: `1px solid ${p.status === 'SUCCESS' ? '#BBF7D0' : p.status === 'REFUNDED' ? '#DDD6FE' : '#FECACA'}`,
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. COMPLAINTS & SUPPORT TAB */}
      {activeTab === 'COMPLAINTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}`, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${tokens.color.border}`, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 16px' }}>Ticket ID</th>
                  <th style={{ padding: '12px 16px' }}>Subject / Enquiry</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Reported At</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Desk Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      <div style={{ fontSize: 32 }}>🎉</div>
                      <div style={{ fontWeight: 600, color: '#1E293B', marginTop: 6 }}>No complaints recorded</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>This customer has not filed any active support tickets.</div>
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0284C7' }}>
                        {c.id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{c.subject}</div>
                        {c.orderId && <div style={{ fontSize: 11, color: '#64748B' }}>Order Ref: {c.orderId}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {c.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 4,
                            backgroundColor: c.priority === 'HIGH' ? '#FEE2E2' : '#F1F5F9',
                            color: c.priority === 'HIGH' ? '#B91C1C' : '#475569',
                          }}
                        >
                          {c.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 20,
                            backgroundColor: c.status === 'RESOLVED' ? '#DCFCE7' : c.status === 'OPEN' ? '#FEF3C7' : '#E0F2FE',
                            color: c.status === 'RESOLVED' ? '#15803D' : c.status === 'OPEN' ? '#B45309' : '#0369A1',
                            border: `1px solid ${c.status === 'RESOLVED' ? '#BBF7D0' : c.status === 'OPEN' ? '#FDE68A' : '#BAE6FD'}`,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => router.push('/support')}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            color: '#0284C7',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Open in Support Desk →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SAVED ADDRESSES TAB */}
      {activeTab === 'ADDRESSES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {addresses.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}` }}>
              <div style={{ fontSize: 36 }}>📍</div>
              <div style={{ fontWeight: 600, color: '#1E293B', marginTop: 8 }}>No Saved Locations</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>This customer has not registered any saved addresses yet.</div>
            </div>
          ) : (
            addresses.map((addr, idx) => (
              <div
                key={addr.id || idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: `1px solid ${addr.isDefault ? '#38BDF8' : tokens.color.border}`,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: addr.isDefault ? '0 4px 12px rgba(56, 189, 248, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{addr.title?.toLowerCase() === 'work' ? '🏢' : '🏠'}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{addr.title || 'Home'}</span>
                  </div>
                  {addr.isDefault && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                      ★ Primary Default
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#334155' }}>
                  {addr.apartment && <div style={{ fontWeight: 600 }}>{addr.apartment}</div>}
                  <div>{addr.streetAddress}</div>
                  {addr.landmark && <div style={{ color: '#64748B', fontSize: 12 }}>Landmark: {addr.landmark}</div>}
                  <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>
                    {addr.city}, {addr.state || 'Karnataka'} - {addr.postalCode}
                  </div>
                </div>

                {(addr.latitude != null && addr.longitude != null) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#0284C7', backgroundColor: '#F0F9FF', padding: '6px 10px', borderRadius: 6 }}>
                    <span>📍</span>
                    <span>GPS: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748B' }}>
                  <div>Recipient: <strong style={{ color: '#0F172A' }}>{addr.name || customer.name}</strong></div>
                  <button
                    type="button"
                    onClick={() => {
                      const fullStr = `${addr.apartment ? addr.apartment + ', ' : ''}${addr.streetAddress}, ${addr.city} ${addr.postalCode}`;
                      navigator.clipboard.writeText(fullStr);
                      setToast({ message: 'Address copied to clipboard', variant: 'info' });
                    }}
                    style={{ background: 'none', border: 'none', color: '#0284C7', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Copy Address
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. REVIEWS & FEEDBACK TAB */}
      {activeTab === 'REVIEWS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {reviews.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${tokens.color.border}` }}>
              <div style={{ fontSize: 36 }}>⭐</div>
              <div style={{ fontWeight: 600, color: '#1E293B', marginTop: 8 }}>No Reviews Yet</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>This customer has not submitted restaurant or delivery ratings yet.</div>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: `1px solid ${tokens.color.border}`,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{rev.restaurantName}</div>
                    {rev.orderId && <div style={{ fontSize: 11, color: '#64748B' }}>Order: {rev.orderId}</div>}
                  </div>
                  <div style={{ color: '#EAB308', fontSize: 16 }}>
                    {'★'.repeat(rev.restaurantRating)}{'☆'.repeat(5 - rev.restaurantRating)}
                  </div>
                </div>

                {rev.comment && (
                  <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderLeft: '3px solid #0284C7' }}>
                    &quot;{rev.comment}&quot;
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                  <div>Delivery Rating: <strong>{rev.deliveryRating ? `${rev.deliveryRating} / 5` : '5 / 5'}</strong></div>
                  <div>{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. SECURITY & ACCOUNT CONTROLS TAB */}
      {activeTab === 'CONTROLS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Cash on Delivery Control Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, border: `1px solid ${tokens.color.border}`, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Cash on Delivery (COD) Permission
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Control whether this customer is permitted to place Cash on Delivery orders, or restricted to prepaid transactions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleToggleCod()}
                disabled={isUpdatingCod}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: customer.isCodDisabled ? '#10B981' : '#F59E0B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isUpdatingCod ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                {customer.isCodDisabled ? 'Re-enable Cash on Delivery' : 'Disable Cash on Delivery for User'}
              </button>
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, backgroundColor: customer.isCodDisabled ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${customer.isCodDisabled ? '#FECACA' : '#BBF7D0'}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: customer.isCodDisabled ? '#991B1B' : '#166534' }}>
                Current COD Status: {customer.isCodDisabled ? 'COD BLOCKED' : 'COD ACTIVE'}
              </div>
              <div style={{ fontSize: 12, color: customer.isCodDisabled ? '#B91C1C' : '#15803D', marginTop: 2 }}>
                {customer.isCodDisabled
                  ? 'This customer cannot select COD during mobile app checkout. Only Online UPI and Card payments will be accepted.'
                  : 'This customer has full privileges to order via both Cash on Delivery and digital payment channels.'}
              </div>
            </div>
          </div>

          {/* Account Status / Suspension Control Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, border: `1px solid ${tokens.color.border}`, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Account Suspension & Access Restrictions
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Suspended customers are blocked from authenticating or placing new orders. A mandatory audit reason is required for suspension.
                </p>
              </div>

              {customer.accountStatus === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={handleOpenSuspendModal}
                  disabled={isUpdatingStatus}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  Suspend Customer Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleConfirmStatusChange('ACTIVE')}
                  disabled={isUpdatingStatus}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  Re-activate Customer Account
                </button>
              )}
            </div>

            {customer.accountStatus === 'SUSPENDED' && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>
                  Account Currently Suspended
                </div>
                <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 4 }}>
                  <strong>Mandatory Reason on Record:</strong> &quot;{customer.suspensionReason || 'Security block applied by Administrator.'}&quot;
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone: GDPR & Permanent Data Purge */}
          <div style={{ backgroundColor: '#FEF2F2', borderRadius: 14, border: '2px solid #FECACA', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
                  Danger Zone: Purge Customer Data (GDPR / Privacy Compliance)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B91C1C' }}>
                  Permanently anonymizes personal identifiers, deletes contact credentials and address records. This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                disabled={isDeletingCustomer}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#B91C1C',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: isDeletingCustomer ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(185, 28, 28, 0.3)',
                }}
              >
                Permanently Delete User Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Mandatory Reason Suspension Modal */}
      {suspendModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSuspendModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 520,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>⛔</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Suspend Customer Account
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
              You are about to suspend <strong>{customer.name}</strong> ({customer.email}). A valid suspension reason is <strong>mandatory</strong> and will be recorded in the audit log.
            </p>

            {/* Quick Reason Chips */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
                Quick Preset Reasons:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Repeated fake COD order rejections',
                  'Abusive behavior towards delivery partners',
                  'Fraudulent cancellation & refund abuse',
                  'Suspicious payment dispute activity',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSuspendReason(chip);
                      setSuspendError(null);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      backgroundColor: suspendReason === chip ? '#EFF6FF' : '#F8FAFC',
                      color: suspendReason === chip ? '#1D4ED8' : '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory Reason Input */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                Suspension Reason <span style={{ color: '#EF4444' }}>* (Mandatory)</span>
              </label>
              <textarea
                rows={4}
                value={suspendReason}
                onChange={(e) => {
                  setSuspendReason(e.target.value);
                  if (suspendError) setSuspendError(null);
                }}
                placeholder="Enter detailed reason for suspending this user account..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${suspendError ? '#EF4444' : '#CBD5E1'}`,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {suspendError && (
                <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  ⚠️ {suspendError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
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
                onClick={() => void handleConfirmStatusChange('SUSPENDED')}
                disabled={isUpdatingStatus}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                }}
              >
                {isUpdatingStatus ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Customer Confirmation Modal */}
      {deleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#991B1B' }}>
                  Permanent Data Purge
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
              Are you sure you want to permanently delete user data for <strong>{customer.name}</strong>?
              All contact details and saved addresses will be anonymized and purged in compliance with GDPR.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                Type <span style={{ color: '#DC2626' }}>DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${deleteError ? '#EF4444' : '#CBD5E1'}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {deleteError && (
                <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  ⚠️ {deleteError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
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
                onClick={() => void handleDeleteCustomer()}
                disabled={isDeletingCustomer}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#B91C1C',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isDeletingCustomer ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeletingCustomer ? 'Purging Data...' : 'Permanently Purge Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        aria-label={toast?.message ?? 'Toast'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
