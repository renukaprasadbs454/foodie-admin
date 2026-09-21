'use client';

import React, { useState } from 'react';
import type { DeliveryPartnerPayout, WalletLedgerItem } from '../types';

interface PayoutDetailModalProps {
  payout: DeliveryPartnerPayout;
  walletBalance: number;
  totalEarned: number;
  ledgerHistory: WalletLedgerItem[];
  onClose: () => void;
  onRetry: (payout: DeliveryPartnerPayout) => void;
  initialTab?: 'DETAILS' | 'WALLET';
}

export function PayoutDetailModal({
  payout,
  walletBalance,
  totalEarned,
  ledgerHistory,
  onClose,
  onRetry,
  initialTab = 'DETAILS',
}: PayoutDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WALLET'>(initialTab);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = async () => {
    setIsRetrying(true);
    await onRetry(payout);
    setIsRetrying(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(12, 74, 110, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 35px -5px rgba(2, 132, 199, 0.2), 0 10px 10px -5px rgba(2, 132, 199, 0.04)',
          overflow: 'hidden',
          border: '1px solid #BAE6FD',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #075985 0%, #0C4A6E 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Payout Detail — {payout.id}
            </div>
            <div style={{ fontSize: 12, color: '#BAE6FD', marginTop: 2 }}>
              Delivery Partner: {payout.partnerName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #BAE6FD',
            backgroundColor: '#F0F9FF',
            padding: '0 24px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              padding: '12px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: activeTab === 'DETAILS' ? '#0284C7' : '#64748B',
              borderBottom: activeTab === 'DETAILS' ? '3px solid #0284C7' : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            📋 Payout Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            style={{
              padding: '12px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: activeTab === 'WALLET' ? '#0284C7' : '#64748B',
              borderBottom: activeTab === 'WALLET' ? '3px solid #0284C7' : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            👛 Wallet & Ledger Investigation
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'DETAILS' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status & Amount Highlight Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  backgroundColor: '#F0F9FF',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid #BAE6FD',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Payout Amount
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0C4A6E', marginTop: 2 }}>
                    ₹{payout.amount.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Status
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 800,
                        backgroundColor:
                          payout.status === 'SUCCESS'
                            ? '#DEF7EC'
                            : payout.status === 'PROCESSING'
                            ? '#E0F2FE'
                            : payout.status === 'REQUESTED'
                            ? '#FEF08A'
                            : '#FDE8E8',
                        color:
                          payout.status === 'SUCCESS'
                            ? '#03543F'
                            : payout.status === 'PROCESSING'
                            ? '#0369A1'
                            : payout.status === 'REQUESTED'
                            ? '#713F12'
                            : '#9B1C1C',
                      }}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Reconciliation
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        backgroundColor: payout.reconciliationStatus === 'MATCHED' ? '#ECFDF5' : '#FEF2F2',
                        color: payout.reconciliationStatus === 'MATCHED' ? '#047857' : '#B91C1C',
                      }}
                    >
                      {payout.reconciliationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Failure Reason Banner if FAILED */}
              {payout.status === 'FAILED' && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: '#991B1B',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800 }}>⚠️ Failure Reason:</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{payout.failureReason || 'Bank account detail validation failed or gateway timed out.'}</div>
                </div>
              )}

              {/* Partner Bank Details Grid */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0C4A6E', marginBottom: 10 }}>
                  🏦 Partner Beneficiary Bank Account
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    fontSize: 13,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>ACCOUNT HOLDER NAME</span>
                    <strong style={{ color: '#0C4A6E' }}>{payout.accountHolderName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>ACCOUNT NUMBER</span>
                    <strong style={{ color: '#0C4A6E' }}>{payout.accountNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>IFSC CODE</span>
                    <strong style={{ color: '#0C4A6E' }}>{payout.ifscCode}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>BANK NAME</span>
                    <strong style={{ color: '#0C4A6E' }}>{payout.bankName}</strong>
                  </div>
                </div>
              </div>

              {/* Provider & Transaction Info */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0C4A6E', marginBottom: 10 }}>
                  🔗 Gateway & Provider Metadata (Read-Only)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    fontSize: 13,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>PAYOUT PROVIDER</span>
                    <span style={{ fontWeight: 800, color: payout.provider === 'RAZORPAY' ? '#0284C7' : '#0369A1' }}>
                      {payout.provider}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>PROVIDER REF / TXN ID</span>
                    <span style={{ fontWeight: 700, color: '#0C4A6E' }}>{payout.bankRef || 'Pending assignment...'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>REQUESTED TIME</span>
                    <span style={{ color: '#0C4A6E' }}>{payout.requestedAt}</span>
                  </div>
                  <div>
                    <span style={{ color: '#0369A1', display: 'block', fontSize: 11, fontWeight: 700 }}>PROCESSED TIME</span>
                    <span style={{ color: '#0C4A6E' }}>{payout.processedAt || 'Not processed yet'}</span>
                  </div>
                </div>
              </div>

              {/* Read-only Security Guarantee Notice */}
              <div style={{ fontSize: 11, color: '#0369A1', backgroundColor: '#F0F9FF', padding: '10px 12px', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                🔒 <strong>Security Policy:</strong> Provider authentication keys and webhook secrets are kept encrypted and never exposed in admin responses.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Wallet Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Current Wallet Balance
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0C4A6E', marginTop: 2 }}>
                    ₹{walletBalance.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Total Earnings Credited
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0C4A6E', marginTop: 2 }}>
                    ₹{totalEarned.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0C4A6E', marginBottom: 8 }}>
                  📖 Recent Wallet Ledger Entries
                </div>
                <div style={{ border: '1px solid #BAE6FD', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0C4A6E' }}>
                        <th style={{ padding: '8px 12px' }}>Type</th>
                        <th style={{ padding: '8px 12px' }}>Amount</th>
                        <th style={{ padding: '8px 12px' }}>Reference</th>
                        <th style={{ padding: '8px 12px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px 12px', textAlign: 'center', color: '#64748B' }}>
                            No ledger history found for this partner wallet.
                          </td>
                        </tr>
                      ) : (
                        ledgerHistory.map((item) => (
                          <tr key={item.ledgerEntryId} style={{ borderBottom: '1px solid #F0F9FF' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  backgroundColor: item.entryType === 'CREDIT' ? '#E0F2FE' : '#FEE2E2',
                                  color: item.entryType === 'CREDIT' ? '#0369A1' : '#B91C1C',
                                }}
                              >
                                {item.entryType}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0C4A6E' }}>₹{item.amount.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>
                              {item.referenceType} — {item.referenceId}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748B' }}>{item.createdAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#F0F9FF',
            borderTop: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {payout.retryEligible && (
              <button
                type="button"
                onClick={handleRetryClick}
                disabled={isRetrying}
                style={{
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  backgroundColor: '#0284C7',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  opacity: isRetrying ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)',
                }}
              >
                {isRetrying ? 'Retrying Payout...' : '🔄 Retry Failed Payout'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 700,
              color: '#0C4A6E',
              backgroundColor: '#FFFFFF',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

