'use client';

import React, { useState } from 'react';
import type { DarkstoreNotification } from '../types';

export function DarkstoreNotificationsPage() {
  const [notifications] = useState<DarkstoreNotification[]>([
    {
      id: 'n1',
      title: 'New High Priority Order #FD-10234 Received',
      message: 'Order placed by Aarav Mehta (2 items) requiring express picking.',
      type: 'NEW_ORDER',
      severity: 'HIGH',
      read: false,
      timestamp: '2 mins ago',
    },
    {
      id: 'n2',
      title: 'Low Stock Alert: Britannia Brown Bread Whole Wheat',
      message: 'Current stock is 6 units, which is below min threshold of 10.',
      type: 'LOW_STOCK',
      severity: 'MEDIUM',
      read: false,
      timestamp: '15 mins ago',
    },
    {
      id: 'n3',
      title: 'Out of Stock Alert: Lays India Magic Masala Chips 50g',
      message: 'Stock reached 0. SKU automatically hidden from customer store front.',
      type: 'OUT_OF_STOCK',
      severity: 'HIGH',
      read: true,
      timestamp: '1 hour ago',
    },
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#09090B', margin: 0 }}>
          Darkstore Operational Alerts & Notifications
        </h1>
        <p style={{ fontSize: 13, color: '#71717A', margin: '4px 0 0' }}>
          Real-time alerts for incoming orders, inventory threshold breaches, and delivery partner handoff events.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              padding: 16,
              border: '1px solid #E4E4E7',
              borderLeft: '4px solid #000000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B' }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{n.message}</div>
            </div>
            <div style={{ fontSize: 11, color: '#71717A', fontWeight: 600 }}>{n.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
