'use client';

import React, { useEffect, useState } from 'react';
import { HasPermission } from '@/components/HasPermission';

interface ApprovalRequest {
  id: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  status: string;
  amount?: number;
  recipient?: string;
  bankName?: string;
  accountNumber?: string;
  provider?: string;
  reason?: string;
  payload?: string;
  requestedBy?: { fullName: string };
  createdAt: string;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [historyList, setHistoryList] = useState<ApprovalRequest[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  async function loadPending() {
    try {
      const token = localStorage.getItem('foodie_admin_token') || sessionStorage.getItem('foodie_admin_token');
      const res = await fetch('/api/bff/admin/approvals', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const body = await res.json();
        const list = body.data || body;
        setRequests(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to fetch approval requests', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  const handleAction = async (req: ApprovalRequest, action: 'approve' | 'reject') => {
    setActionInProgress(`${req.id}-${action}`);
    try {
      const token = localStorage.getItem('foodie_admin_token') || sessionStorage.getItem('foodie_admin_token');
      const res = await fetch(`/api/bff/admin/approvals/${req.id}/${action}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        showToast(
          action === 'approve'
            ? `Payout request ${req.id.slice(0, 8)} approved and queued for Cashfree settlement!`
            : `Payout request ${req.id.slice(0, 8)} rejected.`
        );
        // Add to history
        setHistoryList((prev) => [
          {
            ...req,
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        // Remove from pending
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(`Failed: ${errJson?.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Network request failed'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const displayedRequests = requests.filter((r) => {
    if (filterType === 'ALL') return true;
    return r.actionType === filterType || r.resourceType === filterType;
  });

  return (
    <HasPermission
      permission="settlement.release"
      fallback={
        <div style={{ padding: 32, color: '#DC2626', fontWeight: 600, backgroundColor: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
          403 Forbidden — You do not have permission to view or manage high-risk action approvals.
        </div>
      }
    >
      <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Toast Alert */}
        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              padding: '14px 24px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.3)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.6px', backgroundColor: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
                Finance Admin
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1' }}>/</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1' }}>High-Risk Approvals</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0369A1', margin: 0, letterSpacing: '-0.4px' }}>
              High-Risk Action Approvals
            </h1>
            <p style={{ fontSize: 13, color: '#0284C7', margin: '6px 0 0' }}>
              Dual-authorization queue for high-value payouts, settlement releases, manual ledger adjustments, and financial mutation requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadPending();
            }}
            title="Refresh Approval Queue"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #BAE6FD',
              backgroundColor: '#FFFFFF',
              color: '#0284C7',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.08)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh Queue
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '2px solid #BAE6FD', gap: 24, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            style={{
              padding: '12px 6px',
              fontSize: 15,
              fontWeight: 800,
              color: activeTab === 'PENDING' ? '#0369A1' : '#0284C7',
              borderBottom: activeTab === 'PENDING' ? '4px solid #0369A1' : '4px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>Pending Review Queue</span>
            <span style={{ fontSize: 12, backgroundColor: requests.length > 0 ? '#E0F2FE' : '#F1F5F9', color: '#0369A1', padding: '2px 8px', borderRadius: 9999, fontWeight: 800 }}>
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            style={{
              padding: '12px 6px',
              fontSize: 15,
              fontWeight: 800,
              color: activeTab === 'HISTORY' ? '#0369A1' : '#0284C7',
              borderBottom: activeTab === 'HISTORY' ? '4px solid #0369A1' : '4px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>Approval History & Logs</span>
            <span style={{ fontSize: 12, backgroundColor: '#F1F5F9', color: '#0369A1', padding: '2px 8px', borderRadius: 9999, fontWeight: 800 }}>
              {historyList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PENDING QUEUE */}
        {activeTab === 'PENDING' && (
          <div>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Filter by Type:</span>
              {[
                { key: 'ALL', label: 'All Requests' },
                { key: 'CUSTOMER_CANCELLATION_REFUND', label: 'Online Cancellation Refunds' },
                { key: 'PAYOUT_DISBURSAL', label: 'Payout Disbursals' },
                { key: 'SETTLEMENT', label: 'Settlement Releases' },
                { key: 'LEDGER_ADJUSTMENT', label: 'Ledger Adjustments' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid #BAE6FD',
                    backgroundColor: filterType === f.key ? '#0284C7' : '#FFFFFF',
                    color: filterType === f.key ? '#FFFFFF' : '#0284C7',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#0284C7', backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Connecting to database approval queue...</div>
              </div>
            ) : displayedRequests.length === 0 ? (
              <div style={{ padding: 48, backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #BAE6FD', textAlign: 'center' }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5" />
                  </svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>
                  No pending high-risk approval requests!
                </div>
                <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0' }}>
                  All payout releases and financial settlements are authorized and up to date.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {displayedRequests.map((req) => {
                  const isApproving = actionInProgress === `${req.id}-approve`;
                  const isRejecting = actionInProgress === `${req.id}-reject`;
                  const amount = req.amount !== undefined ? req.amount : 0;
                  const isHighValue = amount >= 1000;

                  return (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        padding: 22,
                        border: isHighValue ? '2px solid #BAE6FD' : '1px solid #BAE6FD',
                        boxShadow: '0 2px 10px rgba(14, 165, 233, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 6,
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              letterSpacing: '0.4px',
                            }}
                          >
                            {req.actionType || 'PAYOUT_DISBURSAL'}
                          </span>

                          {isHighValue && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: 6,
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                              }}
                            >
                              HIGH RISK (≥ ₹1,000)
                            </span>
                          )}

                          <span style={{ fontSize: 12, color: '#0284C7', fontFamily: 'monospace' }}>
                            ID: {req.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#0284C7', fontWeight: 600 }}>
                            Gateway:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#F0FDF4',
                              color: '#16A34A',
                              border: '1px solid #BBF7D0',
                            }}
                          >
                            {req.actionType === 'CUSTOMER_CANCELLATION_REFUND' ? `${req.provider || 'ONLINE'} REFUND` : 'CASHFREE PAYOUT'}
                          </span>
                        </div>
                      </div>

                      {/* Main Info Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              backgroundColor: '#E0F2FE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              fontWeight: 900,
                              color: '#0369A1',
                            }}
                          >
                            {(req.recipient || req.requestedBy?.fullName || 'P')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>
                              {req.recipient || req.requestedBy?.fullName || 'Delivery Partner'}
                            </div>
                            <div style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
                              Destination: {req.bankName || 'Direct UPI / IMPS'} ({req.accountNumber || '••••'})
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                              {req.reason || 'Pending payout settlement disbursement'}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>
                              {req.actionType === 'CUSTOMER_CANCELLATION_REFUND' ? 'Refund Amount' : 'Disbursal Amount'}
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1' }}>
                              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => void handleAction(req, 'approve')}
                              disabled={actionInProgress !== null}
                              style={{
                                padding: '10px 18px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                                opacity: actionInProgress !== null ? 0.7 : 1,
                                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                              }}
                            >
                              {isApproving
                                ? 'Approving...'
                                : req.actionType === 'CUSTOMER_CANCELLATION_REFUND'
                                ? 'Approve & Disburse Refund'
                                : 'Approve via Cashfree'}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleAction(req, 'reject')}
                              disabled={actionInProgress !== null}
                              style={{
                                padding: '10px 16px',
                                borderRadius: 10,
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                                opacity: actionInProgress !== null ? 0.7 : 1,
                              }}
                            >
                              {isRejecting ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div style={{ fontSize: 11, color: '#0284C7', borderTop: '1px solid #E0F2FE', paddingTop: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span>Requested at: {String(req.createdAt).replace('T', ' ').slice(0, 16)} UTC</span>
                        <span>Authorized Role Required: Super Admin / Finance Admin</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'HISTORY' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #BAE6FD', padding: 24 }}>
            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#0284C7' }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div style={{ fontWeight: 800, color: '#0369A1' }}>No actions taken in this session yet.</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Approved and rejected requests will appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {historyList.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 10,
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0369A1' }}>
                        {h.recipient || 'Delivery Partner'} — ₹{h.amount?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
                        {h.reason || 'Settlement disbursal'} • {String(h.createdAt).replace('T', ' ').slice(0, 16)}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 800,
                        backgroundColor: h.status === 'APPROVED' ? '#DCFCE7' : '#FEE2E2',
                        color: h.status === 'APPROVED' ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </HasPermission>
  );
}
