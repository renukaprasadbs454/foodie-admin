import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

export type BadgeProps = {
  label: string;
  tone?: 'accent' | 'success' | 'error' | 'warning' | 'neutral';
  'aria-label': string;
};

export function Badge({
  label,
  tone = 'accent',
  'aria-label': ariaLabel,
}: BadgeProps) {
  const badgeStyles = {
    success: {
      bg: '#DCFCE7',
      color: '#15803D',
      border: '1px solid #BBF7D0',
    },
    error: {
      bg: '#FEE2E2',
      color: '#B91C1C',
      border: '1px solid #FECACA',
    },
    warning: {
      bg: '#FEF3C7',
      color: '#B45309',
      border: '1px solid #FDE68A',
    },
    neutral: {
      bg: '#F3F4F6',
      color: '#374151',
      border: '1px solid #E5E7EB',
    },
    accent: {
      bg: '#E3F2FD',
      color: '#1E40AF',
      border: '1px solid #BFDBFE',
    },
  }[tone] || {
    bg: '#E3F2FD',
    color: '#1E40AF',
    border: '1px solid #BFDBFE',
  };

  return (
    <span
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 9999,
        backgroundColor: badgeStyles.bg,
        color: badgeStyles.color,
        border: badgeStyles.border,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
