'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_16_ORDER_LIST } from '@/constants/gaps';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';
import { OrderOperationalPipeline } from '@/features/analytics/components/OrderOperationalPipeline';

export interface OrderItemRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  module: string;
  itemsSummary: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'DIGITAL';
  status: 'PENDING' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED';
  createdAt: string;
}

const MOCK_ORDERS: OrderItemRecord[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-111122223333',
    customerName: 'Aarav Mehta',
    customerPhone: '+91 98765 00001',
    storeName: 'Royal Biryani House',
    module: 'North Indian & Biryani',
    itemsSummary: '2x Chicken Dum Biryani, 1x Butter Naan, 1x Raita',
    totalAmount: 680,
    paymentMethod: 'DIGITAL',
    status: 'PREPARING',
    createdAt: '10 mins ago',
  },
  {
    id: 'e5f6a7b8-0005-4000-8000-555566667777',
    customerName: 'Ananya Sharma',
    customerPhone: '+91 98765 00005',
    storeName: 'Punjab Grill & Spice',
    module: 'North Indian & Tandoori',
    itemsSummary: '1x Paneer Tikka Masala, 2x Garlic Naan, 1x Mango Lassi',
    totalAmount: 620,
    paymentMethod: 'DIGITAL',
    status: 'READY_FOR_PICKUP',
    createdAt: '15 mins ago',
  },
  {
    id: 'b2c3d4e5-0002-4000-8000-222233334444',
    customerName: 'Neha Kapoor',
    customerPhone: '+91 98765 00002',
    storeName: 'Bella Italia Pizzeria',
    module: 'Italian Pizza',
    itemsSummary: '1x Wood-Fired Pepperoni Pizza, 2x Garlic Bread',
    totalAmount: 850,
    paymentMethod: 'COD',
    status: 'OUT_FOR_DELIVERY',
    createdAt: '25 mins ago',
  },
  {
    id: 'c3d4e5f6-0003-4000-8000-333344445555',
    customerName: 'Rohan Gupta',
    customerPhone: '+91 98765 00003',
    storeName: 'Sweet Dreams Bakery',
    module: 'Bakery & Desserts',
    itemsSummary: '1x Chocolate Truffle Cake, 2x Cappuccino Coffee',
    totalAmount: 540,
    paymentMethod: 'DIGITAL',
    status: 'PENDING',
    createdAt: '5 mins ago',
  },
  {
    id: 'd4e5f6a7-0004-4000-8000-444455556666',
    customerName: 'Kavita Reddy',
    customerPhone: '+91 98765 00004',
    storeName: 'The Gourmet Burger Bistro',
    module: 'Burgers & Fries',
    itemsSummary: '1x Double Cheese Burger, 1x Peri Peri Fries, 1x Coke',
    totalAmount: 510,
    paymentMethod: 'DIGITAL',
    status: 'DELIVERED',
    createdAt: '1 hour ago',
  },
];

function getOrderStatusStyle(status: OrderItemRecord['status']) {
  switch (status) {
    case 'PENDING':
      return { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', shadow: 'none' };
    case 'PREPARING':
      return { bg: '#E0F2FE', color: '#0284C7', border: '#7DD3FC', shadow: 'none' };
    case 'READY_FOR_PICKUP':
      return { bg: '#BAE6FD', color: '#0369A1', border: '#38BDF8', shadow: 'none' };
    case 'OUT_FOR_DELIVERY':
      return { bg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: '#FFFFFF', border: '#0284C7', shadow: '0 2px 6px rgba(2, 132, 199, 0.25)' };
    case 'DELIVERED':
      return { bg: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)', color: '#FFFFFF', border: '#0284C7', shadow: '0 2px 6px rgba(14, 165, 233, 0.25)' };
    case 'CANCELED':
      return { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD', shadow: 'none' };
  }
}

export function OrdersPage() {
  const { tokens } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? 'ALL';
  const activeModule = useAppSelector(selectActiveModule);

  const [orders, setOrders] = useState<OrderItemRecord[]>(MOCK_ORDERS);
  const [searchUuid, setSearchUuid] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  useEffect(() => {
    trackAnalyticsEvent('admin_orders_viewed', {
      gapId: GAP_API_16_ORDER_LIST,
    });
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter || (statusFilter === 'PROCESSING' && o.status === 'PREPARING');
    const matchesSearch =
      searchUuid === '' ||
      o.id.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.customerPhone.includes(searchUuid) ||
      o.storeName.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.itemsSummary.toLowerCase().includes(searchUuid.toLowerCase()) ||
      o.paymentMethod.toLowerCase().includes(searchUuid.toLowerCase());

    let matchesModule = true;
    if (activeModule === 'RESTAURANTS') {
      matchesModule = o.module.includes('Indian') || o.module.includes('Italian') || o.module.includes('Pizza');
    } else if (activeModule === 'CAFES') {
      matchesModule = o.module.includes('Bakery') || o.module.includes('Desserts') || o.module.includes('Cafe');
    } else if (activeModule === 'CLOUD_KITCHEN') {
      matchesModule = o.module.includes('Burgers') || o.module.includes('Fries') || o.module.includes('Fast Food');
    }

    return matchesStatus && matchesSearch && matchesModule;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#0369A1">
            Order Dispatch Control Center
          </Text>
          <Text as="p" variant="caption" color="#0284C7">
            Real-time multi-vendor order tracking, dispatch management & status overrides
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)' }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0369A1' }}>Live WebSocket Dispatch Feed</span>
        </div>
      </div>

      {/* Live Order Operational Pipeline */}
      <OrderOperationalPipeline totalOrders={324} />

      {/* Orders Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 14,
          border: '1px solid #BAE6FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: statusFilter === st ? 'none' : '1px solid #BAE6FD',
                background: statusFilter === st ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#F0F9FF',
                color: statusFilter === st ? '#FFFFFF' : '#0369A1',
                boxShadow: statusFilter === st ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                fontSize: 12,
                fontWeight: 800,
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
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #BAE6FD',
            width: 320,
            fontSize: 13,
            outline: 'none',
            color: '#0369A1',
            backgroundColor: '#FFFFFF',
            boxShadow: 'inset 0 1px 3px rgba(2, 132, 199, 0.06)',
          }}
        />
      </div>

      {/* Orders Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #BAE6FD',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1', fontWeight: 800 }}>
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
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#0284C7', fontWeight: 600 }}>
                  No orders found matching the selected filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const statusStyle = getOrderStatusStyle(order.status);
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #E0F2FE', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 800, color: '#0369A1', fontFamily: 'monospace', fontSize: 12 }}>
                        #{order.id.slice(0, 8)}...
                      </div>
                      <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>{order.createdAt}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0369A1' }}>{order.customerName}</div>
                      <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>{order.customerPhone}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0369A1' }}>{order.storeName}</div>
                      <span style={{ fontSize: 11, color: '#0284C7', fontWeight: 600 }}>{order.module}</span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0369A1', fontSize: 12 }}>{order.itemsSummary}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 800, color: '#0369A1' }}>₹{order.totalAmount}</div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          color: '#0369A1',
                          display: 'inline-block',
                          marginTop: 3,
                        }}
                      >
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          boxShadow: statusStyle.shadow,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 20,
                          display: 'inline-block',
                        }}
                      >
                        {order.status === 'READY_FOR_PICKUP' ? 'READY FOR PICKUP' : order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {order.status === 'PREPARING' && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'READY_FOR_PICKUP' } : o)),
                            );
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            marginRight: 8,
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
                          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
