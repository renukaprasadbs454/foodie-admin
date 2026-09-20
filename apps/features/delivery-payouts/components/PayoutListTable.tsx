'use client';

import React from 'react';
import type { DeliveryPartnerPayout, PayoutStatus } from '../types';

interface PayoutListTableProps {
  payouts: DeliveryPartnerPayout[];
  onSelectPayout: (payout: DeliveryPartnerPayout) => void;
  onRetryPayout: (payout: DeliveryPartnerPayout) => void;
  onViewWalletLedger: (payout: DeliveryPartnerPayout) => void;
  onApprovePayout?: (payout: DeliveryPartnerPayout) => void;
  onRejectPayout?: (payout: DeliveryPartnerPayout) => void;
}

export function PayoutListTable({
  payouts,
  onSelectPayout,
  onRetryPayout,
  onViewWalletLedger,
  onApprovePayout,
  onRejectPayout,
}: PayoutListTableProps) {
  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#000000', color: '#FFFFFF', border: '#000000', label: 'SUCCESS' };
      case 'PROCESSING':
        return { bg: '#F4F4F5', color: '#09090B', border: '#E4E4E7', label: 'PROCESSING' };
      case 'REQUESTED':
        return { bg: '#FAFAFA', color: '#09090B', border: '#E4E4E7', label: 'REQUESTED' };
      case 'FAILED':
        return { bg: '#18181B', color: '#FFFFFF', border: '#27272A', label: 'FAILED' };
      default:
        return { bg: '#F4F4F5', color: '#71717A', border: '#E4E4E7', label: status };
    }
  };

  const getReconciliationBadge = (reconcil: string) => {
    if (reconcil === 'MATCHED') {
      return { bg: '#F4F4F5', color: '#000000', label: 'MATCHED' };
    }
    return { bg: '#FAFAFA', color: '#71717A', label: reconcil.replace(/_/g, ' ') };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E4E4E7',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E4E4E7', color: '#71717A' }}>
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
                <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: '#71717A' }}>
                  No delivery partner payouts found matching current search and filter criteria.
                </td>
              </tr>
            ) : (
              payouts.map((p) => {
                const sBadge = getStatusBadge(p.status);
                const rBadge = getReconciliationBadge(p.reconciliationStatus);
                const isPending = p.status === 'REQUESTED' || (p.status as string) === 'PENDING';
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #F4F4F5',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Payout ID */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#09090B', whiteSpace: 'nowrap' }}>
                      {p.id}
                      {p.bankRef ? (
                        <div style={{ fontSize: 11, color: '#71717A', fontWeight: 400 }}>Ref: {p.bankRef}</div>
                      ) : null}
                    </td>

                    {/* Delivery Partner */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#09090B' }}>{p.partnerName}</div>
                      <div style={{ fontSize: 11, color: '#71717A' }}>{p.partnerPhone}</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#000000', fontSize: 14 }}>
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
                        <div style={{ fontSize: 11, color: '#18181B', marginTop: 3, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.failureReason}>
                          {p.failureReason}
                        </div>
                      )}
                    </td>

                    {/* Provider */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#F4F4F5',
                          color: '#09090B',
                          border: '1px solid #E4E4E7',
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
                          border: '1px solid #E4E4E7',
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
                    <td style={{ padding: '12px 16px', color: '#71717A', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.requestedAt}
                    </td>

                    {/* Processed Date */}
                    <td style={{ padding: '12px 16px', color: '#71717A', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.processedAt || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {isPending && onApprovePayout && (
                          <button
                            type="button"
                            onClick={() => onApprovePayout(p)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#FFFFFF',
                              backgroundColor: '#15803D',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        )}

                        {isPending && onRejectPayout && (
                          <button
                            type="button"
                            onClick={() => onRejectPayout(p)}
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#FFFFFF',
                              backgroundColor: '#DC2626',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectPayout(p)}
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            backgroundColor: '#000000',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
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
                              color: '#09090B',
                              backgroundColor: '#F4F4F5',
                              border: '1px solid #E4E4E7',
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
                            color: '#52525B',
                            backgroundColor: '#FAFAFA',
                            border: '1px solid #E4E4E7',
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
