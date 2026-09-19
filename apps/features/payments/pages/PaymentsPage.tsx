'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_17_PAYMENT_LIST } from '@/constants/gaps';

import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';

import type {
  CommissionConfig,
  LedgerEntryRecord,
  PaymentSettlementRecord,
  PaymentTransactionRecord,
  PayoutRecord,
  RestaurantSettlementRecord,
} from '../types';
import { calculatePaymentSplit, validateRefundForm } from '../types';

import {
  useCalculateSplitMutation,
  useDisburseRestaurantSettlementMutation,
  useGetAdminPayoutsQuery,
  useGetCommissionRulesQuery,
  useGetLedgerQuery,
  useGetRestaurantSettlementsQuery,
  useGetSettlementsQuery,
  useGetTransactionsQuery,
  useRefundPaymentMutation,
  useUpdateCommissionRulesMutation,
  useApprovePayoutsMutation,
} from '../../../api/endpoints/paymentsApi';
import { useGetAdminRestaurantsQuery } from '../../../api/endpoints/restaurantsApi';
import { useGetAdminDeliveryPartnersQuery } from '../../../api/endpoints/deliveryPartnersApi';

type TabKey =
  | 'OVERVIEW'
  | 'TRANSACTIONS'
  | 'SETTLEMENTS'
  | 'RESTAURANT_SETTLEMENTS'
  | 'LEDGER'
  | 'RESTAURANT_PAYOUTS'
  | 'DELIVERY_PAYOUTS'
  | 'EARNINGS'
  | 'COMMISSION_RULES'
  | 'REFUNDS';

const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  restaurantCommissionRate: 14, // 14%
  deliveryCommissionRate: 10,   // 10%
  platformFixedFee: 40,         // ₹40
};

export function PaymentsPage() {
  const { tokens } = useTheme();
  const activeModule = useAppSelector(selectActiveModule);

  // Active Sub-Tab State
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');

  // Backend RTK Queries
  const { data: serverRules, isLoading: rulesLoading } = useGetCommissionRulesQuery();
  const { data: serverSettlements = [], isLoading: settlementsLoading } = useGetSettlementsQuery();
  const { data: serverTransactions = [], isLoading: transactionsLoading } = useGetTransactionsQuery();
  const { data: serverLedger = [], isLoading: ledgerLoading } = useGetLedgerQuery();
  const { data: restaurantSettlements = [], isLoading: restSettlementsLoading } = useGetRestaurantSettlementsQuery();
  const { data: restaurantPayouts = [], isLoading: restPayoutsLoading } = useGetAdminPayoutsQuery({ ownerType: 'RESTAURANT' });
  const { data: deliveryPayouts = [], isLoading: delivPayoutsLoading } = useGetAdminPayoutsQuery({ ownerType: 'DELIVERY_PARTNER' });
  const { data: restaurantsData } = useGetAdminRestaurantsQuery({});
  const { data: partnersData } = useGetAdminDeliveryPartnersQuery();

  // RTK Mutations
  const [updateRules, { isLoading: isSavingRules }] = useUpdateCommissionRulesMutation();
  const [disburseSettlement, { isLoading: isDisbursing }] = useDisburseRestaurantSettlementMutation();
  const [executeRefund, { isLoading: isRefunding }] = useRefundPaymentMutation();
  const [calculateSplitApi] = useCalculateSplitMutation();
  const [approvePayouts, { isLoading: isApproving }] = useApprovePayoutsMutation();

  // Local State
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig>(DEFAULT_COMMISSION_CONFIG);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Simulator State
  const [simCustomerName, setSimCustomerName] = useState('Arthur Pendelton');
  const [simFoodCost, setSimFoodCost] = useState('500');
  const [simDeliveryFee, setSimDeliveryFee] = useState('80');
  const [simRestaurantName, setSimRestaurantName] = useState('');
  const [simDriverName, setSimDriverName] = useState('');
  const [simPayMethod, setSimPayMethod] = useState<'RAZORPAY_UPI' | 'CREDIT_CARD' | 'FOODIE_WALLET'>('RAZORPAY_UPI');

  // Config Modal & Rules Form
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configRestRate, setConfigRestRate] = useState('14');
  const [configDelivRate, setConfigDelivRate] = useState('10');
  const [configPlatformFee, setConfigPlatformFee] = useState('40');

  // Disburse Modal State
  const [selectedDisburseId, setSelectedDisburseId] = useState<string | null>(null);
  const [disburseTxRef, setDisburseTxRef] = useState('');

  // Refund Form State
  const [refundPaymentUuid, setRefundPaymentUuid] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Bulk Approval State
  const [selectedRestPayouts, setSelectedRestPayouts] = useState<Set<string>>(new Set());
  const [selectedDelivPayouts, setSelectedDelivPayouts] = useState<Set<string>>(new Set());

  const handleApproveRestPayouts = async () => {
    if (selectedRestPayouts.size === 0) return;
    try {
      await approvePayouts({ payoutIds: Array.from(selectedRestPayouts) }).unwrap();
      showToast(`Successfully initiated disbursal via Cashfree for ${selectedRestPayouts.size} Restaurant Payouts!`);
      setSelectedRestPayouts(new Set());
    } catch (err) {
      showToast('Failed to approve restaurant payouts.');
    }
  };

  const handleApproveDelivPayouts = async () => {
    if (selectedDelivPayouts.size === 0) return;
    try {
      await approvePayouts({ payoutIds: Array.from(selectedDelivPayouts) }).unwrap();
      showToast(`Successfully initiated disbursal via Cashfree for ${selectedDelivPayouts.size} Delivery Partner Payouts!`);
      setSelectedDelivPayouts(new Set());
    } catch (err) {
      showToast('Failed to approve delivery partner payouts.');
    }
  };

  useEffect(() => {
    if (serverRules) {
      setCommissionConfig(serverRules);
      setConfigRestRate(serverRules.restaurantCommissionRate?.toString() || '');
      setConfigDelivRate(serverRules.deliveryCommissionRate?.toString() || '');
      setConfigPlatformFee(serverRules.platformFixedFee?.toString() || '');
    }
  }, [serverRules]);

  useEffect(() => {
    trackAnalyticsEvent('admin_payments_viewed', {
      gapId: GAP_API_17_PAYMENT_LIST,
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const realRestaurants = restaurantsData?.items || [];
  const realPartners = partnersData?.items || [];

  // Live Financial Metrics Calculated from Real Database Data
  const totalAdminEscrowPaid = serverSettlements.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalAdminNetRevenue = serverSettlements.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
  const totalDistributedToRestaurants = serverSettlements.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
  const totalDistributedToDrivers = serverSettlements.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

  // Live Simulator Calculations
  const livePreviewSplit = calculatePaymentSplit(
    Number(simFoodCost) || 0,
    Number(simDeliveryFee) || 0,
    commissionConfig
  );

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rRate = Math.min(100, Math.max(0, Number(configRestRate) || 0));
    const dRate = Math.min(100, Math.max(0, Number(configDelivRate) || 0));
    const pFee = Math.max(0, Number(configPlatformFee) || 0);

    const payload: CommissionConfig = {
      restaurantCommissionRate: rRate,
      deliveryCommissionRate: dRate,
      platformFixedFee: pFee,
    };

    try {
      await updateRules(payload).unwrap();
      setCommissionConfig(payload);
      setIsConfigOpen(false);
      showToast(`Successfully updated Commission Rules: Restaurant ${rRate}%, Delivery ${dRate}%, Platform Fee ₹${pFee}`);
    } catch (err: any) {
      showToast(`Failed to update rules: ${err?.data?.error?.message || err?.message || 'Server error'}`);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisburseId) return;
    if (!disburseTxRef.trim()) {
      alert('Please enter a bank transaction reference number');
      return;
    }
    try {
      await disburseSettlement({
        settlementId: selectedDisburseId,
        paymentReference: disburseTxRef.trim(),
      }).unwrap();
      showToast(`Disbursement completed for settlement! Transaction Ref: ${disburseTxRef}`);
      setSelectedDisburseId(null);
      setDisburseTxRef('');
    } catch (err: any) {
      alert(`Disbursement error: ${err?.data?.error?.message || err?.message || 'Failed'}`);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRefundForm(refundPaymentUuid, refundAmount, refundReason);
    if (!validation.ok) {
      alert(validation.message);
      return;
    }
    try {
      await executeRefund({
        paymentId: validation.paymentId,
        body: validation.body,
      }).unwrap();
      showToast(`Refund of ₹${validation.body.amount} executed successfully for Payment ID: ${validation.paymentId.slice(0, 8)}...`);
      setRefundPaymentUuid('');
      setRefundAmount('');
      setRefundReason('');
    } catch (err: any) {
      alert(`Refund failed: ${err?.data?.error?.message || err?.message || 'Failed to execute refund'}`);
    }
  };

  const renderTabsHeader = () => (
    <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
      {[
        { key: 'OVERVIEW', label: '📊 Executive Overview' },
        { key: 'TRANSACTIONS', label: `💳 Transactions (${serverTransactions.length})` },
        { key: 'SETTLEMENTS', label: `⚖️ Master Order Settlements (${serverSettlements.length})` },
        { key: 'RESTAURANT_SETTLEMENTS', label: `🏪 Restaurant Order Settlements (${restaurantSettlements.length})` },
        { key: 'LEDGER', label: `📖 Audit Ledger (${serverLedger.length})` },
        { key: 'RESTAURANT_PAYOUTS', label: `🏪 Restaurant Wallet Payouts (${restaurantPayouts.length})` },
        { key: 'DELIVERY_PAYOUTS', label: `� Delivery Partner Payouts (${deliveryPayouts.length})` },
        { key: 'EARNINGS', label: '💰 Admin Earnings' },
        { key: 'COMMISSION_RULES', label: '⚙️ Commission Rules' },
        { key: 'REFUNDS', label: '🔄 Refunds & Reversals' },
      ].map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setActiveTab(t.key as TabKey)}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 13,
            fontWeight: activeTab === t.key ? 800 : 600,
            color: activeTab === t.key ? '#0F3D21' : '#64748B',
            borderBottom: activeTab === t.key ? '3px solid #0F3D21' : '3px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Alert */}
      {toastMsg ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#0F3D21',
            color: '#FFFFFF',
            padding: '14px 24px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      ) : null}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#0F3D21" style={{ margin: 0 }}>
            Foodie Platform — Payment & Commission Settlement Center
          </Text>
          <Text as="p" variant="caption" color="#64748B" style={{ margin: '4px 0 0' }}>
            Single source of truth for customer payments, 14% restaurant commissions, 10% delivery commissions, ₹40 platform fees, and wallet ledger postings.
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            style={{
              backgroundColor: '#0F3D21',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(15,61,33,0.25)',
            }}
          >
            <span>⚙️</span> Edit Commission Rules (14% / 10% / ₹40)
          </button>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      {renderTabsHeader()}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Financial Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #0F3D21',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Text as="span" variant="caption" color="#64748B" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Total Admin Escrow Pool
              </Text>
              <Text as="h2" variant="heading1" color="#0F3D21" style={{ marginTop: 4, fontWeight: 800 }}>
                ₹{totalAdminEscrowPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 4 }}>
                ● 100% Customer Bill Direct Collections
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                borderRadius: 14,
                border: '1px solid #E4E4E7',
                borderTop: '4px solid #000000',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Text as="span" variant="caption" color="#71717A" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Total Admin Platform Revenue
              </Text>
              <Text as="h2" variant="heading1" color="#09090B" style={{ marginTop: 4, fontWeight: 800 }}>
                ₹{totalAdminNetRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#71717A', fontWeight: 700, marginTop: 4 }}>
                14% Rest. Comm + 10% Driver Comm + ₹{commissionConfig.platformFixedFee} Service Fee
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                borderRadius: 14,
                border: '1px solid #E4E4E7',
                borderTop: '4px solid #15803D',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Text as="span" variant="caption" color="#71717A" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Distributed to Restaurants
              </Text>
              <Text as="h2" variant="heading1" color="#15803D" style={{ marginTop: 4, fontWeight: 800 }}>
                ₹{totalDistributedToRestaurants.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#71717A', fontWeight: 700, marginTop: 4 }}>
                86% Net Food Subtotal Credited to Vendors
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                borderRadius: 14,
                border: '1px solid #E4E4E7',
                borderTop: '4px solid #000000',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Text as="span" variant="caption" color="#71717A" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Distributed to Delivery Partners
              </Text>
              <Text as="h2" variant="heading1" color="#000000" style={{ marginTop: 4, fontWeight: 800 }}>
                ₹{totalDistributedToDrivers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#71717A', fontWeight: 700, marginTop: 4 }}>
                90% Net Delivery Payout Credited to Riders
              </div>
            </div>
          </div>

          {/* COMMISSION AUTO-SPLIT SIMULATOR & TEST TOOLS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: 24,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D21', margin: 0 }}>
                  Customer Payment & Commission Calculator
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                  Test exact food subtotal and delivery fee split breakdown against current active database rules.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#DCFCE7', color: '#166534', padding: '6px 12px', borderRadius: 8 }}>
                ACTIVE BACKEND RULES: 14% Rest Comm | 10% Driver Comm | ₹40 Platform Fee
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Food Subtotal (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={simFoodCost}
                      onChange={(e) => setSimFoodCost(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={simDeliveryFee}
                      onChange={(e) => setSimDeliveryFee(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Restaurant Store
                    </label>
                    <select
                      value={simRestaurantName}
                      onChange={(e) => setSimRestaurantName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                    >
                      <option value="">-- Select Store --</option>
                      {realRestaurants.map((r: any, idx: number) => (
                        <option key={r.id || r.restaurantId || `rest-${idx}`} value={r.name}>{r.name}</option>
                      ))}
                      <option value="Spice Garden">Spice Garden (Default)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Delivery Partner
                    </label>
                    <select
                      value={simDriverName}
                      onChange={(e) => setSimDriverName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                    >
                      <option value="">-- Select Rider --</option>
                      {realPartners.map((dp: any, idx: number) => (
                        <option key={dp.id || dp.partnerId || `dp-${idx}`} value={dp.fullName}>{dp.fullName}</option>
                      ))}
                      <option value="Rohan Sharma">Rohan Sharma (Default)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Calculated Split Preview Box */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F3D21', textTransform: 'uppercase', marginBottom: 10 }}>
                    Real-time Calculated Auto-Split
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CBD5E1', paddingBottom: 6 }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>Total Customer Bill:</span>
                      <span style={{ fontWeight: 800, color: '#0F3D21' }}>₹{livePreviewSplit.totalPaid.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706', fontWeight: 700 }}>
                      <span> Foodie Admin Total Commission:</span>
                      <span>₹{livePreviewSplit.adminTotalRevenue.toFixed(2)}</span>
                    </div>

                    <div style={{ fontSize: 11, color: '#64748B', paddingLeft: 12, marginTop: -4 }}>
                      • 14% Food Commission: ₹{livePreviewSplit.adminFoodCommission.toFixed(2)}
                      <br />
                      • 10% Driver Commission: ₹{livePreviewSplit.adminDeliveryCommission.toFixed(2)}
                      <br />
                      • Fixed Service Fee: ₹{livePreviewSplit.platformFee.toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D', fontWeight: 700, paddingTop: 4 }}>
                      <span> Restaurant Net Payout (86%):</span>
                      <span>₹{livePreviewSplit.restaurantNetShare.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#09090B', fontWeight: 700 }}>
                      <span> Delivery Partner Net Payout (90%):</span>
                      <span>₹{livePreviewSplit.deliveryPartnerNetShare.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Real Payment Transactions Database
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                All incoming customer payment transaction records captured from Razorpay / Payment Gateway.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {serverTransactions.length} Transactions Recorded
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Order ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>User ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Method</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Gateway</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading real payment transactions...</td>
                  </tr>
                ) : serverTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No payment transactions found in database.</td>
                  </tr>
                ) : (
                  serverTransactions.map((tx: PaymentTransactionRecord) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#09090B', fontFamily: 'monospace' }}>
                        {tx.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F3D21' }}>
                        {tx.orderId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 12 }}>
                        {tx.userId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#09090B' }}>
                        ₹{(tx.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155' }}>
                        {tx.paymentMethod || 'RAZORPAY_UPI'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {tx.gatewayName || 'RAZORPAY'} ({tx.gatewayTransactionId ? tx.gatewayTransactionId.slice(0, 10) : 'N/A'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: tx.status === 'SUCCESS' || tx.status === 'CAPTURED' ? '#DCFCE7' : '#FEF3C7',
                            color: tx.status === 'SUCCESS' || tx.status === 'CAPTURED' ? '#166534' : '#B45309',
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 20,
                          }}
                        >
                          ● {tx.status || 'CAPTURED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {tx.createdAt ? String(tx.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENTS & DISTRIBUTION */}
      {activeTab === 'SETTLEMENTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Order Payment Settlement & Distribution Ledger
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                Real backend settlements showing exact breakdown: Customer Payment → 14% Food Comm → 10% Driver Comm → ₹40 Platform Fee → Net Distributions.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {serverSettlements.length} Settlements
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Settlement ID / Order</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Total Paid (Admin)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Admin Net Revenue</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Restaurant Net (86%)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Delivery Net (90%)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Settled At</th>
                </tr>
              </thead>
              <tbody>
                {settlementsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading order settlements...</td>
                  </tr>
                ) : serverSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No settlement records available.</td>
                  </tr>
                ) : (
                  serverSettlements.map((s: PaymentSettlementRecord) => (
                    <tr key={s.id || s.settlementId} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0F3D21' }}>{s.orderNumber || s.orderId}</div>
                        <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace' }}>{s.id || s.settlementId}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#09090B' }}>{s.customerName || 'Customer'}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{s.paymentMethod || 'RAZORPAY_UPI'}</div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#09090B' }}>
                        ₹{(s.totalPaid || 0).toFixed(2)}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#D97706' }}>
                        +₹{(s.adminTotalRevenue || 0).toFixed(2)}
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                          Rest: ₹{(s.restaurantFoodCommission || 0).toFixed(2)} | Deliv: ₹{(s.deliveryPartnerCommission || 0).toFixed(2)} | Fee: ₹{(s.platformFee || 40).toFixed(2)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#15803D' }}>+₹{(s.restaurantNetShare || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{s.restaurantName || 'Restaurant'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#09090B' }}>+₹{(s.deliveryPartnerNetShare || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{s.driverName || 'Rider'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid #86EFAC',
                          }}
                        >
                          ● {s.settlementStatus || 'FUNDS_DISTRIBUTED'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {s.settledAt ? String(s.settledAt).replace('T', ' ').slice(0, 16) : 'Just now'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LEDGER */}
      {activeTab === 'LEDGER' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Authoritative Double-Entry Financial Ledger
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                Immutable audit trail of all DEBIT & CREDIT postings across Platform, Restaurant, and Driver wallets.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {serverLedger.length} Ledger Entries
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Entry ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Wallet Account ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reference Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reference ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Balance After</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading financial ledger entries...</td>
                  </tr>
                ) : serverLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No ledger entries recorded yet.</td>
                  </tr>
                ) : (
                  serverLedger.map((l: LedgerEntryRecord) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#09090B' }}>
                        {l.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>
                        {l.walletAccountId || 'PLATFORM-ESCROW'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: l.entryType === 'CREDIT' ? '#DCFCE7' : '#FEE2E2',
                            color: l.entryType === 'CREDIT' ? '#166534' : '#991B1B',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {l.entryType || 'CREDIT'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: l.entryType === 'CREDIT' ? '#166534' : '#991B1B' }}>
                        {l.entryType === 'CREDIT' ? '+' : '-'}₹{(l.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155' }}>
                        {l.referenceType || 'ORDER_SETTLEMENT'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        {l.referenceId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F3D21' }}>
                        ₹{(l.balanceAfter || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {l.createdAt ? String(l.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4.5: RESTAURANT SETTLEMENTS */}
      {activeTab === 'RESTAURANT_SETTLEMENTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Restaurant Order Settlements (14% Comm)
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                Accumulated net 86% food revenue payouts to restaurant partners with formal disbursement tracking.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {restaurantSettlements.length} Store Payout Records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Settlement ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Restaurant Store</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Period</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Orders Count</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Food Subtotal</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>14% Comm Deducted</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Net Payout Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {restSettlementsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading restaurant payouts...</td>
                  </tr>
                ) : restaurantSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No restaurant settlement payout records found.</td>
                  </tr>
                ) : (
                  restaurantSettlements.map((rs: RestaurantSettlementRecord) => (
                    <tr key={rs.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#09090B', fontFamily: 'monospace' }}>
                        {rs.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F3D21' }}>
                        {rs.restaurantName || 'Partner Store'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {rs.periodStart ? `${rs.periodStart.slice(0, 10)} to ${rs.periodEnd?.slice(0, 10)}` : 'Weekly Cycle'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#09090B' }}>
                        {rs.totalOrdersCount || 1}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#334155' }}>
                        ₹{(rs.totalSubtotal || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#D97706' }}>
                        -₹{(rs.totalCommission || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#15803D' }}>
                        ₹{(rs.netPayoutAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: rs.status === 'DISBURSED' ? '#DCFCE7' : '#FEF3C7',
                            color: rs.status === 'DISBURSED' ? '#166534' : '#B45309',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          ● {rs.status || 'PENDING'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {rs.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDisburseId(rs.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#0F3D21',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Disburse Funds
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                            {rs.paymentReference ? `Ref: ${rs.paymentReference}` : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5.5: RESTAURANT PAYOUTS */}
      {activeTab === 'RESTAURANT_PAYOUTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Restaurant Wallet Payouts (Requested Disbursals)
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                Bank transfer disbursals requested via application wallets by restaurants.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {restaurantPayouts.length} Requested Payouts
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={restaurantPayouts.length > 0 && selectedRestPayouts.size === restaurantPayouts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRestPayouts(new Set(restaurantPayouts.map((p: PayoutRecord) => p.id)));
                        } else {
                          setSelectedRestPayouts(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Payout ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Restaurant Account Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Wallet Account</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Bank & Account Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {restPayoutsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading restaurant payouts...</td>
                  </tr>
                ) : restaurantPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No restaurant payout records.</td>
                  </tr>
                ) : (
                  [...restaurantPayouts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p: PayoutRecord) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedRestPayouts.has(p.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRestPayouts);
                            if (e.target.checked) newSet.add(p.id);
                            else newSet.delete(p.id);
                            setSelectedRestPayouts(newSet);
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#09090B', fontFamily: 'monospace' }}>
                        {p.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F3D21' }}>
                        {p.ownerName || p.accountHolderName || 'Partner Store'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        {p.walletAccountId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#09090B' }}>
                        ₹{(p.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155' }}>
                        {p.bankName || 'Bank'} • {p.accountNumber ? `•• ${p.accountNumber.slice(-4)}` : '••••'} ({p.ifscCode || 'IFSC'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: p.status === 'COMPLETED' ? '#DCFCE7' : p.status === 'PROCESSING' ? '#EFF6FF' : '#FEF3C7',
                            color: p.status === 'COMPLETED' ? '#166534' : p.status === 'PROCESSING' ? '#1D4ED8' : '#B45309',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          ● {p.status || 'REQUESTED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {p.createdAt ? String(p.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {(p.status === 'REQUESTED' || p.status === 'FAILED') ? (
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => approvePayouts({ payoutIds: [p.id] })}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#0F3D21',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedRestPayouts.size > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApproveRestPayouts}
                  disabled={isApproving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isApproving ? '#94A3B8' : '#0F3D21',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: isApproving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isApproving ? 'Processing...' : `Approve & Disburse ${selectedRestPayouts.size} Selected`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DELIVERY PARTNER PAYOUTS */}
      {activeTab === 'DELIVERY_PAYOUTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E4E4E7',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#09090B" style={{ margin: 0 }}>
                Partner Wallet Payouts (Requested Disbursals)
              </Text>
              <Text as="p" variant="caption" color="#71717A" style={{ margin: '2px 0 0' }}>
                Bank transfer disbursals requested via application wallets by restaurants or delivery partners.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '4px 10px', borderRadius: 20 }}>
              {deliveryPayouts.length} Requested Payouts
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7', color: '#18181B', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={deliveryPayouts.length > 0 && selectedDelivPayouts.size === deliveryPayouts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDelivPayouts(new Set(deliveryPayouts.map(p => p.id)));
                        } else {
                          setSelectedDelivPayouts(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Payout ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Delivery Partner Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Wallet Account</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Bank & Account Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {delivPayoutsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading driver payouts...</td>
                  </tr>
                ) : deliveryPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No delivery partner payout records.</td>
                  </tr>
                ) : (
                  [...deliveryPayouts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p: PayoutRecord) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedDelivPayouts.has(p.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedDelivPayouts);
                            if (e.target.checked) newSet.add(p.id);
                            else newSet.delete(p.id);
                            setSelectedDelivPayouts(newSet);
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#09090B', fontFamily: 'monospace' }}>
                        {p.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1E40AF' }}>
                        {p.ownerName || p.accountHolderName || 'Delivery Partner'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        {p.walletAccountId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#09090B' }}>
                        ₹{(p.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155' }}>
                        {p.bankName || 'Bank'} • {p.accountNumber ? `•• ${p.accountNumber.slice(-4)}` : '••••'} ({p.ifscCode || 'IFSC'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: p.status === 'COMPLETED' ? '#DCFCE7' : p.status === 'PROCESSING' ? '#EFF6FF' : '#FEF3C7',
                            color: p.status === 'COMPLETED' ? '#166534' : p.status === 'PROCESSING' ? '#1D4ED8' : '#B45309',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          ● {p.status || 'REQUESTED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                        {p.createdAt ? String(p.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {(p.status === 'REQUESTED' || p.status === 'FAILED') ? (
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => approvePayouts({ payoutIds: [p.id] })}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#0F3D21',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedDelivPayouts.size > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApproveDelivPayouts}
                  disabled={isApproving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isApproving ? '#94A3B8' : '#0F3D21',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: isApproving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isApproving ? 'Processing...' : `Approve & Disburse ${selectedDelivPayouts.size} Selected`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: FOODIE ADMIN EARNINGS */}
      {activeTab === 'EARNINGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F3D21', margin: 0 }}>
              Foodie Admin Net Platform Revenue Breakdown
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px' }}>
              Real-time accumulated earnings breakdown across all processed order settlements.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>14% Food Item Commission</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0F3D21', margin: '8px 0' }}>
                  ₹{serverSettlements.reduce((acc, s) => acc + (s.restaurantFoodCommission || 0), 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#166534' }}>14% retained on total food subtotal</div>
              </div>

              <div style={{ backgroundColor: '#FAFAFA', padding: 20, borderRadius: 12, border: '1px solid #E4E4E7' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#71717A', textTransform: 'uppercase' }}>10% Delivery Fee Commission</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '8px 0' }}>
                  ₹{serverSettlements.reduce((acc, s) => acc + (s.deliveryPartnerCommission || 0), 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#52525B' }}>10% retained on total delivery fee</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Fixed Platform Service Fees</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', margin: '8px 0' }}>
                  ₹{serverSettlements.reduce((acc, s) => acc + (s.platformFee || 40), 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#B45309' }}>₹40 fixed per order retained 100%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: COMMISSION RULES */}
      {activeTab === 'COMMISSION_RULES' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: 24,
            maxWidth: 600,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D21', margin: 0 }}>
            Platform Commission & Fee Configuration
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px' }}>
            Modify active backend commission rates for real-time order distribution calculations.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Restaurant Food Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configRestRate}
                onChange={(e) => setConfigRestRate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#64748B' }}>Deducted from restaurant food subtotal (Default: 14%)</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Delivery Partner Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configDelivRate}
                onChange={(e) => setConfigDelivRate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#64748B' }}>Deducted from driver delivery payout (Default: 10%)</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Fixed Platform Service Fee (₹ per order)
              </label>
              <input
                type="number"
                min="0"
                value={configPlatformFee}
                onChange={(e) => setConfigPlatformFee(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#64748B' }}>Retained 100% by Foodie Admin per order (Default: ₹40)</span>
            </div>

            <button
              type="submit"
              disabled={isSavingRules}
              style={{
                padding: '12px 20px',
                backgroundColor: '#0F3D21',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              {isSavingRules ? 'Saving to Database...' : 'Save & Publish Commission Rules'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: REFUNDS & REVERSALS */}
      {activeTab === 'REFUNDS' && (
        <div style={{ maxWidth: 600 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E4E4E7',
              borderTop: '4px solid #0F3D21',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#09090B', margin: 0 }}>
                Initiate Real Customer Refund / Reversal
              </h3>
              <p style={{ fontSize: 12, color: '#71717A', margin: '4px 0 0' }}>
                Process an official refund through backend Payment Service & update customer wallet / Razorpay gateway.
              </p>
            </div>

            <form onSubmit={handleProcessRefund} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                  Payment UUID / ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Payment UUID"
                  value={refundPaymentUuid}
                  onChange={(e) => setRefundPaymentUuid(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                  Reason for Refund *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Order cancellation, food quality complaint, or missing item..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 12, fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="submit"
                disabled={isRefunding}
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginTop: 8,
                }}
              >
                {isRefunding ? 'Processing Refund...' : 'Execute Payment Refund'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSE MODAL */}
      {selectedDisburseId ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#09090B', margin: 0 }}>
              Disburse Restaurant Settlement
            </h3>
            <p style={{ fontSize: 12, color: '#71717A', margin: 0 }}>
              Enter the bank transaction reference number for settlement ID: <strong style={{ fontFamily: 'monospace' }}>{selectedDisburseId}</strong>.
            </p>

            <form onSubmit={handleDisburseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                  Bank Reference Number / UTR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR129048102938"
                  value={disburseTxRef}
                  onChange={(e) => setDisburseTxRef(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDisburseId(null)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E4E4E7', backgroundColor: '#F4F4F5', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisbursing}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#0F3D21',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isDisbursing ? 'Disbursing...' : 'Confirm Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* CONFIGURATION MODAL */}
      {isConfigOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#09090B', margin: 0 }}>
                Configure Commission & Fee Rules
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#71717A' }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#71717A', margin: 0 }}>
              Adjust global platform commission rates applied to incoming customer bill payments.
            </p>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Restaurant Food Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configRestRate}
                onChange={(e) => setConfigRestRate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#71717A' }}>Deducted from restaurant food item subtotal</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Delivery Partner Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configDelivRate}
                onChange={(e) => setConfigDelivRate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#71717A' }}>Deducted from order delivery fee payout</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B', display: 'block', marginBottom: 4 }}>
                Platform Fixed Service Fee (₹ per order)
              </label>
              <input
                type="number"
                min="0"
                value={configPlatformFee}
                onChange={(e) => setConfigPlatformFee(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 13, fontWeight: 700 }}
              />
              <span style={{ fontSize: 11, color: '#71717A' }}>Retained 100% by Admin per transaction</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E4E4E7', backgroundColor: '#F4F4F5', fontSize: 13, cursor: 'cursor' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSaveConfig(e)}
                disabled={isSavingRules}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#0F3D21',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {isSavingRules ? 'Saving...' : 'Save Rules'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
