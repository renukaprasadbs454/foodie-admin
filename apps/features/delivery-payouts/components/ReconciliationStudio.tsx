'use client';

import React, { useState } from 'react';
import type { DeliveryPartnerPayout, ReconciliationOverview, ReconciliationStatus } from '../types';

interface ReconciliationStudioProps {
  overview: ReconciliationOverview;
  onSelectPayout: (payout: DeliveryPartnerPayout) => void;
}

export function ReconciliationStudio({ overview, onSelectPayout }: ReconciliationStudioProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ReconciliationStatus | 'ALL_DISCREPANCIES'>('ALL_DISCREPANCIES');

  const filteredDiscrepancies = overview.discrepancies.filter((item) => {
    if (selectedStatusFilter === 'ALL_DISCREPANCIES') return true;
    return item.reconciliationStatus === selectedStatusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Reconciliation Header Banner */}
      <div
        style={{
          backgroundColor: '#0284C7',
          borderRadius: 14,
          padding: '24px 28px',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
             Payout Reconciliation Studio
          </div>
          <div style={{ fontSize: 13, color: '#E0F2FE', marginTop: 4, maxWidth: 600 }}>
            Automated cross-reconciliation engine auditing local ledger entries against Razorpay and Cashfree provider settlement logs.
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#0369A1',
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #BAE6FD',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: 11, color: '#E0F2FE', textTransform: 'uppercase', fontWeight: 700 }}>
            Audit Health Rate
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
            {overview.discrepancies.length === 0
              ? '100%'
              : `${Math.round(
                  (overview.matchedCount /
                    (overview.matchedCount + overview.discrepancies.length)) *
                    100
                )}%`}
          </div>
        </div>
      </div>

      {/* Reconciliation Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {/* MATCHED */}
        <div
          onClick={() => setSelectedStatusFilter('ALL_DISCREPANCIES')}
          style={{
            backgroundColor: '#FFFFFF',
            border: selectedStatusFilter === 'ALL_DISCREPANCIES' ? '2px solid #0284C7' : '1px solid #BAE6FD',
            borderRadius: 12,
            padding: '16px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
            MATCHED
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
            {overview.matchedCount}
          </div>
          <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>Zero discrepancy</div>
        </div>

        {/* AMOUNT MISMATCH */}
        <div
          onClick={() => setSelectedStatusFilter('AMOUNT_MISMATCH')}
          style={{
            backgroundColor: '#FFFFFF',
            border: selectedStatusFilter === 'AMOUNT_MISMATCH' ? '2px solid #0284C7' : '1px solid #BAE6FD',
            borderRadius: 12,
            padding: '16px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
            AMOUNT MISMATCH
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
            {overview.amountMismatchCount}
          </div>
          <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>Ledger vs Provider diff</div>
        </div>

        {/* STATUS MISMATCH */}
        <div
          onClick={() => setSelectedStatusFilter('STATUS_MISMATCH')}
          style={{
            backgroundColor: '#FFFFFF',
            border: selectedStatusFilter === 'STATUS_MISMATCH' ? '2px solid #0284C7' : '1px solid #BAE6FD',
            borderRadius: 12,
            padding: '16px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
            STATUS MISMATCH
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
            {overview.statusMismatchCount}
          </div>
          <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>State desynchronization</div>
        </div>

        {/* MISSING PROVIDER RECORD */}
        <div
          onClick={() => setSelectedStatusFilter('MISSING_PROVIDER_RECORD')}
          style={{
            backgroundColor: '#FFFFFF',
            border: selectedStatusFilter === 'MISSING_PROVIDER_RECORD' ? '2px solid #0284C7' : '1px solid #BAE6FD',
            borderRadius: 12,
            padding: '16px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>
            MISSING PROVIDER RECORD
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
            {overview.missingProviderRecordCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>No bank settlement id</div>
        </div>

        {/* DUPLICATE */}
        <div
          onClick={() => setSelectedStatusFilter('DUPLICATE')}
          style={{
            backgroundColor: '#FFFFFF',
            border: selectedStatusFilter === 'DUPLICATE' ? '2px solid #DB2777' : '1px solid #BAE6FD',
            borderRadius: 12,
            padding: '16px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#DB2777', textTransform: 'uppercase' }}>
            DUPLICATE
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
            {overview.duplicateCount}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Multiple ref records</div>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #BAE6FD',
          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0C4A6E' }}>
            Audit Log — Discrepancies & Anomalies
          </div>
          {selectedStatusFilter !== 'ALL_DISCREPANCIES' && (
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('ALL_DISCREPANCIES')}
              style={{
                fontSize: 12,
                color: '#0284C7',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Clear Status Filter ({selectedStatusFilter})
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1' }}>
                <th style={{ padding: '10px 14px' }}>Payout ID</th>
                <th style={{ padding: '10px 14px' }}>Delivery Partner</th>
                <th style={{ padding: '10px 14px' }}>Amount</th>
                <th style={{ padding: '10px 14px' }}>Provider</th>
                <th style={{ padding: '10px 14px' }}>Reconciliation Flag</th>
                <th style={{ padding: '10px 14px' }}>Requested Time</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: '#0284C7', backgroundColor: '#F0F9FF' }}>
                     All records in this category are fully matched with provider logs!
                  </td>
                </tr>
              ) : (
                filteredDiscrepancies.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F0F9FF' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0C4A6E' }}>{item.id}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0C4A6E' }}>{item.partnerName}</div>
                      <div style={{ fontSize: 11, color: '#0369A1' }}>{item.partnerPhone}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284C7' }}>₹{item.amount.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: 4 }}>
                        {item.provider}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          backgroundColor: '#FEF2F2',
                          color: '#B91C1C',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {item.reconciliationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 12 }}>{item.requestedAt}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onSelectPayout(item)}
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0284C7',
                          backgroundColor: '#E0F2FE',
                          border: '1px solid #BAE6FD',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        View Reconciliation Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
