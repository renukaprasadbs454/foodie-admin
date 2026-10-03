'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';

export interface RecentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  restaurantName: string;
  module: string;
  itemsCount: number;
  totalAmount: number;
  paymentMethod: 'CARD' | 'CASH' | 'WALLET';
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED';
  createdAt: string;
}

const MOCK_RECENT_ORDERS: RecentOrder[] = [
  { id: '101', orderCode: '#ORD-9821', customerName: 'Aarav Mehta', restaurantName: 'Royal Biryani House', module: 'North Indian & Biryani', itemsCount: 3, totalAmount: 42.50, paymentMethod: 'CARD', status: 'DELIVERED', createdAt: '2 mins ago' },
  { id: '102', orderCode: '#ORD-9820', customerName: 'Neha Kapoor', restaurantName: 'Bella Italia Pizzeria', module: 'Italian & Wood-Fired Pizza', itemsCount: 2, totalAmount: 34.00, paymentMethod: 'WALLET', status: 'OUT_FOR_DELIVERY', createdAt: '8 mins ago' },
  { id: '103', orderCode: '#ORD-9819', customerName: 'Suresh Kumar', restaurantName: 'Sweet Dreams Bakery', module: 'Bakery & Desserts', itemsCount: 4, totalAmount: 58.20, paymentMethod: 'CARD', status: 'PROCESSING', createdAt: '15 mins ago' },
  { id: '104', orderCode: '#ORD-9818', customerName: 'Ananya Verma', restaurantName: 'The Gourmet Burger Bistro', module: 'Burgers & Fast Food', itemsCount: 1, totalAmount: 18.90, paymentMethod: 'CASH', status: 'CONFIRMED', createdAt: '22 mins ago' },
  { id: '105', orderCode: '#ORD-9817', customerName: 'Vikram Singh', restaurantName: 'Dragon Bowl Asian Kitchen', module: 'Chinese & Pan-Asian', itemsCount: 2, totalAmount: 29.50, paymentMethod: 'CARD', status: 'PENDING', createdAt: '29 mins ago' },
];

function getStatusBadge(status: RecentOrder['status']) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
    case 'CONFIRMED':
      return { label: 'Confirmed', color: '#1D4ED8', bg: '#E3F2FD', border: '#BFDBFE' };
    case 'PROCESSING':
      return { label: 'Packaging', color: '#1E40AF', bg: '#E3F2FD', border: '#BFDBFE' };
    case 'OUT_FOR_DELIVERY':
      return { label: 'In Transit', color: '#1E40AF', bg: '#E3F2FD', border: '#BFDBFE' };
    case 'DELIVERED':
      return { label: 'Delivered', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' };
    case 'CANCELED':
      return { label: 'Canceled', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' };
  }
}

interface Props {
  orders?: RecentOrder[];
}

export function RecentOrdersTableWidget({ orders = [] }: Props) {
  const router = useRouter();
  const activeModule = useAppSelector(selectActiveModule);
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);

  const filteredOrders = orders.filter((ord) => {
    if (activeModule === 'FOOD') return true;
    if (activeModule === 'RESTAURANTS') return ord.module.includes('Indian') || ord.module.includes('Italian') || ord.module.includes('Pizza');
    if (activeModule === 'CAFES') return ord.module.includes('Bakery') || ord.module.includes('Desserts') || ord.module.includes('Cafe');
    if (activeModule === 'CLOUD_KITCHEN') return ord.module.includes('Burgers') || ord.module.includes('Fast Food') || ord.module.includes('Asian');
    return true;
  });

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Recent Orders Activity</h3>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 0' }}>Real-time stream of incoming customer transactions</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#2196F3',
            backgroundColor: '#E3F2FD',
            border: '1px solid #BFDBFE',
            padding: '7px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#DBEAFE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E3F2FD';
          }}
        >
          View All Orders →
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px 20px' }}>Order ID</th>
              <th style={{ padding: '14px 20px' }}>Customer</th>
              <th style={{ padding: '14px 20px' }}>Restaurant Outlet</th>
              <th style={{ padding: '14px 20px' }}>Amount</th>
              <th style={{ padding: '14px 20px' }}>Method</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
                  No recent orders found matching selected module.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const badge = getStatusBadge(ord.status);
                return (
                  <tr
                    key={ord.id}
                    style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#2196F3' }}>{ord.orderCode}</td>
                    <td style={{ padding: '14px 20px', color: '#111827', fontWeight: 500 }}>{ord.customerName}</td>
                    <td style={{ padding: '14px 20px', color: '#4B5563' }}>{ord.restaurantName}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#111827' }}>₹{ord.totalAmount.toFixed(2)}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: 6 }}>
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: badge.color,
                          backgroundColor: badge.bg,
                          border: `1px solid ${badge.border}`,
                          padding: '3px 10px',
                          borderRadius: 20,
                          display: 'inline-block',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#2196F3',
                          backgroundColor: '#F5F7FA',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E3F2FD';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F5F7FA';
                        }}
                      >
                        Quick View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick View Drawer Modal */}
      {selectedOrder ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              height: '100%',
              padding: '24px',
              boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
              borderLeft: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Order {selectedOrder.orderCode}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>Created {selectedOrder.createdAt}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Details</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 4 }}>{selectedOrder.customerName}</div>
                <div style={{ color: '#4B5563', marginTop: 2 }}>Payment via {selectedOrder.paymentMethod}</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Store Details</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 4 }}>{selectedOrder.restaurantName}</div>
                <div style={{ color: '#4B5563', marginTop: 2 }}>{selectedOrder.itemsCount} Food items included</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Total Amount Paid</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>₹{selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  router.push('/orders');
                  setSelectedOrder(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
                }}
              >
                Go to Order Details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

