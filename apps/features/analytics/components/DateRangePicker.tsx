'use client';

import React from 'react';
import { Text, useTheme } from 'foodie-shared-web';
import type { AnalyticsDateRange } from '../types';

type Props = {
  value: AnalyticsDateRange;
  onChange: (next: AnalyticsDateRange) => void;
  disabled?: boolean;
};

/** Local date range — UI-API DateRangePicker (feature-local). */
export function DateRangePicker({ value, onChange, disabled }: Props) {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>
          From:
        </span>
        <input
          type="date"
          value={value.dateFrom}
          disabled={disabled}
          aria-label="Date from"
          onChange={(e) =>
            onChange({ ...value, dateFrom: e.target.value })
          }
          style={{
            padding: '7px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>
          To:
        </span>
        <input
          type="date"
          value={value.dateTo}
          disabled={disabled}
          aria-label="Date to"
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          style={{
            padding: '7px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </label>
    </div>
  );
}
