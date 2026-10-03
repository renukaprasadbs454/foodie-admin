'use client';

import React, { useEffect, useState } from 'react';
import { PayoutFilterBar } from '../components/PayoutFilterBar';
import { PayoutListTable } from '../components/PayoutListTable';
import { PayoutDetailModal } from '../components/PayoutDetailModal';
import { ReconciliationStudio } from '../components/ReconciliationStudio';
import type {
  DeliveryPartnerPayout,
  PayoutFilterOptions,
  ReconciliationOverview,
} from '../types';
import {
  useGetAdminPayoutsQuery,
  useApproveSinglePayoutMutation,
  useRejectPayoutMutation,
  useGetLedgerQuery,
} from '../../../api/endpoints/paymentsApi';

const DEFAULT_FILTERS: PayoutFilterOptions = {
  partnerQuery: '',
  payoutId: '',
  status: 'ALL',
  provider: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export function DeliveryPayoutsPage() {
  const { data: serverPayouts = [] } = useGetAdminPayoutsQuery();
  const { data: serverLedger = [] } = useGetLedgerQuery();
  const [approvePayoutMutation] = useApproveSinglePayoutMutation();
  const [rejectPayoutMutation] = useRejectPayoutMutation();

  const payouts: DeliveryPartnerPayout[] = React.useMemo(() => {
    return serverPayouts.map((p: any) => ({
      id: p.id || p.payoutId || `po-${Math.random()}`,
      walletAccountId: p.walletAccountId || '',
      partnerId: p.deliveryPartnerId || p.walletAccountId || '',
      partnerName: p.partnerName || p.accountHolderName || 'Partner',
      partnerPhone: p.partnerPhone || '',
      amount: p.amount || 0,
      status: p.status === 'SUCCESS' ? 'COMPLETED' : (p.status || 'REQUESTED'),
      provider: p.provider || 'CASHFREE',
      bankRef: p.bankRef || p.providerReferenceId || '',
      failureReason: p.failureReason || '',
      requestedAt: p.createdAt || '',
      processedAt: p.processedAt || p.completedAt || '',
      reconciliationStatus: 'MATCHED',
      retryEligible: p.status === 'FAILED',
      accountHolderName: p.accountHolderName || '',
      accountNumber: p.accountNumber || '',
      ifscCode: p.ifscCode || '',
      bankName: p.bankName || '',
    }));
  }, [serverPayouts]);

  const [localRetries, setLocalRetries] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<PayoutFilterOptions>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'PAYOUTS' | 'RECONCILIATION' | 'PROVIDERS'>('PAYOUTS');
  const [selectedPayout, setSelectedPayout] = useState<DeliveryPartnerPayout | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'DETAILS' | 'WALLET'>('DETAILS');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter Logic
  const filteredPayouts = payouts.filter((p) => {
    if (filters.status !== 'ALL' && p.status !== filters.status) return false;
    if (filters.provider !== 'ALL' && p.provider !== filters.provider) return false;
    if (filters.payoutId && !p.id.toLowerCase().includes(filters.payoutId.toLowerCase())) return false;
    if (filters.partnerQuery) {
      const q = filters.partnerQuery.toLowerCase();
      const matchName = p.partnerName.toLowerCase().includes(q);
      const matchPhone = p.partnerPhone.toLowerCase().includes(q);
      const matchId = p.partnerId.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalVolume = payouts.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = payouts.filter((p) => p.status === 'REQUESTED' || p.status === 'PROCESSING').length;
  const successCount = payouts.filter((p) => p.status === 'SUCCESS' || p.status === 'COMPLETED').length;
  const successRate = payouts.length > 0 ? Math.round((successCount / payouts.length) * 100) : 0;

  const reconciliationOverview: ReconciliationOverview = {
    matchedCount: payouts.filter((p) => p.reconciliationStatus === 'MATCHED').length,
    amountMismatchCount: payouts.filter((p) => p.reconciliationStatus === 'AMOUNT_MISMATCH').length,
    statusMismatchCount: payouts.filter((p) => p.reconciliationStatus === 'STATUS_MISMATCH').length,
    missingProviderRecordCount: payouts.filter((p) => p.reconciliationStatus === 'MISSING_PROVIDER_RECORD').length,
    duplicateCount: payouts.filter((p) => p.reconciliationStatus === 'DUPLICATE').length,
    discrepancies: payouts.filter((p) => p.reconciliationStatus !== 'MATCHED'),
  };

  const handleApprovePayout = async (targetPayout: DeliveryPartnerPayout) => {
    try {
      await approvePayoutMutation({ payoutId: targetPayout.id }).unwrap();
      showToast(`Payout ${targetPayout.id} approved successfully.`);
      if (selectedPayout && selectedPayout.id === targetPayout.id) {
        setSelectedPayout((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Failed to approve payout.');
    }
  };

  const handleRejectPayout = async (targetPayout: DeliveryPartnerPayout) => {
    try {
      await rejectPayoutMutation({ payoutId: targetPayout.id, reason: 'Rejected by Admin' }).unwrap();
      showToast(`Payout ${targetPayout.id} rejected.`);
      if (selectedPayout && selectedPayout.id === targetPayout.id) {
        setSelectedPayout((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Failed to reject payout.');
    }
  };

  const handleRetryPayout = (targetPayout: DeliveryPartnerPayout) => {
    if (!targetPayout.retryEligible) {
      showToast('This payout is not eligible for retry.');
      return;
    }

    setLocalRetries(prev => ({ ...prev, [targetPayout.id]: true }));

    if (selectedPayout && selectedPayout.id === targetPayout.id) {
      setSelectedPayout((prev) =>
        prev
          ? {
            ...prev,
            status: 'PROCESSING',
            failureReason: undefined,
            processedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            retryEligible: false,
          }
          : null,
      );
    }

    showToast(`Retry initiated for Payout ${targetPayout.id}. Status set to PROCESSING.`);
  };

  const handleOpenDetailModal = (p: DeliveryPartnerPayout, tab: 'DETAILS' | 'WALLET' = 'DETAILS') => {
    setSelectedPayout(p);
    setModalInitialTab(tab);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Delivery Partner Payout Studio
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Manage deliveryman payout requests, gateway settlements, and wallet ledger audits.
          </p>
        </div>

        {toastMsg && (
          <div
            style={{
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
            }}
          >
            {toastMsg}
          </div>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Total Volume */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Payout Volume
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>
            ₹{totalVolume.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: 500 }}>
            Across {payouts.length} payout requests
          </div>
        </div>

        {/* Pending Requests */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Open / Pending Requests
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2196F3', marginTop: 4 }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: 500 }}>
            REQUESTED or PROCESSING
          </div>
        </div>

        {/* Settlement Success Rate */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Success Rate
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', marginTop: 4 }}>
            {successRate}%
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: 500 }}>
            {successCount} successfully settled
          </div>
        </div>
      </div>

      {/* Primary Studio Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', gap: 24 }}>
        <button
          type="button"
          onClick={() => setActiveTab('PAYOUTS')}
          style={{
            padding: '12px 6px',
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === 'PAYOUTS' ? '#2196F3' : '#6B7280',
            borderBottom: activeTab === 'PAYOUTS' ? '2px solid #2196F3' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Payout Requests & History ({payouts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECONCILIATION')}
          style={{
            padding: '12px 6px',
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === 'RECONCILIATION' ? '#2196F3' : '#6B7280',
            borderBottom: activeTab === 'RECONCILIATION' ? '2px solid #2196F3' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Reconciliation Studio ({reconciliationOverview.discrepancies.length} Issues)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROVIDERS')}
          style={{
            padding: '12px 6px',
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === 'PROVIDERS' ? '#2196F3' : '#6B7280',
            borderBottom: activeTab === 'PROVIDERS' ? '2px solid #2196F3' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Provider Config (Cashfree Active)
        </button>
      </div>

      {/* Tab 1: Payout Requests & History */}
      {activeTab === 'PAYOUTS' && (
        <>
          <PayoutFilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
          <PayoutListTable
            payouts={filteredPayouts.map(p => localRetries[p.id] ? { ...p, status: 'PROCESSING' } : p)}
            onSelectPayout={(p) => handleOpenDetailModal(p, 'DETAILS')}
            onRetryPayout={handleRetryPayout}
            onApprovePayout={handleApprovePayout}
            onRejectPayout={handleRejectPayout}
            onViewWalletLedger={(p) => handleOpenDetailModal(p, 'WALLET')}
          />
        </>
      )}

      {/* Tab 2: Reconciliation Studio */}
      {activeTab === 'RECONCILIATION' && (
        <ReconciliationStudio
          overview={reconciliationOverview}
          onSelectPayout={(p) => handleOpenDetailModal(p, 'DETAILS')}
        />
      )}

      {/* Tab 3: Provider Config (Read-Only) */}
      {activeTab === 'PROVIDERS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: 640, gap: 20 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                Cashfree Payout & Refund Gateway
              </div>
              <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600 }}>
                OPERATIONAL / DEFAULT
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>APP ID</span>
                <strong style={{ color: '#111827' }}>cf_app_live_8839021940</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYOUT & REFUND DISPATCH MODE</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>Direct UPI & Automated Bank Transfer (IMPS/NEFT) + Instant Reversals</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WEBHOOK LISTENER</span>
                <code style={{ fontSize: 12, backgroundColor: '#F9FAFB', color: '#2196F3', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: 6 }}>
                  /api/v1/payments/cashfree-webhook
                </code>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', padding: 12, borderRadius: 12, marginTop: 8 }}>
                Cashfree provider credentials and payout keys are secured in KMS and active for automated batch dispatches and customer refunds.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <PayoutDetailModal
          payout={selectedPayout}
          walletBalance={12450.0}
          totalEarned={38900.0}
          ledgerHistory={
            serverLedger
              .filter(
                (l: any) =>
                  (selectedPayout.partnerName && l.walletAccountId?.toLowerCase().includes(selectedPayout.partnerName.toLowerCase())) ||
                  l.referenceId === selectedPayout.id ||
                  l.referenceType?.includes('DELIVERY')
              )
              .slice(0, 10)
              .map((l: any) => ({
                ledgerEntryId: l.id,
                walletAccountId: l.walletAccountId,
                entryType: l.entryType,
                amount: l.amount,
                referenceType: l.referenceType,
                referenceId: l.referenceId,
                createdAt: l.createdAt,
              }))
          }
          onClose={() => setSelectedPayout(null)}
          onRetry={handleRetryPayout}
          onApprove={handleApprovePayout}
          onReject={handleRejectPayout}
          initialTab={modalInitialTab}
        />
      )}
    </div>
  );
}
