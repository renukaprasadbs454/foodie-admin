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
        <div style={{ padding: 32, color: '#EF4444', fontWeight: 600, backgroundColor: '#FEF2F2', borderRadius: 16, border: '1px solid #FECACA' }}>
          403 Forbidden — You do not have permission to view or manage high-risk action approvals.
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Toast Alert */}
        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#E3F2FD', padding: '3px 8px', borderRadius: 6 }}>
                Finance Admin
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>/</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>High-Risk Approvals</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              High-Risk Action Approvals
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
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
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#2196F3',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            Refresh Queue
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', gap: 24 }}>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            style={{
              padding: '12px 6px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'PENDING' ? '#2196F3' : '#6B7280',
              borderBottom: activeTab === 'PENDING' ? '2px solid #2196F3' : '2px solid transparent',
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
            <span style={{ fontSize: 11, backgroundColor: requests.length > 0 ? '#E3F2FD' : '#F3F4F6', color: requests.length > 0 ? '#2196F3' : '#6B7280', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            style={{
              padding: '12px 6px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'HISTORY' ? '#2196F3' : '#6B7280',
              borderBottom: activeTab === 'HISTORY' ? '2px solid #2196F3' : '2px solid transparent',
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
            <span style={{ fontSize: 11, backgroundColor: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
              {historyList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PENDING QUEUE */}
        {activeTab === 'PENDING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter:</span>
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
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filterType === f.key ? '1px solid #2196F3' : '1px solid #E5E7EB',
                    backgroundColor: filterType === f.key ? '#E3F2FD' : '#FFFFFF',
                    color: filterType === f.key ? '#2196F3' : '#6B7280',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#6B7280', backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Connecting to database approval queue...</div>
              </div>
            ) : displayedRequests.length === 0 ? (
              <div style={{ padding: 48, backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  No pending high-risk approval requests
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
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
                        borderRadius: 20,
                        padding: 24,
                        border: isHighValue ? '1px solid #2196F3' : '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
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
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: 9999,
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                            }}
                          >
                            {req.actionType || 'PAYOUT_DISBURSAL'}
                          </span>

                          {isHighValue && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: 9999,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                              }}
                            >
                              HIGH RISK (&ge; ₹1,000)
                            </span>
                          )}

                          <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                            ID: {req.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
                            Gateway:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 9999,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
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
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              backgroundColor: '#E3F2FD',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#2196F3',
                            }}
                          >
                            {(req.recipient || req.requestedBy?.fullName || 'P')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                              {req.recipient || req.requestedBy?.fullName || 'Delivery Partner'}
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                              Destination: {req.bankName || 'Direct UPI / IMPS'} ({req.accountNumber || '••••'})
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                              {req.reason || 'Pending payout settlement disbursement'}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {req.actionType === 'CUSTOMER_CANCELLATION_REFUND' ? 'Refund Amount' : 'Disbursal Amount'}
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
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
                                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                color: '#FFFFFF',
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: actionInProgress !== null ? 'not-allowed' : 'pointer',
                                opacity: actionInProgress !== null ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                              }}
                            >
                              {isApproving
                                ? 'Approving...'
                                : req.actionType === 'CUSTOMER_CANCELLATION_REFUND'
                                ? 'Approve Refund'
                                : 'Approve Disbursal'}
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
                                color: '#EF4444',
                                fontWeight: 600,
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
                      <div style={{ fontSize: 11, color: '#6B7280', borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
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
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                <div style={{ fontWeight: 600, color: '#111827' }}>No actions taken in this session yet.</div>
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
                      borderRadius: 14,
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {h.recipient || 'Delivery Partner'} — ₹{h.amount?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {h.reason || 'Settlement disbursal'} • {String(h.createdAt).replace('T', ' ').slice(0, 16)}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: h.status === 'APPROVED' ? '#DCFCE7' : '#FEE2E2',
                        color: h.status === 'APPROVED' ? '#15803D' : '#EF4444',
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
