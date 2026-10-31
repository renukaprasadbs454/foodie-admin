'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  EmptyState,
  Text,
  Toast,
  trackAnalyticsEvent,
  useConnectivity,
  useTheme,
} from 'foodie-shared-web';
import {
  useGetDailySalesQuery,
  useGetDashboardSummaryQuery,
  useGetOrderStatusMetricsQuery,
} from '@/api/endpoints/analyticsApi';
import { selectAdminRole } from '@/features/auth/authSlice';
import { useAppSelector } from '@/store/hooks';
import {
  canAccessAnalyticsSummary,
  canAccessOrderStatusMetrics,
} from '@/lib/routeGuards';
import { AnalyticsSkeleton } from '../components/AnalyticsSkeleton';
import { DateRangePicker } from '../components/DateRangePicker';
import { KpiGrid } from '../components/KpiGrid';
import { OrderStatusTable } from '../components/OrderStatusTable';
import { PermissionDenied } from '../components/PermissionDenied';
import {
  getDashboardPresetRange,
  getPreviousPeriodRange,
  validateDateRange,
  type AnalyticsDateRange,
} from '../types';

/** Code-split chart bundle — SD §25 / UI-API Analytics acceptance. */
const DailySalesChart = dynamic(
  () => import('../components/DailySalesChart'),
  {
    ssr: false,
    loading: () => <AnalyticsSkeleton />,
  },
);

function toUnwrappedApiError(err: unknown): {
  code: string;
  message: string;
  fields: null;
} {
  if (err && typeof err === 'object') {
    const withData = err as { data?: { code?: string; message?: string } };
    if (withData.data?.code) {
      return {
        code: withData.data.code,
        message: withData.data.message ?? 'Something went wrong',
        fields: null,
      };
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong', fields: null };
}

/**
 * P2-ADM-02 AdminAnalytics — summary + daily-sales + order-status metrics.
 * Order-status restricted to OPS / SUPER_ADMIN.
 */
export function AnalyticsPage() {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const role = useAppSelector(selectAdminRole);
  const canSummary = canAccessAnalyticsSummary(role);
  const canStatus = canAccessOrderStatusMetrics(role);

  const [selectedPreset, setSelectedPreset] = useState<string | null>('Last 7 Days');
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyticsDateRange>(() => getDashboardPresetRange('Last 7 Days'));
  const [applied, setApplied] = useState<AnalyticsDateRange>(() => getDashboardPresetRange('Last 7 Days'));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const previousRange = useMemo(() => getPreviousPeriodRange(applied), [applied.dateFrom, applied.dateTo]);

  const summaryQuery = useGetDashboardSummaryQuery(applied, {
    skip: !canSummary,
    refetchOnFocus: true,
  });
  const previousQuery = useGetDashboardSummaryQuery(previousRange, {
    skip: !canSummary,
    refetchOnFocus: true,
  });
  const salesQuery = useGetDailySalesQuery(applied, {
    skip: !canSummary,
    refetchOnFocus: true,
  });
  const statusQuery = useGetOrderStatusMetricsQuery(applied, {
    skip: !canStatus,
    refetchOnFocus: true,
  });

  const handledErrorRef = React.useRef<unknown>(null);

  useEffect(() => {
    trackAnalyticsEvent('admin_analytics_viewed');
    trackAnalyticsEvent('analytics_viewed');
  }, []);

  useEffect(() => {
    const err = summaryQuery.error ?? salesQuery.error;
    if (!err) return;
    if (handledErrorRef.current !== err) {
      handledErrorRef.current = err;
      const unwrapped = toUnwrappedApiError(err);
      if (unwrapped.code !== 'FORBIDDEN' && unwrapped.code !== 'UNAUTHORIZED') {
        setToast({ message: unwrapped.message, variant: 'error' });
      }
    }
  }, [
    summaryQuery.isError,
    summaryQuery.error,
    salesQuery.isError,
    salesQuery.error,
  ]);

  const summaryForbidden = useMemo(() => {
    if (!summaryQuery.isError || !summaryQuery.error) return false;
    return toUnwrappedApiError(summaryQuery.error).code === 'FORBIDDEN';
  }, [summaryQuery.isError, summaryQuery.error]);

  const handlePresetClick = (presetLabel: string) => {
    const range = getDashboardPresetRange(presetLabel);
    setRangeError(null);
    setSelectedPreset(presetLabel);
    setDraft(range);
    setApplied(range);
    trackAnalyticsEvent('date_range_changed', {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      screen: 'analytics',
      preset: presetLabel,
    });
  };

  const handleDraftChange = (next: AnalyticsDateRange) => {
    setDraft(next);
    setSelectedPreset(null);
    if (rangeError) {
      if (next.dateFrom && next.dateTo && next.dateFrom <= next.dateTo) {
        setRangeError(null);
      }
    }
  };

  const applyRange = () => {
    if (!draft.dateFrom || !draft.dateTo) {
      const msg = 'Both start date and end date are required.';
      setRangeError(msg);
      setToast({ message: msg, variant: 'error' });
      return;
    }
    const validated = validateDateRange(draft.dateFrom, draft.dateTo);
    if (!validated.ok) {
      setRangeError(validated.message);
      setToast({ message: validated.message, variant: 'error' });
      return;
    }
    setRangeError(null);
    setApplied(validated.range);

    const presets = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'];
    const matched = presets.find((label) => {
      const r = getDashboardPresetRange(label);
      return r.dateFrom === validated.range.dateFrom && r.dateTo === validated.range.dateTo;
    });
    setSelectedPreset(matched ?? null);

    setToast({
      message: `Custom date range applied: ${validated.range.dateFrom} to ${validated.range.dateTo}`,
      variant: 'success',
    });
    trackAnalyticsEvent('date_range_changed', {
      dateFrom: validated.range.dateFrom,
      dateTo: validated.range.dateTo,
      screen: 'analytics',
    });
  };

  if (!canSummary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        <Text as="h1" variant="heading1">
          Analytics
        </Text>
        <PermissionDenied
          description={
            role === 'SUPPORT'
              ? 'SUPPORT cannot view analytics.'
              : 'Admin role claim is unavailable. Analytics stay fail-closed.'
          }
        />
      </div>
    );
  }

  const loading =
    (summaryQuery.isLoading && !summaryQuery.data) ||
    (salesQuery.isLoading && !salesQuery.data);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            Executive Marketplace Analytics
          </div>
          <p style={{ color: '#6B7280', fontSize: 13, margin: '4px 0 0' }}>
            Deep-dive multi-vendor telemetry, revenue trends, and operational metrics
          </p>
        </div>
      </div>

      {!isConnected ? (
        <Text as="p" variant="caption" color={tokens.color.warning}>
          Offline — showing cached analytics when available.
        </Text>
      ) : null}

      {/* Timeframe Filter Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Analytics Timeframe Filter</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#2196F3',
                backgroundColor: '#E3F2FD',
                padding: '3px 10px',
                borderRadius: 12,
                border: '1px solid #BFDBFE',
              }}
            >
              {applied.dateFrom} to {applied.dateTo}
              {summaryQuery.isFetching ? ' (Updating...)' : ''}
            </span>
          </div>

          {/* Preset shortcuts */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Today' },
              { label: 'Yesterday' },
              { label: 'Last 7 Days' },
              { label: 'Last 30 Days' },
              { label: 'This Month' },
            ].map((preset) => {
              const range = getDashboardPresetRange(preset.label);
              const isPresetActive = selectedPreset === preset.label ||
                (selectedPreset === null && applied.dateFrom === range.dateFrom && applied.dateTo === range.dateTo);
              const isHovered = hoveredPreset === preset.label;

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.label)}
                  onMouseEnter={() => setHoveredPreset(preset.label)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: isPresetActive ? '1px solid #90CAF9' : isHovered ? '1px solid #D1D5DB' : '1px solid #E5E7EB',
                    backgroundColor: isPresetActive ? '#E3F2FD' : isHovered ? '#F5F7FA' : '#FFFFFF',
                    color: isPresetActive ? '#1976D2' : isHovered ? '#111827' : '#6B7280',
                    fontSize: 12,
                    fontWeight: isPresetActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <DateRangePicker value={draft} onChange={handleDraftChange} />
          <button
            type="button"
            aria-label="Apply date range"
            onClick={applyRange}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
              transition: 'opacity 0.15s ease',
            }}
          >
            Apply Custom Range
          </button>
        </div>
      </div>

      {rangeError ? (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{rangeError}</span>
        </div>
      ) : null}

      {summaryForbidden ? (
        <PermissionDenied description="Server denied analytics for your role (FORBIDDEN)." />
      ) : loading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <div style={{ opacity: summaryQuery.isFetching ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
            <KpiGrid
              summary={
                summaryQuery.data ?? {
                  totalOrders: 0,
                  totalRevenue: 0,
                  activeRestaurants: 0,
                  activeDeliveryPartners: 0,
                  newCustomers: 0,
                  avgOrderValue: 0,
                }
              }
              previousSummary={previousQuery.data}
              isLoadingComparison={previousQuery.isLoading}
            />
          </div>

          <DailySalesChart
            points={salesQuery.data ?? []}
          />

          <div style={{ marginTop: tokens.spacing.md }}>
            <OrderStatusTable
              metrics={statusQuery.data ?? []}
            />
          </div>
        </>
      )}

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
