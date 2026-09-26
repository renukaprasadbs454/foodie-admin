'use client';

import React from 'react';
import { Text } from 'foodie-shared-web';
import { formatMoneyInr } from '../types';

type Props = {
  value: number | string | null | undefined;
  'aria-label'?: string;
};

/** INR money display — UI-API MoneyText (Sky Blue theme). */
export function MoneyText({ value, 'aria-label': ariaLabel }: Props) {
  return (
    <Text as="span" variant="heading2" style={{ color: '#0369A1', fontWeight: 800 }} aria-label={ariaLabel}>
      {formatMoneyInr(value)}
    </Text>
  );
}
