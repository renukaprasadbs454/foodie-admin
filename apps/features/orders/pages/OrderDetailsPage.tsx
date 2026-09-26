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
        <Text as="h1" variant="heading1" color="#0369A1">
          Order Details & Audit Trail
        </Text>
        <Text as="p" variant="caption" color="#0284C7">
          Detailed item breakdown, financial breakdown, and administrative status override
        </Text>
      </div>

      {!isConnected ? (
        <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px 16px', borderRadius: 8, color: '#0369A1', fontSize: 13, fontWeight: 700 }}>
          ⚠️ Offline — showing cached order when available. Override blocked.
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
              gap: 12,
              padding: 24,
              border: '1px solid #BAE6FD',
              borderRadius: 14,
              background: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0369A1', margin: 0 }}>
                  Order #{data.orderNumber}
                </h2>
                <div style={{ fontSize: 12, color: '#0284C7', marginTop: 4 }}>
                  Order ID: {data.orderId}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '6px 14px',
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
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: isConnected && !overrideState.isLoading ? 'pointer' : 'not-allowed',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    Override Status
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
              <div style={{ backgroundColor: '#F0F9FF', padding: '12px 16px', borderRadius: 10, border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7' }}>TOTAL AMOUNT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>{formatMoneyInr(data.totalAmount)}</div>
              </div>
              <div style={{ backgroundColor: '#F0F9FF', padding: '12px 16px', borderRadius: 10, border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7' }}>STORE & CUSTOMER</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', marginTop: 2 }}>{data.restaurantId ?? 'Store ID: —'}</div>
                <div style={{ fontSize: 11, color: '#075985' }}>Customer: {data.customerId ?? '—'}</div>
              </div>
              <div style={{ backgroundColor: '#F0F9FF', padding: '12px 16px', borderRadius: 10, border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7' }}>BREAKDOWN</div>
                <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>Subtotal: {formatMoneyInr(data.subtotal)} | Delivery: {formatMoneyInr(data.deliveryFee)}</div>
                <div style={{ fontSize: 11, color: '#075985' }}>Discount: {formatMoneyInr(data.discountAmount)} | Tax: {formatMoneyInr(data.taxAmount)}</div>
              </div>
            </div>

            {data.placedAt ? (
              <div style={{ fontSize: 12, color: '#0284C7', marginTop: 4 }}>
                Placed At: {new Date(data.placedAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          {/* Line Items Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #BAE6FD',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
            }}
          >
            <div style={{ padding: '14px 20px', backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', fontWeight: 800, color: '#0369A1', fontSize: 14 }}>
              🛒 Ordered Line Items ({(data.items ?? []).length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1' }}>
                  <th style={{ padding: '12px 20px' }}>Item Name</th>
                  <th style={{ padding: '12px 20px' }}>Quantity</th>
                  <th style={{ padding: '12px 20px' }}>Unit Price</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#0284C7' }}>
                      No items recorded in this order.
                    </td>
                  </tr>
                ) : (
                  (data.items ?? []).map((item, index) => (
                    <tr key={`${item.menuItemId ?? 'i'}-${index}`} style={{ borderBottom: '1px solid #E0F2FE' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0369A1' }}>{item.name}</td>
                      <td style={{ padding: '14px 20px', color: '#0369A1' }}>{item.quantity}</td>
                      <td style={{ padding: '14px 20px', color: '#0284C7' }}>{formatMoneyInr(item.unitPrice)}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0369A1', textAlign: 'right' }}>{formatMoneyInr(item.lineTotal)}</td>
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
              borderRadius: 14,
              border: '1px solid #BAE6FD',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
            }}
          >
            <div style={{ padding: '14px 20px', backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', fontWeight: 800, color: '#0369A1', fontSize: 14 }}>
              📜 Status Progression & Lifecycle Events ({(data.orderStatusEvents ?? []).length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1' }}>
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
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#0284C7' }}>
                      No status lifecycle events recorded.
                    </td>
                  </tr>
                ) : (
                  (data.orderStatusEvents ?? []).map((event, index) => (
                    <tr key={event.eventId ?? `e-${index}`} style={{ borderBottom: '1px solid #E0F2FE' }}>
                      <td style={{ padding: '14px 20px', color: '#0284C7' }}>{event.fromStatus ?? '—'}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0369A1' }}>{event.toStatus ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#075985' }}>{event.actorType ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#0369A1' }}>{event.reason ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: '#0284C7', textAlign: 'right', fontSize: 12 }}>
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
