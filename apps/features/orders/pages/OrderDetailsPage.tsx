'use client';

import React, { useEffect, useState } from 'react';
import {
  EmptyState,
  Text,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-web';
import {
  useGetOrderQuery,
  useOverrideOrderStatusMutation,
} from '@/api/endpoints/ordersApi';
import { selectAdminRole } from '@/features/auth/authSlice';
import { useAppSelector } from '@/store/hooks';
import { canOverrideOrderStatus } from '@/lib/routeGuards';
import { PermissionDenied } from '@/features/analytics/components/PermissionDenied';
import { toUnwrappedApiError } from '@/features/restaurants/lib/apiError';
import { OrderDetailSkeleton } from '../components/OrderDetailSkeleton';
import { OverrideStatusModal } from '../components/OverrideStatusModal';
import { formatMoneyInr, type OrderStatus } from '../types';

type Props = {
  orderId: string;
};

/**
 * P2-ADM-04 order detail — GET /orders/{id} + POST override-status.
 */
export function OrderDetailsPage({ orderId }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const role = useAppSelector(selectAdminRole);
  const canOverride = canOverrideOrderStatus(role);

  const orderQuery = useGetOrderQuery(orderId, {
    skip: !orderId,
    refetchOnFocus: true,
  });
  const [overrideStatus, overrideState] = useOverrideOrderStatusMutation();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('admin_orders_viewed', { orderId, surface: 'details' });
  }, [orderId]);

  const onOverride = async (targetStatus: string, reason: string) => {
    if (!canOverride) return;
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to override status.',
        variant: 'warning',
      });
      return;
    }
    trackAnalyticsEvent('override_submitted', { orderId, targetStatus });
    try {
      await overrideStatus({
        orderId,
        body: { targetStatus: targetStatus as OrderStatus, reason },
      }).unwrap();
      trackAnalyticsEvent('order_status_overridden', { orderId, targetStatus });
      setOverrideOpen(false);
      setToast({ message: 'Order status overridden.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const data = orderQuery.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          Order Details & Audit Trail
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Detailed item breakdown, financial breakdown, and administrative status override
        </p>
      </div>

      {!isConnected ? (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 16px', borderRadius: 10, color: '#1E40AF', fontSize: 13, fontWeight: 600 }}>
          Offline — showing cached order when available. Override blocked.
        </div>
      ) : null}

      {!canOverride ? (
        <PermissionDenied description="OPS or SUPER_ADMIN required to override order status." />
      ) : null}

      {orderQuery.isLoading && !data ? (
        <OrderDetailSkeleton />
      ) : orderQuery.isError && !data ? (
        <EmptyState
          title="Order not found"
          description="Check the UUID or retry."
          aria-label="Order detail error"
          actionLabel="Retry"
          onAction={() => {
            void orderQuery.refetch();
          }}
        />
      ) : data ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: 24,
              border: '1px solid #E5E7EB',
              borderRadius: 20,
              background: '#FFFFFF',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
                  Order #{data.orderNumber}
                </h2>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  Order ID: {data.orderId}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: '#E3F2FD',
                    border: '1px solid #BFDBFE',
                    color: '#2196F3',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 20,
                  }}
                >
                  Status: {data.status}
                </span>
                {canOverride ? (
                  <button
                    type="button"
                    aria-label="Override order status"
                    disabled={!isConnected || overrideState.isLoading}
                    onClick={() => setOverrideOpen(true)}
                    style={{
                      padding: '8px 18px',
                      background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isConnected && !overrideState.isLoading ? 'pointer' : 'not-allowed',
                      boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                    }}
                  >
                    Override Status
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 4 }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL AMOUNT</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>{formatMoneyInr(data.totalAmount)}</div>
              </div>
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STORE & CUSTOMER</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 4 }}>{data.restaurantId ?? 'Store ID: —'}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Customer: {data.customerId ?? '—'}</div>
              </div>
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BREAKDOWN</div>
                <div style={{ fontSize: 12, color: '#111827', marginTop: 4 }}>Subtotal: {formatMoneyInr(data.subtotal)} | Delivery: {formatMoneyInr(data.deliveryFee)}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Discount: {formatMoneyInr(data.discountAmount)} | Tax: {formatMoneyInr(data.taxAmount)}</div>
              </div>
            </div>

            {data.placedAt ? (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Placed At: {new Date(data.placedAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          {/* Line Items Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', fontWeight: 700, color: '#111827', fontSize: 14 }}>
              Ordered Line Items ({(data.items ?? []).length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 20px' }}>Item Name</th>
                  <th style={{ padding: '12px 20px' }}>Quantity</th>
                  <th style={{ padding: '12px 20px' }}>Unit Price</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>
                      No items recorded in this order.
                    </td>
                  </tr>
                ) : (
                  (data.items ?? []).map((item, index) => (
                    <tr key={`${item.menuItemId ?? 'i'}-${index}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>{item.name}</td>
                      <td style={{ padding: '14px 20px', color: '#4B5563' }}>{item.quantity}</td>
                      <td style={{ padding: '14px 20px', color: '#4B5563' }}>{formatMoneyInr(item.unitPrice)}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{formatMoneyInr(item.lineTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Status Events Audit Trail Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', fontWeight: 700, color: '#111827', fontSize: 14 }}>
              Status Progression & Lifecycle Events ({(data.orderStatusEvents ?? []).length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 20px' }}>From Status</th>
                  <th style={{ padding: '12px 20px' }}>To Status</th>
                  <th style={{ padding: '12px 20px' }}>Actor</th>
                  <th style={{ padding: '12px 20px' }}>Reason</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(data.orderStatusEvents ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>
                      No status lifecycle events recorded.
                    </td>
                  </tr>
                ) : (
                  (data.orderStatusEvents ?? []).map((event, index) => (
                    <tr key={event.eventId ?? `e-${index}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 20px', color: '#6B7280' }}>{event.fromStatus ?? '—'}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>{event.toStatus ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#4B5563' }}>{event.actorType ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#4B5563' }}>{event.reason ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#6B7280', textAlign: 'right', fontSize: 12 }}>
                        {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <OverrideStatusModal
        open={overrideOpen}
        loading={overrideState.isLoading}
        currentStatus={data?.status}
        onClose={() => setOverrideOpen(false)}
        onConfirm={(targetStatus, reason) => {
          void onOverride(targetStatus, reason);
        }}
      />

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
