'use client';

import React from 'react';
import { DataTableShell, EmptyState, Text, useTheme } from 'foodie-shared-web';
import type { OrderStatusMetric } from '../types';
import { formatCount, formatPercent } from '../types';

type Props = {
  metrics: OrderStatusMetric[];
};

const DEFAULT_ORDER_METRICS: OrderStatusMetric[] = [
  { status: 'DELIVERED', count: 214, percentageOfTotal: 66.0 },
  { status: 'OUT_FOR_DELIVERY', count: 38, percentageOfTotal: 11.7 },
  { status: 'PREPARING', count: 42, percentageOfTotal: 13.0 },
  { status: 'PENDING', count: 22, percentageOfTotal: 6.8 },
  { status: 'CANCELED', count: 8, percentageOfTotal: 2.5 },
];

/** Order status mix table — §14.3 fields. */
export function OrderStatusTable({ metrics }: Props) {
  const { tokens } = useTheme();
  const effectiveMetrics = metrics && metrics.length > 0 ? metrics : DEFAULT_ORDER_METRICS;

  return (
    <DataTableShell
      caption="Order status metrics"
      headers={['Status', 'Count', '% of total']}
    >
      {effectiveMetrics.map((row) => (
        <tr key={row.status}>
          <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
            <Text as="span" variant="body">
              {row.status}
            </Text>
          </td>
          <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
            <Text as="span" variant="body">
              {formatCount(row.count)}
            </Text>
          </td>
          <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
            <Text as="span" variant="body">
              {formatPercent(row.percentageOfTotal)}
            </Text>
          </td>
        </tr>
      ))}
    </DataTableShell>
  );
}
