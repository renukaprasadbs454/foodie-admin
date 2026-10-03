'use client';

import React from 'react';
import { Text } from 'foodie-shared-web';
import { formatMoneyInr } from '../types';

type Props = {
  value: number | string | null | undefined;
  'aria-label'?: string;
  color?: string;
};

/** INR money display — SaaS Blue theme. */
export function MoneyText({ value, 'aria-label': ariaLabel, color = '#111827' }: Props) {
  return (
    <Text as="span" variant="heading2" style={{ color, fontWeight: 700, letterSpacing: '-0.02em' }} aria-label={ariaLabel}>
      {formatMoneyInr(value)}
    </Text>
  );
}
