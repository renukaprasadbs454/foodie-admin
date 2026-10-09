'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_16_ORDER_LIST } from '@/constants/gaps';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';
import { OrderOperationalPipeline } from '@/features/analytics/components/OrderOperationalPipeline';
import {
  useGetAdminOrdersQuery,
  useOverrideOrderStatusMutation,
} from '@/api/endpoints/ordersApi';
import type { OrderItemRecord } from '@/features/orders/types';
import { formatRelativeFromNow } from '@/shared/utils/date';

export type { OrderItemRecord };

function getOrderStatusStyle(status: OrderItemRecord['status']) {
  switch (status) {
    case 'PENDING':
      return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', shadow: 'none' };
    case 'PREPARING':
      return { bg: '#E3F2FD', color: '#1E40AF', border: '#BFDBFE', shadow: 'none' };
    case 'READY_FOR_PICKUP':
      return { bg: '#E0E7FF', color: '#4338CA', border: '#C7D2FE', shadow: 'none' };
    case 'OUT_FOR_DELIVERY':
      return { bg: '#E3F2FD', color: '#1D4ED8', border: '#BFDBFE', shadow: 'none' };
    case 'DELIVERED':
      return { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', shadow: 'none' };
    case 'CANCELED':
      return { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', shadow: 'none' };
    default:
      return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', shadow: 'none' };
  }
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Just now';
  if (dateStr.includes('T')) {
    try {
      return formatRelativeFromNow(dateStr);
    } catch {
      return dateStr;
    }
  }
  return dateStr;
}

export function OrdersPage() {
  const { tokens } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? 'ALL';
  const activeModule = useAppSelector(selectActiveModule);

  const [searchUuid, setSearchUuid] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useGetAdminOrdersQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [overrideOrderStatus, { isLoading: isOverriding }] = useOverrideOrderStatusMutation();

  useEffect(() => {
    trackAnalyticsEvent('admin_orders_viewed', {
      gapId: GAP_API_16_ORDER_LIST,
    });
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      o.status === statusFilter ||
      (statusFilter === 'PROCESSING' && o.status === 'PREPARING') ||
      (statusFilter === 'CANCELED' && (o.status as string) === 'CANCELLED');

    const matchesSearch =
      searchUuid === '' ||
      o.id.toLowerCase().includes(searchUuid.toLowerCase()) ||
      (o.orderCode && o.orderCode.toLowerCase().includes(searchUuid.toLowerCase())) ||
      o.customerName.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.customerPhone.includes(searchUuid) ||
      o.storeName.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.itemsSummary.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.paymentMethod.toLowerCase().includes(searchUuid.toLowerCase());

    let matchesModule = true;
    if (activeModule === 'RESTAURANTS') {
      matchesModule =
        o.module.includes('Indian') ||
        o.module.includes('Italian') ||
        o.module.includes('Pizza') ||
        o.module.includes('Dining') ||
        o.module.includes('General');
    } else if (activeModule === 'CAFES') {
      matchesModule =
        o.module.includes('Bakery') ||
        o.module.includes('Desserts') ||
        o.module.includes('Cafe') ||
        o.module.includes('Dining') ||
        o.module.includes('General');
    } else if (activeModule === 'CLOUD_KITCHEN') {
      matchesModule =
        o.module.includes('Burgers') ||
        o.module.includes('Fries') ||
        o.module.includes('Fast Food') ||
        o.module.includes('Dining') ||
        o.module.includes('General');
    }

    return matchesStatus && matchesSearch && matchesModule;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Order Dispatch Control Center
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Real-time multi-vendor order tracking, dispatch management & status overrides
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3' }}>Live Dispatch Feed</span>
        </div>
      </div>

      {/* Live Order Operational Pipeline */}
      <OrderOperationalPipeline totalOrders={orders.length} />

      {/* Orders Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: statusFilter === st ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                backgroundColor: statusFilter === st ? '#E3F2FD' : '#FFFFFF',
                color: statusFilter === st ? '#2196F3' : '#6B7280',
                fontSize: 12,
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? 'ALL ORDERS' : st.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by Order ID, Customer, or Store..."
          value={searchUuid}
          onChange={(e) => setSearchUuid(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            width: 320,
            fontSize: 13,
            outline: 'none',
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Orders Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px 20px' }}>Order ID</th>
              <th style={{ padding: '14px 20px' }}>Customer</th>
              <th style={{ padding: '14px 20px' }}>Store & Module</th>
              <th style={{ padding: '14px 20px' }}>Items Summary</th>
              <th style={{ padding: '14px 20px' }}>Amount & Pay</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        border: '2px solid #BFDBFE',
                        borderTopColor: '#2196F3',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>Loading real orders from database...</span>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#B91C1C' }}>
                  <span>Failed to load orders from backend. </span>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    style={{
                      marginLeft: 8,
                      color: '#2196F3',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
                  No orders found matching the selected filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const statusStyle = getOrderStatusStyle(order.status);
                const displayCreatedAt = formatDisplayDate(order.createdAt);
                return (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#2196F3', fontFamily: 'monospace', fontSize: 12 }}>
                        #{order.orderCode || `${order.id.slice(0, 8)}...`}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{displayCreatedAt}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{order.customerName}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{order.customerPhone}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{order.storeName}</div>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{order.module}</span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#4B5563', fontSize: 12 }}>{order.itemsSummary}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>₹{order.totalAmount}</div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: '#F3F4F6',
                          border: '1px solid #E5E7EB',
                          color: '#4B5563',
                          display: 'inline-block',
                          marginTop: 3,
                        }}
                      >
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          display: 'inline-block',
                        }}
                      >
                        {order.status === 'READY_FOR_PICKUP' ? 'READY FOR PICKUP' : order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {order.status === 'PREPARING' && (
                        <button
                          type="button"
                          disabled={isOverriding}
                          onClick={async () => {
                            try {
                              await overrideOrderStatus({
                                orderId: order.id,
                                body: {
                                  targetStatus: 'READY_FOR_PICKUP',
                                  reason: 'Marked ready by operator from dispatch center',
                                },
                              }).unwrap();
                            } catch (err) {
                              console.error('Failed to mark order ready:', err);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#F5F7FA',
                            color: '#2196F3',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isOverriding ? 'not-allowed' : 'pointer',
                            marginRight: 8,
                            opacity: isOverriding ? 0.7 : 1,
                          }}
                        >
                          Mark Ready
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/orders/${order.id}`)}
                        style={{
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                        }}
                      >
                        Manage Order
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
