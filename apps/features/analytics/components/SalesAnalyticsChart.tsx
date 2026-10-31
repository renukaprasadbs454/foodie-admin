'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useGetDailySalesQuery } from '@/api/endpoints/analyticsApi';
import { defaultDateRange, type AnalyticsDateRange } from '../types';

interface Props {
  range?: AnalyticsDateRange;
}

export function SalesAnalyticsChart({ range }: Props) {
  const queryRange = useMemo(() => range ?? defaultDateRange(), [range]);
  const { data: rawSalesData, isLoading, isFetching } = useGetDailySalesQuery(queryRange);

  const chartData = useMemo(() => {
    if (!rawSalesData || !Array.isArray(rawSalesData) || rawSalesData.length === 0) return [];
    const sorted = [...rawSalesData].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((p) => {
      const rev = Number(p.revenue) || 0;
      return {
        date: p.date,
        sales: rev,
        commission: Math.round(rev * 0.15 * 100) / 100,
      };
    });
  }, [rawSalesData]);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '24px 28px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        minHeight: 340,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Gross Marketplace Volume & Admin Earnings</span>
            {isFetching ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', backgroundColor: '#E3F2FD', padding: '2px 8px', borderRadius: 10 }}>
                Updating...
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
            Revenue vs 15% Marketplace Platform Commission
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div style={{ flex: 1, width: '100%', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading && (!chartData || chartData.length === 0) ? (
          <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: 32 }}>
            Loading sales telemetry...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: 32 }}>
            No sales volume recorded for the selected date range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#42A5F5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#42A5F5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name ?? '',
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  color: '#111827',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: 13,
                  padding: '10px 14px',
                }}
                labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ paddingTop: 14, fontSize: 13, color: '#6B7280' }} />
              <Area
                type="monotone"
                dataKey="sales"
                name="Gross Sales Volume (₹)"
                stroke="#2196F3"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#salesGrad)"
                dot={{ r: 3, fill: '#2196F3' }}
                activeDot={{ r: 6, fill: '#2196F3' }}
              />
              <Area
                type="monotone"
                dataKey="commission"
                name="Admin Commission (₹)"
                stroke="#42A5F5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#commGrad)"
                dot={{ r: 3, fill: '#42A5F5' }}
                activeDot={{ r: 5, fill: '#42A5F5' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
