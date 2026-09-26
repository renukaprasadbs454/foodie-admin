'use client';

import React from 'react';
import Link from 'next/link';

export function RestaurantAdminDashboardPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', margin: 0 }}>
           Restaurant Partner Operations Portal
        </h1>
        <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0' }}>
          Menu management, live kitchen orders, prep timers, and customer reviews for your restaurant branch.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>TODAY'S ORDERS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>32 Orders</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>KITCHEN PREP TIME</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>14 mins avg</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>RESTAURANT RATING</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>4.8 / 5.0</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <Link href="/restaurants" style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>Restaurant Profile & Menu Management</div>
          <p style={{ fontSize: 12, color: '#0284C7', margin: '4px 0 0' }}>Update menu items, set prices, toggle item availability, and edit operating hours.</p>
        </Link>
        <Link href="/orders" style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>Kitchen Order Display</div>
          <p style={{ fontSize: 12, color: '#0284C7', margin: '4px 0 0' }}>Accept incoming kitchen orders, mark items as preparing, and alert delivery partners when ready.</p>
        </Link>
      </div>
    </div>
  );
}

