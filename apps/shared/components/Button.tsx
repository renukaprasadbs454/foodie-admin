import React, { type ButtonHTMLAttributes } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  /** Required for accessibility — Blueprint §43. */
  'aria-label': string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { tokens } = useTheme();
  const isDisabled = disabled || loading;
  const background =
    variant === 'primary'
      ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)'
      : variant === 'danger'
        ? '#EF4444'
        : '#FFFFFF';
  const textColor =
    variant === 'secondary' ? '#374151' : '#FFFFFF';

  return (
    <button
      type="button"
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        minHeight: 40,
        padding: '10px 18px',
        borderRadius: tokens.radius.md,
        border:
          variant === 'secondary' ? `1px solid ${tokens.color.border}` : 'none',
        background,
        color: textColor,
        fontWeight: 600,
        boxShadow: variant === 'primary' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      <span style={{ color: textColor, fontWeight: 600, fontSize: 13 }}>
        {loading ? 'Loading…' : label}
      </span>
    </button>
  );
}
