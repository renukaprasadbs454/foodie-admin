'use client';

import React from 'react';
import Link from 'next/link';

export function FinanceAdminDashboardPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0C4A6E', margin: 0 }}>
          💳 Finance Admin Executive Portal
        </h1>
        <p style={{ fontSize: 13, color: '#0369A1', margin: '4px 0 0' }}>
          Real-time payment settlements, delivery partner payout reconciliations, high-risk approval queues, and financial analytics.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>TODAY'S GMV</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>₹0.00</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>PENDING PAYOUTS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 4 }}>0 Batches</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>HIGH-RISK APPROVALS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#E11D48', marginTop: 4 }}>0 Requests</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>RECONCILIATION SLA</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#059669', marginTop: 4 }}>100%</div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Link
          href="/delivery-payouts"
          style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🛵</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0C4A6E' }}>Delivery Partner Payouts & Reconciliation</div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Investigate partner payouts, retry failed transactions, and run reconciliation audits.</p>
        </Link>

        <Link
          href="/payments"
          style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0284C7' }}>Customer Payment Transactions</div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>View Razorpay & Cashfree payment attempts, initiate refunds, and inspect gateway logs.</p>
        </Link>

        <Link
          href="/approvals"
          style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #BAE6FD', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)' }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>High-Risk Settlement Approvals</div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>Dual-authorization workflow for merchant payout releases above risk threshold.</p>
        </Link>
      </div>
    </div>
  );
}

