'use client';

import React from 'react';
import type { AnalyticsDateRange } from '../types';

type Props = {
  value: AnalyticsDateRange;
  onChange: (next: AnalyticsDateRange) => void;
  disabled?: boolean;
};

/** Local date range — UI-API DateRangePicker (feature-local). */
export function DateRangePicker({ value, onChange, disabled }: Props) {
  const dateFrom = value?.dateFrom ?? '';
  const dateTo = value?.dateTo ?? '';
  const isInverted = Boolean(dateFrom && dateTo && dateFrom > dateTo);

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
          value={dateFrom}
          disabled={disabled}
          aria-label="Date from"
          title={isInverted ? 'From date cannot be later than To date' : undefined}
          onChange={(e) =>
            onChange({ dateFrom: e.target.value, dateTo })
          }
          style={{
            padding: '7px 12px',
            border: isInverted ? '1px solid #EF4444' : '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>
          To:
        </span>
        <input
          type="date"
          value={dateTo}
          disabled={disabled}
          aria-label="Date to"
          title={isInverted ? 'To date cannot be earlier than From date' : undefined}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          style={{
            padding: '7px 12px',
            border: isInverted ? '1px solid #EF4444' : '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        />
      </label>
    </div>
  );
}
