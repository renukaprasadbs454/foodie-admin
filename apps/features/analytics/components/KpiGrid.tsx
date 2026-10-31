'use client';

import React from 'react';
import { Text } from 'foodie-shared-web';
import type { DashboardSummary, TrendIndicator } from '../types';
import {
  formatCount,
  calculatePercentageChange,
  parseTrendIndicator,
} from '../types';
import { MoneyText } from './MoneyText';

type Props = {
  summary: DashboardSummary;
  previousSummary?: DashboardSummary | null;
  isLoadingComparison?: boolean;
};

function KpiCard({
  label,
  children,
  icon,
  trend,
  isPrimary = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  trend: TrendIndicator;
  isPrimary?: boolean;
  onClick?: () => void;
}) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={{
        padding: '22px 24px',
        borderRadius: 20,
        background: isPrimary ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : '#FFFFFF',
        border: isPrimary ? 'none' : '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: isPrimary
          ? '0 10px 25px -5px rgba(33, 150, 243, 0.35), 0 8px 10px -6px rgba(33, 150, 243, 0.2)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        cursor: isInteractive ? 'pointer' : 'default',
        minHeight: 130,
        transition: isInteractive ? 'transform 0.15s ease, box-shadow 0.15s ease' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            color: isPrimary ? 'rgba(255, 255, 255, 0.9)' : '#6B7280',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        {icon ? (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.2)' : '#E3F2FD',
              color: isPrimary ? '#FFFFFF' : '#2196F3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
        <div>{children}</div>
        <span
          aria-label={`Comparison trend: ${trend.text}`}
          title={
            trend.text !== '—' && trend.text !== '...'
              ? `Period-over-period change: ${trend.text}`
              : 'Comparison value unavailable'
          }
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isPrimary
              ? '#FFFFFF'
              : trend.isNeutral
              ? '#4B5563'
              : trend.isPositive
              ? '#15803D'
              : '#DC2626',
            backgroundColor: isPrimary
              ? trend.isNeutral
                ? 'rgba(255, 255, 255, 0.2)'
                : trend.isPositive
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(239, 68, 68, 0.35)'
              : trend.isNeutral
              ? '#F3F4F6'
              : trend.isPositive
              ? '#DCFCE7'
              : '#FEE2E2',
            border: isPrimary
              ? '1px solid rgba(255, 255, 255, 0.3)'
              : trend.isNeutral
              ? '1px solid #E5E7EB'
              : trend.isPositive
              ? '1px solid #BBF7D0'
              : '1px solid #FECACA',
            padding: '3px 9px',
            borderRadius: 9999,
            cursor: 'default',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {trend.text}
        </span>
      </div>
    </div>
  );
}

/** Summary KPI tiles — SaaS Blue theme with primary gradient card. */
export function KpiGrid({ summary, previousSummary, isLoadingComparison = false }: Props) {
  const s = summary as any;

  const resolveCardTrend = (
    currentVal: number | string | undefined,
    prevVal: number | string | undefined,
    explicitTrend: unknown,
  ): TrendIndicator => {
    // 1. Direct explicit trend if supplied by backend or props
    const direct = parseTrendIndicator(explicitTrend);
    if (direct) return direct;

    // 2. Calculated comparison if previousSummary is available
    if (previousSummary) {
      const computed = calculatePercentageChange(currentVal, prevVal);
      if (computed) return computed;
    }

    // 3. While comparison data is still loading
    if (isLoadingComparison) {
      return { text: '...', isPositive: true, isNeutral: true };
    }

    // 4. If comparison is unavailable, show standard unavailable state
    return { text: '—', isPositive: true, isNeutral: true };
  };

  const revenueTrend = resolveCardTrend(
    summary.totalRevenue,
    previousSummary?.totalRevenue,
    summary.revenueTrend ?? s.totalRevenueTrend ?? summary.trends?.revenue ?? summary.trends?.totalRevenue
  );

  const ordersTrend = resolveCardTrend(
    summary.totalOrders,
    previousSummary?.totalOrders,
    summary.ordersTrend ?? s.totalOrdersTrend ?? summary.trends?.orders ?? summary.trends?.totalOrders
  );

  const storesTrend = resolveCardTrend(
    summary.activeRestaurants,
    previousSummary?.activeRestaurants,
    summary.storesTrend ?? s.activeRestaurantsTrend ?? summary.trends?.stores ?? summary.trends?.restaurants ?? summary.trends?.activeRestaurants
  );

  const fleetTrend = resolveCardTrend(
    summary.activeDeliveryPartners,
    previousSummary?.activeDeliveryPartners,
    summary.fleetTrend ?? s.activeDeliveryPartnersTrend ?? summary.trends?.fleet ?? summary.trends?.deliveryPartners ?? summary.trends?.activeDeliveryPartners
  );

  const customersTrend = resolveCardTrend(
    summary.newCustomers,
    previousSummary?.newCustomers,
    summary.customersTrend ?? s.newCustomersTrend ?? summary.trends?.customers ?? summary.trends?.newCustomers
  );

  const aovTrend = resolveCardTrend(
    summary.avgOrderValue,
    previousSummary?.avgOrderValue,
    summary.aovTrend ?? s.avgOrderValueTrend ?? summary.trends?.aov ?? summary.trends?.avgOrderValue
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
      }}
    >
      <KpiCard
        label="Total Marketplace Revenue"
        isPrimary={true}
        trend={revenueTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
      >
        <MoneyText value={summary.totalRevenue} aria-label="Total revenue" color="#FFFFFF" />
      </KpiCard>

      <KpiCard
        label="Total Orders"
        trend={ordersTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        }
      >
        <Text as="span" variant="heading2" style={{ color: '#111827', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {formatCount(summary.totalOrders)}
        </Text>
      </KpiCard>

      <KpiCard
        label="Active Stores / Vendors"
        trend={storesTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
      >
        <Text as="span" variant="heading2" style={{ color: '#111827', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {formatCount(summary.activeRestaurants)}
        </Text>
      </KpiCard>

      <KpiCard
        label="Active Delivery Fleet"
        trend={fleetTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        }
      >
        <Text as="span" variant="heading2" style={{ color: '#111827', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {formatCount(summary.activeDeliveryPartners)}
        </Text>
      </KpiCard>

      <KpiCard
        label="Registered Customers"
        trend={customersTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      >
        <Text as="span" variant="heading2" style={{ color: '#111827', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {formatCount(summary.newCustomers)}
        </Text>
      </KpiCard>

      <KpiCard
        label="Average Order Value"
        trend={aovTrend}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        }
      >
        <MoneyText value={summary.avgOrderValue} aria-label="Average order value" color="#111827" />
      </KpiCard>
    </div>
  );
}
