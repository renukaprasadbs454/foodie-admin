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
  const { data: rawSalesData } = useGetDailySalesQuery(queryRange);

  const chartData = useMemo(() => {
    if (!rawSalesData || rawSalesData.length === 0) return [];
    return rawSalesData.map((p) => {
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
        borderRadius: 14,
        padding: '22px 24px',
        border: '1px solid #BAE6FD',
        boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: 320,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>
            📊 Gross Marketplace Volume & Admin Earnings
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
            Revenue vs 15% Marketplace Platform Commission
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div style={{ flex: 1, width: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#0284C7', fontSize: 13, padding: 32 }}>
            No sales volume recorded for the selected date range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
              <XAxis dataKey="date" stroke="#0284C7" fontSize={12} tickLine={false} />
              <YAxis stroke="#0284C7" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                formatter={(value: any) => [`₹${Number(value ?? 0).toLocaleString()}`, '']}
                contentStyle={{ backgroundColor: '#075985', borderRadius: 8, color: '#FFFFFF', border: '1px solid #38BDF8' }}
                labelStyle={{ fontWeight: 700, color: '#BAE6FD' }}
              />
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="sales"
                name="Gross Sales Volume (₹)"
                stroke="#0284C7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#salesGrad)"
              />
              <Area
                type="monotone"
                dataKey="commission"
                name="Admin Commission (₹)"
                stroke="#38BDF8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#commGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
