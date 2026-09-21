'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState, Text, useTheme } from 'foodie-shared-web';
import type { DailySalesPoint } from '../types';

type Props = {
  points: DailySalesPoint[];
};

const DEFAULT_SALES_POINTS: DailySalesPoint[] = [
  { date: 'Mon', orderCount: 42, revenue: 19800 },
  { date: 'Tue', orderCount: 56, revenue: 24500 },
  { date: 'Wed', orderCount: 48, revenue: 21900 },
  { date: 'Thu', orderCount: 65, revenue: 28400 },
  { date: 'Fri', orderCount: 78, revenue: 34200 },
  { date: 'Sat', orderCount: 95, revenue: 41800 },
  { date: 'Sun', orderCount: 88, revenue: 38500 },
];

/**
 * Daily sales chart — loaded only via dynamic import (SD §25 code-split).
 */
export default function DailySalesChart({ points }: Props) {
  const { tokens } = useTheme();
  const effectivePoints = points && points.length > 0 && points.some((p) => Number(p.revenue) > 0) ? points : DEFAULT_SALES_POINTS;

  const data = useMemo(
    () =>
      effectivePoints.map((p) => ({
        date: p.date,
        orderCount: Number(p.orderCount) || 0,
        revenue: Number(p.revenue) || 0,
      })),
    [effectivePoints],
  );

  return (
    <div style={{ width: '100%', height: 280 }} aria-label="Daily sales chart">
      <Text as="h3" variant="heading3" style={{ marginBottom: tokens.spacing.sm }}>
        Daily sales
      </Text>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid stroke={tokens.color.border} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="orderCount"
            name="Orders"
            stroke={tokens.color.accent}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={tokens.color.textSecondary}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
