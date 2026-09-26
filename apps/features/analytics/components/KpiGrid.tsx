'use client';

import React from 'react';
import { Text, useTheme } from 'foodie-shared-web';
import type { DashboardSummary } from '../types';
import { formatCount } from '../types';
import { MoneyText } from './MoneyText';

type Props = {
  summary: DashboardSummary;
};

function KpiCard({
  label,
  children,
  icon,
  trend,
}: {
  label: string;
  children: React.ReactNode;
  icon?: string;
  trend?: string;
}) {
  return (
    <div
      className="card-hover"
      style={{
        padding: '20px 22px',
        border: '1px solid #BAE6FD',
        borderLeft: '4px solid #0284C7',
        borderRadius: 14,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.06)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text as="span" variant="caption" style={{ color: '#0284C7', fontSize: 13, fontWeight: 700 }}>
          {label}
        </Text>
        {icon ? (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        {children}
        {trend ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0369A1',
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Summary KPI tiles — Sky Blue 6amMart Multi-Vendor metrics. */
export function KpiGrid({ summary }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      <KpiCard label="Total Orders" icon="📦">
        <Text as="span" variant="heading2" style={{ color: '#0369A1', fontWeight: 800 }}>
          {formatCount(summary.totalOrders)}
        </Text>
      </KpiCard>
      <KpiCard label="Total Marketplace Revenue" icon="💰">
        <MoneyText value={summary.totalRevenue} aria-label="Total revenue" />
      </KpiCard>
      <KpiCard label="Active Stores / Vendors" icon="🏪">
        <Text as="span" variant="heading2" style={{ color: '#0369A1', fontWeight: 800 }}>
          {formatCount(summary.activeRestaurants)}
        </Text>
      </KpiCard>
      <KpiCard label="Active Delivery Fleet" icon="🛵">
        <Text as="span" variant="heading2" style={{ color: '#0369A1', fontWeight: 800 }}>
          {formatCount(summary.activeDeliveryPartners)}
        </Text>
      </KpiCard>
      <KpiCard label="New Registered Customers" icon="👥">
        <Text as="span" variant="heading2" style={{ color: '#0369A1', fontWeight: 800 }}>
          {formatCount(summary.newCustomers)}
        </Text>
      </KpiCard>
      <KpiCard label="Average Order Value" icon="📈">
        <MoneyText value={summary.avgOrderValue} aria-label="Average order value" />
      </KpiCard>
    </div>
  );
}
