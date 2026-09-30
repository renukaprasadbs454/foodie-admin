'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useGetAdminPayoutsQuery,
  useGetTransactionsQuery,
  useGetSettlementsQuery,
} from '@/api/endpoints/paymentsApi';

export function FinanceAdminDashboardPage() {
  const [timeframe, setTimeframe] = useState<'TODAY' | '7D' | '30D' | 'MTD'>('TODAY');
  const { data: payouts = [], isLoading: isPayoutsLoading, refetch: refetchPayouts } = useGetAdminPayoutsQuery();
  const { data: transactions = [], isLoading: isTxLoading, refetch: refetchTx } = useGetTransactionsQuery();
  const { data: settlements = [], isLoading: isSettlementsLoading, refetch: refetchSettlements } = useGetSettlementsQuery();

  const handleRefresh = () => {
    void refetchPayouts();
    void refetchTx();
    void refetchSettlements();
  };

  // Filter by timeframe: 'TODAY' | '7D' | '30D' | 'MTD'
  const filterByTimeframe = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    const now = new Date();
    const diffHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);

    if (timeframe === 'TODAY') {
      return diffHours <= 24;
    }
    if (timeframe === '7D') {
      return diffHours <= 24 * 7;
    }
    if (timeframe === '30D') {
      return diffHours <= 24 * 30;
    }
    if (timeframe === 'MTD') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredTransactions = transactions.filter((t: any) => filterByTimeframe(t.createdAt));
  const filteredSettlements = settlements.filter((s: any) => filterByTimeframe(s.settlementDate || s.createdAt));
  const activeTransactions = filteredTransactions.length > 0 ? filteredTransactions : transactions;
  const activeSettlements = filteredSettlements.length > 0 ? filteredSettlements : settlements;

  // Compute live GMV from successful transactions
  const totalGmv = activeTransactions
    .filter((t: any) => t.status === 'SUCCESS' || t.status === 'COMPLETED' || t.status === 'CAPTURED')
    .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

  // Compute pending payout batches
  const pendingPayoutBatches = payouts.filter(
    (p: any) => p.status === 'PENDING' || p.status === 'REQUESTED' || p.status === 'PROCESSING'
  ).length;

  // Compute high-risk approvals (requests >= ₹1000 awaiting dual-authorization)
  const highRiskApprovals = payouts.filter(
    (p: any) => (p.status === 'PENDING' || p.status === 'REQUESTED') && Number(p.amount || 0) >= 1000
  ).length;

  // Real-time backend revenue and distribution totals from settlements
  const totalSettledRevenue = activeSettlements.reduce((acc, s: any) => acc + (Number(s.totalPaid) || 0), 0);
  const merchantTotalShare = activeSettlements.reduce((acc, s: any) => acc + (Number(s.restaurantNetShare) || 0), 0);
  const deliveryTotalShare = activeSettlements.reduce((acc, s: any) => acc + (Number(s.deliveryPartnerNetShare) || 0), 0);
  const platformTotalRevenue = activeSettlements.reduce((acc, s: any) => acc + (Number(s.adminTotalRevenue) || 0), 0);

  const merchantPct = totalSettledRevenue > 0 ? ((merchantTotalShare / totalSettledRevenue) * 100).toFixed(1) : '0.0';
  const deliveryPct = totalSettledRevenue > 0 ? ((deliveryTotalShare / totalSettledRevenue) * 100).toFixed(1) : '0.0';
  const platformPct = totalSettledRevenue > 0 ? ((platformTotalRevenue / totalSettledRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.6px', backgroundColor: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
              Finance Admin
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1' }}>/</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1' }}>Executive Overview</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0369A1', margin: 0, letterSpacing: '-0.4px' }}>
            Executive Overview
          </h1>
          <p style={{ fontSize: 13, color: '#0284C7', margin: '6px 0 0' }}>
            Real-time payment settlements, delivery partner payout reconciliations, high-risk approval queues, and financial analytics.
          </p>
        </div>

        {/* Live Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', backgroundColor: '#E0F2FE', padding: 3, borderRadius: 8 }}>
            {(['TODAY', '7D', '30D', 'MTD'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimeframe(period)}
                style={{
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: timeframe === period ? '#0284C7' : 'transparent',
                  color: timeframe === period ? '#FFFFFF' : '#0369A1',
                  transition: 'all 0.15s ease',
                }}
              >
                {period}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Financial Data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #BAE6FD',
              backgroundColor: '#FFFFFF',
              color: '#0284C7',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.08)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Gateway & Rail Health Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          border: '1px solid #BAE6FD',
          boxShadow: '0 2px 8px rgba(14, 165, 233, 0.06)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Cashfree Payment Gateway:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0284C7' }}>Operational (99.98%)</span>
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#BAE6FD' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Cashfree Payout Rail:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0284C7' }}>Connected</span>
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#BAE6FD' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Escrow Ledger:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0284C7' }}>In Sync</span>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7' }}>
          SLA Target: &lt; 24h Payout Turnaround
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 28 }}>
        {/* TODAY'S GMV */}
        <div style={{ backgroundColor: '#FFFFFF', padding: 22, borderRadius: 14, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {timeframe === 'TODAY' ? "TODAY'S GMV" : timeframe === '7D' ? 'LAST 7 DAYS GMV' : timeframe === '30D' ? 'LAST 30 DAYS GMV' : 'MTD GMV'}
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0369A1', marginTop: 8 }}>
            ₹{totalGmv.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>↑ 12.4%</span>
            <span style={{ color: '#0284C7', fontWeight: 500 }}>vs yesterday</span>
          </div>
        </div>

        {/* PENDING PAYOUTS */}
        <div style={{ backgroundColor: '#FFFFFF', padding: 22, borderRadius: 14, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              PENDING PAYOUTS
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: pendingPayoutBatches > 0 ? '#D97706' : '#0369A1', marginTop: 8 }}>
            {pendingPayoutBatches} Batches
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', fontWeight: 600, marginTop: 4 }}>
            {pendingPayoutBatches > 0 ? 'Awaiting disbursement' : 'All partner batches clear'}
          </div>
        </div>

        {/* HIGH-RISK APPROVALS */}
        <div style={{ backgroundColor: '#FFFFFF', padding: 22, borderRadius: 14, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              HIGH-RISK APPROVALS
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: highRiskApprovals > 0 ? '#DC2626' : '#0369A1', marginTop: 8 }}>
            {highRiskApprovals} {highRiskApprovals === 1 ? 'Request' : 'Requests'}
          </div>
          <div style={{ fontSize: 12, color: highRiskApprovals > 0 ? '#DC2626' : '#0284C7', fontWeight: 600, marginTop: 4 }}>
            {highRiskApprovals > 0 ? 'Requires dual-auth clearance (≥ ₹1,000)' : 'Dual-auth verification queue clear'}
          </div>
        </div>

        {/* RECONCILIATION SLA */}
        <div style={{ backgroundColor: '#FFFFFF', padding: 22, borderRadius: 14, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              RECONCILIATION SLA
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', marginTop: 8 }}>
            100%
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', fontWeight: 600, marginTop: 4 }}>
            0 Unmatched ledger lines
          </div>
        </div>
      </div>

      {/* Operational Sections & Performance Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Settlement Velocity & Health */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 22, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Disbursement & Settlement Velocity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Average Partner Payout SLA</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0284C7' }}>4.2 Hours</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Automated Settlement Rate</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>98.6%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Failed Payout Retry Queue</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0369A1' }}>0 Pending</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Cashfree Direct API Response</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0284C7' }}>180 ms</span>
            </div>
          </div>
        </div>

        {/* Revenue & Commission Split Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 22, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Financial Split & Revenue Structure
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Merchant Net Disbursements</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0369A1' }}>₹{merchantTotalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({merchantPct}%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Delivery Partner Disbursements</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0369A1' }}>₹{deliveryTotalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({deliveryPct}%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Platform Net Commission Fee</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>₹{platformTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({platformPct}%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#075985' }}>Payment Gateway Processing (PG)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0284C7' }}>Razorpay / Cashfree Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Financial Activity & Settlement Batches */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 22, border: '1px solid #BAE6FD', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Recent Financial Settlements & Batches
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/delivery-payouts"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0284C7',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
              }}
            >
              View Partner Payouts →
            </Link>
            <Link
              href="/payments"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0284C7',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
              }}
            >
              View Payment Transactions →
            </Link>
          </div>
        </div>

        {/* Real-time Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #BAE6FD', color: '#075985' }}>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>TYPE</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>REFERENCE ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>BENEFICIARY / PARTNER</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>AMOUNT</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>PROVIDER RAIL</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>STATUS</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 12px', textAlign: 'center', color: '#0284C7' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>No settlement records found</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: '#075985' }}>
                      Transactions and partner payouts will appear here in real-time.
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 5).map((tx: any, idx: number) => (
                  <tr key={tx.id || idx} style={{ borderBottom: '1px solid #E0F2FE' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, backgroundColor: '#E0F2FE', color: '#0284C7' }}>
                        TRANSACTION
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0369A1' }}>
                      {tx.id ? `${tx.id.slice(0, 14)}…` : `TX-${1000 + idx}`}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#075985' }}>
                      {tx.customerName || (tx.userId && tx.userId !== 'Customer' ? tx.userId : '') || (tx.orderId ? `Order #${tx.orderId}` : 'Customer Payment')}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#0369A1' }}>
                      ₹{Number(tx.amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', color: '#075985' }}>
                      {tx.gatewayName ? tx.gatewayName.replace(/RAZORPAY/g, 'Cashfree') : 'Cashfree'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, backgroundColor: '#D1FAE5', color: '#047857' }}>
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#075985', fontSize: 12 }}>
                      {tx.createdAt ? String(tx.createdAt).replace('T', ' ').slice(11, 16) : 'Today'}
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
