import React, { type HTMLAttributes, type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
};

export function Card({ title, subtitle, children, style, ...rest }: CardProps) {
  const { tokens } = useTheme();
  return (
    <div
      {...rest}
      style={{
        background: tokens.color.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.lg,
        border: `1px solid ${tokens.color.border}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        display: 'grid',
        gap: tokens.spacing.sm,
        ...style,
      }}
    >
      {title ? <Text as="h3" variant="heading3">{title}</Text> : null}
      {subtitle ? (
        <Text variant="bodySmall" color={tokens.color.textSecondary}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </div>
  );
}
