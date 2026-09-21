'use client';

import React from 'react';
import type { DeliveryPartnerPayout, PayoutStatus } from '../types';

interface PayoutListTableProps {
  payouts: DeliveryPartnerPayout[];
  onSelectPayout: (payout: DeliveryPartnerPayout) => void;
  onRetryPayout: (payout: DeliveryPartnerPayout) => void;
  onViewWalletLedger: (payout: DeliveryPartnerPayout) => void;
}

export function PayoutListTable({
  payouts,
  onSelectPayout,
  onRetryPayout,
  onViewWalletLedger,
}: PayoutListTableProps) {
  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD', label: 'SUCCESS' };
      case 'PROCESSING':
        return { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', label: 'PROCESSING' };
      case 'REQUESTED':
        return { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'REQUESTED' };
      case 'FAILED':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA', label: 'FAILED' };
      default:
        return { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', label: status };
    }
  };

  const getReconciliationBadge = (reconcil: string) => {
    if (reconcil === 'MATCHED') {
      return { bg: '#E0F2FE', color: '#0284C7', label: 'MATCHED' };
    }
    return { bg: '#F0F9FF', color: '#0369A1', label: reconcil.replace(/_/g, ' ') };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #BAE6FD',
        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1' }}>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Payout ID</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Delivery Partner</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Provider</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reconciliation</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Processed Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: '#0369A1' }}>
                  No delivery partner payouts found matching current search and filter criteria.
                </td>
              </tr>
            ) : (
              payouts.map((p) => {
                const sBadge = getStatusBadge(p.status);
                const rBadge = getReconciliationBadge(p.reconciliationStatus);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #F0F9FF',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Payout ID */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0C4A6E', whiteSpace: 'nowrap' }}>
                      {p.id}
                      {p.bankRef ? (
                        <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 400 }}>Ref: {p.bankRef}</div>
                      ) : null}
                    </td>

                    {/* Delivery Partner */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0C4A6E' }}>{p.partnerName}</div>
                      <div style={{ fontSize: 11, color: '#0369A1' }}>{p.partnerPhone}</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0284C7', fontSize: 14 }}>
                      ₹{p.amount.toFixed(2)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: sBadge.bg,
                          color: sBadge.color,
                          border: `1px solid ${sBadge.border}`,
                          padding: '3px 9px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block',
                        }}
                      >
                        {sBadge.label}
                      </span>
                      {p.status === 'FAILED' && p.failureReason && (
                        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.failureReason}>
                          {p.failureReason}
                        </div>
                      )}
                    </td>

                    {/* Provider */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#E0F2FE',
                          color: '#0284C7',
                          border: '1px solid #BAE6FD',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {p.provider}
                      </span>
                    </td>

                    {/* Reconciliation */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: rBadge.bg,
                          color: rBadge.color,
                          border: '1px solid #BAE6FD',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {rBadge.label}
                      </span>
                    </td>

                    {/* Requested Date */}
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.requestedAt}
                    </td>

                    {/* Processed Date */}
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.processedAt || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => onSelectPayout(p)}
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            backgroundColor: '#0284C7',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                          }}
                        >
                          View
                        </button>

                        {p.retryEligible && (
                          <button
                            type="button"
                            onClick={() => onRetryPayout(p)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#0284C7',
                              backgroundColor: '#E0F2FE',
                              border: '1px solid #BAE6FD',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            Retry
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onViewWalletLedger(p)}
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0369A1',
                            backgroundColor: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                          title="Inspect Partner Wallet Ledger"
                        >
                          Wallet 
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
