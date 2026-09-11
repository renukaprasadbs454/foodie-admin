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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text as="h1" variant="heading1" color="#09090B">
            Order Dispatch Control Center
          </Text>
          <Text as="p" variant="caption" color="#71717A">
            Real-time multi-vendor order tracking, dispatch management & status overrides
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '6px 12px', borderRadius: 20 }}>
          <span style={{ fontSize: 14 }}></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>Live WebSocket Dispatch Feed</span>
        </div>
      </div>

      {/* Live Order Operational Pipeline */}
      <OrderOperationalPipeline totalOrders={324} />

      {/* Orders Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid #E4E4E7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
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
                border: 'none',
                backgroundColor: statusFilter === st ? '#000000' : '#F4F4F5',
                color: statusFilter === st ? '#FFFFFF' : '#09090B',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
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
            border: '1px solid #E4E4E7',
            width: 320,
            fontSize: 14,
            outline: 'none',
            color: '#09090B',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Orders Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E4E4E7',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '1px solid #E4E4E7', color: '#09090B', fontWeight: 700 }}>
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
            {filteredOrders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #E4E4E7' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, color: '#09090B', fontFamily: 'monospace', fontSize: 12 }}>
                    #{order.id.slice(0, 8)}...
                  </div>
                  <div style={{ fontSize: 11, color: '#71717A' }}>{order.createdAt}</div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600, color: '#09090B' }}>{order.customerName}</div>
                  <div style={{ fontSize: 12, color: '#71717A' }}>{order.customerPhone}</div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600, color: '#09090B' }}>{order.storeName}</div>
                  <span style={{ fontSize: 11, color: '#71717A', fontWeight: 600 }}>{order.module}</span>
                </td>
                <td style={{ padding: '16px 20px', color: '#18181B', fontSize: 13 }}>{order.itemsSummary}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, color: '#09090B' }}>₹{order.totalAmount}</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#F4F4F5',
                      border: '1px solid #E4E4E7',
                      color: '#09090B',
                    }}
                  >
                    {order.paymentMethod}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span
                    style={{
                      backgroundColor:
                        order.status === 'DELIVERED' || order.status === 'PENDING'
                          ? '#F4F4F5'
                          : order.status === 'READY_FOR_PICKUP'
                          ? '#000000'
                          : order.status === 'OUT_FOR_DELIVERY' || order.status === 'PREPARING'
                          ? '#18181B'
                          : '#E4E4E7',
                      color:
                        order.status === 'READY_FOR_PICKUP' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'PREPARING'
                          ? '#FFFFFF'
                          : order.status === 'CANCELED'
                          ? '#71717A'
                          : '#09090B',
                      border: '1px solid #E4E4E7',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 20,
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
                        backgroundColor: '#F4F4F5',
                        color: '#09090B',
                        border: '1px solid #E4E4E7',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginRight: 8,
                      }}
                    >
                      Mark Ready for Pickup
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${order.id}`)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#000000',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Manage Order
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
