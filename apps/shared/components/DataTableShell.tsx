import React, { type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Text } from './Text';

/**
 * Accessible table shell for Admin data tables — System Design §27 Admin a11y.
 * Column/row content is supplied by Admin features; this is a primitive shell only.
 */
export type DataTableShellProps = {
  caption: string;
  headers: string[];
  children: ReactNode;
};

export function DataTableShell({
  caption,
  headers,
  children,
}: DataTableShellProps) {
  const { tokens } = useTheme();
  return (
    <div
      style={{
        overflowX: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          color: tokens.color.textPrimary,
          fontSize: 14,
        }}
      >
        {caption ? (
          <caption style={{ textAlign: 'left', padding: '16px 20px', fontWeight: 700, color: '#111827', fontSize: 16 }}>
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '12px 20px',
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
