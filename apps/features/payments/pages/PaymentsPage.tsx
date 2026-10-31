'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  CancelledOrderRefundRequest,
  TransactionDateFilter,
  PaymentDateFilter,
} from '../types';
import {
  calculatePaymentSplit,
  calculateSettlementEarnings,
  filterTransactionsByDateRange,
  filterRecordsByDateRange,
} from '../types';

import {
  useCalculateSplitMutation,
  useDisburseRestaurantSettlementMutation,
  useGetAdminPayoutsQuery,
  useGetCommissionRulesQuery,
  useGetLedgerQuery,
  useGetRestaurantSettlementsQuery,
  useGetSettlementsQuery,
  useGetTransactionsQuery,
  useUpdateCommissionRulesMutation,
  useApprovePayoutsMutation,
  useRejectPayoutMutation,
  useGetCancelledOrderRefundsQuery,
  useApproveCancelledOrderRefundMutation,
  useRejectCancelledOrderRefundMutation,
  useSimulateCustomerCancellationMutation,
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

interface PaymentTabDateFilterBarProps {
  idPrefix: string;
  filter: PaymentDateFilter;
  onFilterChange: (f: PaymentDateFilter) => void;
  customStartDate: string;
  onStartDateChange: (val: string) => void;
  customEndDate: string;
  onEndDateChange: (val: string) => void;
  onReset: () => void;
  options?: { key: PaymentDateFilter; label: string }[];
  onApply?: () => void;
  rangeError?: string | null;
  resetButtonLabel?: string;
  applyButtonLabel?: string;
  containerStyle?: React.CSSProperties;
}

const EARNINGS_AND_REFUNDS_DATE_OPTIONS: { key: PaymentDateFilter; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'THIS_WEEK', label: 'This Week' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'CUSTOM', label: 'Custom Date Range' },
];

function PaymentTabDateFilterBar({
  idPrefix,
  filter,
  onFilterChange,
  customStartDate,
  onStartDateChange,
  customEndDate,
  onEndDateChange,
  onReset,
  options: customOptions,
  onApply,
  rangeError,
  resetButtonLabel = 'Reset to All',
  applyButtonLabel = 'Apply Filter',
  containerStyle,
}: PaymentTabDateFilterBarProps) {
  const options: { key: PaymentDateFilter; label: string }[] = customOptions || [
    { key: 'ALL', label: 'All Records' },
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday' },
    { key: 'THIS_WEEK', label: 'This Week' },
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'THIS_YEAR', label: 'This Year' },
    { key: 'CUSTOM', label: 'Custom Date Range' },
  ];

  return (
    <div
      style={{
        padding: '12px 20px',
        backgroundColor: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        ...containerStyle,
      }}
    >
      {/* Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Date Range:</span>
        {options.map((opt) => {
          const isActive = filter === opt.key;
          return (
            <button
              key={opt.key}
              id={`${idPrefix}-filter-${opt.key.toLowerCase().replace('_', '-')}`}
              type="button"
              onClick={() => onFilterChange(opt.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? '1px solid #2196F3' : '1px solid #E5E7EB',
                backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                color: isActive ? '#2196F3' : '#6B7280',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Selectors */}
      {filter === 'CUSTOM' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor={`${idPrefix}-start-date`} style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
              From:
            </label>
            <input
              id={`${idPrefix}-start-date`}
              type="date"
              value={customStartDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: rangeError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 12,
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor={`${idPrefix}-end-date`} style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
              To:
            </label>
            <input
              id={`${idPrefix}-end-date`}
              type="date"
              value={customEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: rangeError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 12,
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>

          {onApply && (
            <button
              id={`${idPrefix}-apply-custom-dates`}
              type="button"
              onClick={onApply}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #2196F3',
                backgroundColor: '#2196F3',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {applyButtonLabel}
            </button>
          )}

          {(customStartDate || customEndDate) && (
            <button
              id={`${idPrefix}-clear-dates`}
              type="button"
              onClick={() => {
                onStartDateChange('');
                onEndDateChange('');
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 11,
                fontWeight: 600,
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              Clear Dates
            </button>
          )}

          <button
            id={`${idPrefix}-reset-to-all`}
            type="button"
            onClick={onReset}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #BFDBFE',
              backgroundColor: '#EFF6FF',
              fontSize: 11,
              fontWeight: 600,
              color: '#2196F3',
              cursor: 'pointer',
            }}
          >
            {resetButtonLabel}
          </button>

          {rangeError && (
            <span
              id={`${idPrefix}-range-error`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#EF4444',
                marginLeft: 4,
              }}
            >
              {rangeError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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
  const { data: restaurantPayouts = [], isLoading: restPayoutsLoading, refetch: refetchRestPayouts } = useGetAdminPayoutsQuery({ ownerType: 'RESTAURANT' });
  const { data: deliveryPayouts = [], isLoading: delivPayoutsLoading, refetch: refetchDelivPayouts } = useGetAdminPayoutsQuery({ ownerType: 'DELIVERY_PARTNER' });
  const { data: restaurantsData } = useGetAdminRestaurantsQuery({});
  const { data: partnersData } = useGetAdminDeliveryPartnersQuery();
  const { data: cancelledRefunds = [], isLoading: cancelledRefundsLoading, refetch: refetchCancelledRefunds } =
    useGetCancelledOrderRefundsQuery();

  // RTK Mutations
  const [updateRules, { isLoading: isSavingRules }] = useUpdateCommissionRulesMutation();
  const [disburseSettlement, { isLoading: isDisbursing }] = useDisburseRestaurantSettlementMutation();
  const [calculateSplitApi] = useCalculateSplitMutation();
  const [approvePayouts, { isLoading: isApproving }] = useApprovePayoutsMutation();
  const [rejectPayout, { isLoading: isRejecting }] = useRejectPayoutMutation();
  const [approveCancelledRefund] = useApproveCancelledOrderRefundMutation();
  const [rejectCancelledRefund] = useRejectCancelledOrderRefundMutation();

  // Local State
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig>(DEFAULT_COMMISSION_CONFIG);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Executive Overview Date Filter State (Exclusively for Executive Overview tab)
  const [overviewDateFilter, setOverviewDateFilter] = useState<PaymentDateFilter>('THIS_MONTH');
  const [overviewDraftStartDate, setOverviewDraftStartDate] = useState<string>('');
  const [overviewDraftEndDate, setOverviewDraftEndDate] = useState<string>('');
  const [overviewAppliedStartDate, setOverviewAppliedStartDate] = useState<string>('');
  const [overviewAppliedEndDate, setOverviewAppliedEndDate] = useState<string>('');
  const [overviewRangeError, setOverviewRangeError] = useState<string | null>(null);

  const handleOverviewPresetChange = (preset: PaymentDateFilter) => {
    setOverviewDateFilter(preset);
    setOverviewRangeError(null);
    if (preset !== 'CUSTOM') {
      setOverviewDraftStartDate('');
      setOverviewDraftEndDate('');
      setOverviewAppliedStartDate('');
      setOverviewAppliedEndDate('');
    }
  };

  const handleApplyOverviewCustomDates = () => {
    if (overviewDraftStartDate && overviewDraftEndDate && overviewDraftStartDate > overviewDraftEndDate) {
      setOverviewRangeError('From date cannot be later than To date.');
      showToast('Invalid date range: From date cannot be later than To date.');
      return;
    }
    setOverviewRangeError(null);
    setOverviewAppliedStartDate(overviewDraftStartDate);
    setOverviewAppliedEndDate(overviewDraftEndDate);
  };

  const handleClearOverviewDates = () => {
    setOverviewDraftStartDate('');
    setOverviewDraftEndDate('');
    setOverviewAppliedStartDate('');
    setOverviewAppliedEndDate('');
    setOverviewRangeError(null);
  };

  const overviewFilteredSettlements = useMemo(() => {
    return filterRecordsByDateRange(
      serverSettlements,
      overviewDateFilter,
      (s) => s.settledAt,
      overviewAppliedStartDate,
      overviewAppliedEndDate
    );
  }, [serverSettlements, overviewDateFilter, overviewAppliedStartDate, overviewAppliedEndDate]);

  // Transactions Date Filter State
  const [txDateFilter, setTxDateFilter] = useState<TransactionDateFilter>('ALL');
  const [txCustomStartDate, setTxCustomStartDate] = useState<string>('');
  const [txCustomEndDate, setTxCustomEndDate] = useState<string>('');

  const handleResetDateFilter = () => {
    setTxDateFilter('ALL');
    setTxCustomStartDate('');
    setTxCustomEndDate('');
  };

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByDateRange(
      serverTransactions,
      txDateFilter,
      txCustomStartDate,
      txCustomEndDate
    );
  }, [serverTransactions, txDateFilter, txCustomStartDate, txCustomEndDate]);

  // Master Order Settlements Date Filter State
  const [settlementDateFilter, setSettlementDateFilter] = useState<PaymentDateFilter>('ALL');
  const [settlementCustomStartDate, setSettlementCustomStartDate] = useState<string>('');
  const [settlementCustomEndDate, setSettlementCustomEndDate] = useState<string>('');

  const handleResetSettlementFilter = () => {
    setSettlementDateFilter('ALL');
    setSettlementCustomStartDate('');
    setSettlementCustomEndDate('');
  };

  const filteredSettlements = useMemo(() => {
    return filterRecordsByDateRange(
      serverSettlements,
      settlementDateFilter,
      (s) => s.settledAt,
      settlementCustomStartDate,
      settlementCustomEndDate
    );
  }, [serverSettlements, settlementDateFilter, settlementCustomStartDate, settlementCustomEndDate]);

  // Restaurant Order Settlements Date Filter State
  const [restSettlementDateFilter, setRestSettlementDateFilter] = useState<PaymentDateFilter>('ALL');
  const [restSettlementCustomStartDate, setRestSettlementCustomStartDate] = useState<string>('');
  const [restSettlementCustomEndDate, setRestSettlementCustomEndDate] = useState<string>('');

  const handleResetRestSettlementFilter = () => {
    setRestSettlementDateFilter('ALL');
    setRestSettlementCustomStartDate('');
    setRestSettlementCustomEndDate('');
  };

  const filteredRestaurantSettlements = useMemo(() => {
    return filterRecordsByDateRange(
      restaurantSettlements,
      restSettlementDateFilter,
      (rs) => rs.paidAt || rs.periodEnd || rs.periodStart,
      restSettlementCustomStartDate,
      restSettlementCustomEndDate
    );
  }, [restaurantSettlements, restSettlementDateFilter, restSettlementCustomStartDate, restSettlementCustomEndDate]);

  // Audit Ledger Date Filter State
  const [ledgerDateFilter, setLedgerDateFilter] = useState<PaymentDateFilter>('ALL');
  const [ledgerCustomStartDate, setLedgerCustomStartDate] = useState<string>('');
  const [ledgerCustomEndDate, setLedgerCustomEndDate] = useState<string>('');

  const handleResetLedgerFilter = () => {
    setLedgerDateFilter('ALL');
    setLedgerCustomStartDate('');
    setLedgerCustomEndDate('');
  };

  const filteredLedger = useMemo(() => {
    return filterRecordsByDateRange(
      serverLedger,
      ledgerDateFilter,
      (l) => l.createdAt,
      ledgerCustomStartDate,
      ledgerCustomEndDate
    );
  }, [serverLedger, ledgerDateFilter, ledgerCustomStartDate, ledgerCustomEndDate]);

  // Restaurant Wallet Payouts Date Filter State
  const [restPayoutDateFilter, setRestPayoutDateFilter] = useState<PaymentDateFilter>('ALL');
  const [restPayoutCustomStartDate, setRestPayoutCustomStartDate] = useState<string>('');
  const [restPayoutCustomEndDate, setRestPayoutCustomEndDate] = useState<string>('');

  const handleResetRestPayoutFilter = () => {
    setRestPayoutDateFilter('ALL');
    setRestPayoutCustomStartDate('');
    setRestPayoutCustomEndDate('');
  };

  const filteredRestaurantPayouts = useMemo(() => {
    return filterRecordsByDateRange(
      restaurantPayouts,
      restPayoutDateFilter,
      (p) => p.createdAt || p.updatedAt,
      restPayoutCustomStartDate,
      restPayoutCustomEndDate
    );
  }, [restaurantPayouts, restPayoutDateFilter, restPayoutCustomStartDate, restPayoutCustomEndDate]);

  // Delivery Partner Payouts Date Filter State
  const [delivPayoutDateFilter, setDelivPayoutDateFilter] = useState<PaymentDateFilter>('ALL');
  const [delivPayoutCustomStartDate, setDelivPayoutCustomStartDate] = useState<string>('');
  const [delivPayoutCustomEndDate, setDelivPayoutCustomEndDate] = useState<string>('');

  const handleResetDelivPayoutFilter = () => {
    setDelivPayoutDateFilter('ALL');
    setDelivPayoutCustomStartDate('');
    setDelivPayoutCustomEndDate('');
  };

  const filteredDeliveryPayouts = useMemo(() => {
    return filterRecordsByDateRange(
      deliveryPayouts,
      delivPayoutDateFilter,
      (p) => p.createdAt || p.updatedAt,
      delivPayoutCustomStartDate,
      delivPayoutCustomEndDate
    );
  }, [deliveryPayouts, delivPayoutDateFilter, delivPayoutCustomStartDate, delivPayoutCustomEndDate]);

  // Cancelled Orders Online Refund State
  const [refundSearchTerm, setRefundSearchTerm] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState<'ALL' | 'PENDING' | 'PROCESSED'>('PENDING');
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  // Live Simulator State
  const [simCustomerName, setSimCustomerName] = useState('Arthur Pendelton');
  const [simFoodCost, setSimFoodCost] = useState('500');
  const [simDeliveryFee, setSimDeliveryFee] = useState('80');
  const [simRestaurantName, setSimRestaurantName] = useState('');
  const [simDriverName, setSimDriverName] = useState('');
  const [simPayMethod, setSimPayMethod] = useState<'CASHFREE_UPI' | 'CREDIT_CARD' | 'FOODIE_WALLET'>('CASHFREE_UPI');

  // Config Modal & Rules Form
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configRestRate, setConfigRestRate] = useState('14');
  const [configDelivRate, setConfigDelivRate] = useState('10');
  const [configPlatformFee, setConfigPlatformFee] = useState('40');

  // Disburse Modal State
  const [selectedDisburseId, setSelectedDisburseId] = useState<string | null>(null);
  const [disburseTxRef, setDisburseTxRef] = useState('');

  // Bulk Approval State
  const [selectedRestPayouts, setSelectedRestPayouts] = useState<Set<string>>(new Set());
  const [selectedDelivPayouts, setSelectedDelivPayouts] = useState<Set<string>>(new Set());

  // Admin Earnings Date Filter State (Exclusively for Admin Earnings tab)
  const [earningsDateFilter, setEarningsDateFilter] = useState<PaymentDateFilter>('THIS_MONTH');
  const [earningsDraftStartDate, setEarningsDraftStartDate] = useState<string>('');
  const [earningsDraftEndDate, setEarningsDraftEndDate] = useState<string>('');
  const [earningsAppliedStartDate, setEarningsAppliedStartDate] = useState<string>('');
  const [earningsAppliedEndDate, setEarningsAppliedEndDate] = useState<string>('');
  const [earningsRangeError, setEarningsRangeError] = useState<string | null>(null);

  const handleEarningsPresetChange = (preset: PaymentDateFilter) => {
    setEarningsDateFilter(preset);
    setEarningsRangeError(null);
    if (preset !== 'CUSTOM') {
      setEarningsDraftStartDate('');
      setEarningsDraftEndDate('');
      setEarningsAppliedStartDate('');
      setEarningsAppliedEndDate('');
    }
  };

  const handleApplyEarningsCustomDates = () => {
    if (earningsDraftStartDate && earningsDraftEndDate && earningsDraftStartDate > earningsDraftEndDate) {
      setEarningsRangeError('Start date cannot be later than End date.');
      showToast('Invalid date range: Start date cannot be later than End date.');
      return;
    }
    setEarningsRangeError(null);
    setEarningsAppliedStartDate(earningsDraftStartDate);
    setEarningsAppliedEndDate(earningsDraftEndDate);
  };

  const handleResetEarningsFilter = () => {
    setEarningsDateFilter('THIS_MONTH');
    setEarningsDraftStartDate('');
    setEarningsDraftEndDate('');
    setEarningsAppliedStartDate('');
    setEarningsAppliedEndDate('');
    setEarningsRangeError(null);
  };

  const earningsFilteredSettlements = useMemo(() => {
    return filterRecordsByDateRange(
      serverSettlements,
      earningsDateFilter,
      (s) => s.settledAt,
      earningsAppliedStartDate,
      earningsAppliedEndDate
    );
  }, [serverSettlements, earningsDateFilter, earningsAppliedStartDate, earningsAppliedEndDate]);

  const eligibleEarningsSettlements = useMemo(() => {
    return earningsFilteredSettlements.filter(
      (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
    );
  }, [earningsFilteredSettlements]);

  const totalFoodCommission = useMemo(() => {
    return eligibleEarningsSettlements.reduce((acc, s) => {
      return acc + calculateSettlementEarnings(s, commissionConfig).foodCommission;
    }, 0);
  }, [eligibleEarningsSettlements, commissionConfig]);

  const totalDeliveryCommission = useMemo(() => {
    return eligibleEarningsSettlements.reduce((acc, s) => {
      return acc + calculateSettlementEarnings(s, commissionConfig).deliveryCommission;
    }, 0);
  }, [eligibleEarningsSettlements, commissionConfig]);

  const totalPlatformFees = useMemo(() => {
    return eligibleEarningsSettlements.reduce((acc, s) => {
      return acc + calculateSettlementEarnings(s, commissionConfig).platformFee;
    }, 0);
  }, [eligibleEarningsSettlements, commissionConfig]);

  const totalAdminEarningsRevenue = useMemo(() => {
    return totalFoodCommission + totalDeliveryCommission + totalPlatformFees;
  }, [totalFoodCommission, totalDeliveryCommission, totalPlatformFees]);

  // Refunds & Reversals Date Filter State
  const [refundsDateFilter, setRefundsDateFilter] = useState<PaymentDateFilter>('THIS_MONTH');
  const [refundsDraftStartDate, setRefundsDraftStartDate] = useState<string>('');
  const [refundsDraftEndDate, setRefundsDraftEndDate] = useState<string>('');
  const [refundsAppliedStartDate, setRefundsAppliedStartDate] = useState<string>('');
  const [refundsAppliedEndDate, setRefundsAppliedEndDate] = useState<string>('');
  const [refundsRangeError, setRefundsRangeError] = useState<string | null>(null);

  // Pagination & Sorting State for Refunds
  const [refundCurrentPage, setRefundCurrentPage] = useState<number>(1);
  const [refundSortBy, setRefundSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
  const refundItemsPerPage = 5;

  const handleRefundsPresetChange = (preset: PaymentDateFilter) => {
    setRefundsDateFilter(preset);
    setRefundsRangeError(null);
    setRefundCurrentPage(1);
    if (preset !== 'CUSTOM') {
      setRefundsDraftStartDate('');
      setRefundsDraftEndDate('');
      setRefundsAppliedStartDate('');
      setRefundsAppliedEndDate('');
    }
  };

  const handleApplyRefundsCustomDates = () => {
    if (refundsDraftStartDate && refundsDraftEndDate && refundsDraftStartDate > refundsDraftEndDate) {
      setRefundsRangeError('Start date cannot be later than End date.');
      showToast('Invalid date range: Start date cannot be later than End date.');
      return;
    }
    setRefundsRangeError(null);
    setRefundsAppliedStartDate(refundsDraftStartDate);
    setRefundsAppliedEndDate(refundsDraftEndDate);
    setRefundCurrentPage(1);
  };

  const handleResetRefundsFilter = () => {
    setRefundsDateFilter('THIS_MONTH');
    setRefundsDraftStartDate('');
    setRefundsDraftEndDate('');
    setRefundsAppliedStartDate('');
    setRefundsAppliedEndDate('');
    setRefundsRangeError(null);
    setRefundStatusFilter('PENDING');
    setRefundSearchTerm('');
    setRefundSortBy('DATE_DESC');
    setRefundCurrentPage(1);
  };

  // Strictly include only genuine online payment cancellations (exclude Cash on Delivery / COD)
  const onlineCancelledRefunds = useMemo(() => {
    return cancelledRefunds.filter(
      (r) =>
        Boolean(r.isOnlinePayment) &&
        !r.paymentMethod?.toUpperCase().includes('COD') &&
        !r.paymentMethod?.toUpperCase().includes('CASH ON DELIVERY')
    );
  }, [cancelledRefunds]);

  // Date-filtered refunds using refund initiation date (cancelledAt)
  const dateFilteredRefunds = useMemo(() => {
    return filterRecordsByDateRange(
      onlineCancelledRefunds,
      refundsDateFilter,
      (r) => r.cancelledAt || (r as any).createdAt || r.reviewedAt,
      refundsAppliedStartDate,
      refundsAppliedEndDate
    );
  }, [onlineCancelledRefunds, refundsDateFilter, refundsAppliedStartDate, refundsAppliedEndDate]);

  const pendingCancelledRefunds = dateFilteredRefunds.filter((r) => r.status === 'PENDING_APPROVAL');
  const pendingOnlineRefundCount = pendingCancelledRefunds.length;
  const processedCancelledRefunds = dateFilteredRefunds.filter((r) => r.status === 'APPROVED' || r.status === 'REFUNDED');

  const filteredRefundList = useMemo(() => {
    let list = dateFilteredRefunds.filter((r) => {
      if (refundStatusFilter === 'PENDING' && r.status !== 'PENDING_APPROVAL') return false;
      if (
        refundStatusFilter === 'PROCESSED' &&
        r.status !== 'APPROVED' &&
        r.status !== 'REFUNDED' &&
        r.status !== 'REJECTED'
      ) {
        return false;
      }
      if (refundSearchTerm.trim()) {
        const q = refundSearchTerm.toLowerCase();
        return (
          r.customerName.toLowerCase().includes(q) ||
          r.customerId.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.paymentUuid.toLowerCase().includes(q) ||
          (r.gatewayTransactionId && r.gatewayTransactionId.toLowerCase().includes(q))
        );
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const timeA = new Date(a.cancelledAt || 0).getTime();
      const timeB = new Date(b.cancelledAt || 0).getTime();
      if (refundSortBy === 'DATE_DESC') return timeB - timeA;
      if (refundSortBy === 'DATE_ASC') return timeA - timeB;
      if (refundSortBy === 'AMOUNT_DESC') return (b.amount || 0) - (a.amount || 0);
      if (refundSortBy === 'AMOUNT_ASC') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    return list;
  }, [dateFilteredRefunds, refundStatusFilter, refundSearchTerm, refundSortBy]);

  const totalRefundPages = Math.max(1, Math.ceil(filteredRefundList.length / refundItemsPerPage));
  const paginatedRefundList = useMemo(() => {
    const startIndex = (refundCurrentPage - 1) * refundItemsPerPage;
    return filteredRefundList.slice(startIndex, startIndex + refundItemsPerPage);
  }, [filteredRefundList, refundCurrentPage, refundItemsPerPage]);

  const handleApproveRefundRequest = async (request: CancelledOrderRefundRequest) => {
    setProcessingRefundId(request.id);
    try {
      await approveCancelledRefund({ id: request.id }).unwrap();
      showToast(`Refund of ₹${request.amount.toFixed(2)} approved & disbursed to ${request.customerName} via Cashfree Payment Gateway!`);
      void refetchCancelledRefunds();
    } catch (err: any) {
      alert(`Approval error: ${err?.data?.error?.message || err?.message || 'Failed'}`);
    } finally {
      setProcessingRefundId(null);
    }
  };

  const handleRejectRefundRequest = async (request: CancelledOrderRefundRequest) => {
    const reason = prompt('Please enter rejection reason:', 'Customer order already prepared / duplicate refund request');
    if (!reason) return;
    setProcessingRefundId(request.id);
    try {
      await rejectCancelledRefund({ id: request.id, reason }).unwrap();
      showToast(`Refund request for Order #${request.orderId} rejected.`);
      void refetchCancelledRefunds();
    } catch (err: any) {
      alert(`Rejection error: ${err?.data?.error?.message || err?.message || 'Failed'}`);
    } finally {
      setProcessingRefundId(null);
    }
  };






  const handleApproveSinglePayout = async (payoutId: string, type: 'DELIVERY' | 'RESTAURANT' = 'DELIVERY') => {
    try {
      await approvePayouts({ payoutIds: [payoutId] }).unwrap();
      showToast(`Successfully initiated disbursal via Cashfree for ${type === 'DELIVERY' ? 'Delivery Partner' : 'Restaurant'} Payout!`);
      setSelectedDelivPayouts((prev) => {
        const next = new Set(prev);
        next.delete(payoutId);
        return next;
      });
      setSelectedRestPayouts((prev) => {
        const next = new Set(prev);
        next.delete(payoutId);
        return next;
      });
      if (type === 'DELIVERY') {
        refetchDelivPayouts();
      } else {
        refetchRestPayouts();
      }
    } catch (err) {
      showToast(`Failed to approve ${type === 'DELIVERY' ? 'delivery partner' : 'restaurant'} payout.`);
    }
  };

  const handleRejectSinglePayout = async (payoutId: string, type: 'DELIVERY' | 'RESTAURANT' = 'DELIVERY') => {
    try {
      await rejectPayout({ payoutId, reason: 'Rejected by admin' }).unwrap();
      showToast(`Successfully rejected and refunded ${type === 'DELIVERY' ? 'delivery partner' : 'restaurant'} payout!`);
      setSelectedDelivPayouts((prev) => {
        const next = new Set(prev);
        next.delete(payoutId);
        return next;
      });
      setSelectedRestPayouts((prev) => {
        const next = new Set(prev);
        next.delete(payoutId);
        return next;
      });
      if (type === 'DELIVERY') {
        refetchDelivPayouts();
      } else {
        refetchRestPayouts();
      }
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || `Failed to reject ${type === 'DELIVERY' ? 'delivery partner' : 'restaurant'} payout.`);
    }
  };

  const handleApproveRestPayouts = async () => {
    if (selectedRestPayouts.size === 0) return;
    try {
      await approvePayouts({ payoutIds: Array.from(selectedRestPayouts) }).unwrap();
      showToast(`Successfully initiated disbursal via Cashfree for ${selectedRestPayouts.size} Restaurant Payouts!`);
      setSelectedRestPayouts(new Set());
      refetchRestPayouts();
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
      refetchDelivPayouts();
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

  // Live Financial Metrics Calculated from Real Database Data (filtered by Executive Overview date range)
  const totalAdminEscrowPaid = overviewFilteredSettlements.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalAdminNetRevenue = overviewFilteredSettlements.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
  const totalDistributedToRestaurants = overviewFilteredSettlements.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
  const totalDistributedToDrivers = overviewFilteredSettlements.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

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



  const renderTabsHeader = () => (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#FFFFFF',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        gap: 6,
        overflowX: 'auto',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      }}
    >
      {[
        { key: 'OVERVIEW', label: 'Executive Overview' },
        { key: 'TRANSACTIONS', label: `Transactions (${serverTransactions.length})` },
        { key: 'SETTLEMENTS', label: `Master Order Settlements (${serverSettlements.length})` },
        { key: 'RESTAURANT_SETTLEMENTS', label: `Restaurant Order Settlements (${restaurantSettlements.length})` },
        { key: 'LEDGER', label: `Audit Ledger (${serverLedger.length})` },
        { key: 'RESTAURANT_PAYOUTS', label: `Restaurant Wallet Payouts (${restaurantPayouts.length})` },
        { key: 'DELIVERY_PAYOUTS', label: `Delivery Partner Payouts (${deliveryPayouts.length})` },
        { key: 'EARNINGS', label: 'Admin Earnings' },
        { key: 'COMMISSION_RULES', label: 'Commission Rules' },
        { key: 'REFUNDS', label: `Refunds & Reversals${pendingOnlineRefundCount > 0 ? ` (${pendingOnlineRefundCount} Pending)` : ''}` },
      ].map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as TabKey)}
            style={{
              padding: '8px 16px',
              border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
              borderRadius: 10,
              background: isActive ? '#E3F2FD' : 'transparent',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2196F3' : '#6B7280',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        );
      })}
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
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '14px 24px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(33, 150, 243, 0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toastMsg}</span>
        </div>
      ) : null}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#111827" style={{ margin: 0, fontWeight: 800 }}>
            Foodie Platform — Payment & Commission Settlement Center
          </Text>
          <Text as="p" variant="caption" color="#6B7280" style={{ margin: '4px 0 0' }}>
            Single source of truth for customer payments, 14% restaurant commissions, 10% delivery commissions, ₹40 platform fees, and wallet ledger postings.
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
              transition: 'transform 0.15s ease',
            }}
          >
            Edit Commission Rules (14% / 10% / ₹40)
          </button>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      {renderTabsHeader()}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Executive Overview Date Filter Section */}
          <div
            id="overview-date-filter-bar"
            style={{
              padding: '12px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Date Range:</span>
              {[
                { key: 'TODAY' as const, label: 'Today' },
                { key: 'THIS_WEEK' as const, label: 'This Week' },
                { key: 'THIS_MONTH' as const, label: 'This Month' },
                { key: 'THIS_YEAR' as const, label: 'This Year' },
                { key: 'CUSTOM' as const, label: 'Custom Date Range' },
              ].map((opt) => {
                const isActive = overviewDateFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    id={`overview-filter-${opt.key.toLowerCase().replace('_', '-')}`}
                    type="button"
                    onClick={() => handleOverviewPresetChange(opt.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isActive ? '1px solid #2196F3' : '1px solid #E5E7EB',
                      backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                      color: isActive ? '#2196F3' : '#6B7280',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range Selectors */}
            {overviewDateFilter === 'CUSTOM' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="overview-start-date" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    From:
                  </label>
                  <input
                    id="overview-start-date"
                    type="date"
                    value={overviewDraftStartDate}
                    onChange={(e) => {
                      setOverviewDraftStartDate(e.target.value);
                      setOverviewRangeError(null);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: overviewRangeError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="overview-end-date" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    To:
                  </label>
                  <input
                    id="overview-end-date"
                    type="date"
                    value={overviewDraftEndDate}
                    onChange={(e) => {
                      setOverviewDraftEndDate(e.target.value);
                      setOverviewRangeError(null);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: overviewRangeError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  id="overview-apply-custom-dates"
                  type="button"
                  onClick={handleApplyOverviewCustomDates}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid #2196F3',
                    backgroundColor: '#2196F3',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Apply
                </button>

                {(overviewDraftStartDate || overviewDraftEndDate || overviewAppliedStartDate || overviewAppliedEndDate) && (
                  <button
                    id="overview-clear-dates"
                    type="button"
                    onClick={handleClearOverviewDates}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6B7280',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Dates
                  </button>
                )}

                {overviewRangeError && (
                  <span
                    id="overview-range-error"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#EF4444',
                      marginLeft: 4,
                    }}
                  >
                    {overviewRangeError}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Financial Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                padding: '24px',
                borderRadius: 20,
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Admin Escrow Pool
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                ₹{totalAdminEscrowPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9, marginTop: 6 }}>
                100% Customer Bill Direct Collections
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text as="span" variant="caption" color="#6B7280" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Total Admin Platform Revenue
              </Text>
              <Text as="h2" variant="heading1" color="#111827" style={{ marginTop: 8, fontWeight: 800 }}>
                ₹{totalAdminNetRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
                14% Rest. Comm + 10% Driver Comm + ₹{commissionConfig.platformFixedFee} Service Fee
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text as="span" variant="caption" color="#6B7280" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Distributed to Restaurants
              </Text>
              <Text as="h2" variant="heading1" color="#111827" style={{ marginTop: 8, fontWeight: 800 }}>
                ₹{totalDistributedToRestaurants.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
                86% Net Food Subtotal Credited to Vendors
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text as="span" variant="caption" color="#6B7280" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Distributed to Delivery Partners
              </Text>
              <Text as="h2" variant="heading1" color="#111827" style={{ marginTop: 8, fontWeight: 800 }}>
                ₹{totalDistributedToDrivers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
                90% Net Delivery Payout Credited to Riders
              </div>
            </div>
          </div>

          {/* COMMISSION AUTO-SPLIT SIMULATOR & TEST TOOLS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: 24,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
                  Customer Payment & Commission Calculator
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                  Test exact food subtotal and delivery fee split breakdown against current active database rules.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#E3F2FD', color: '#2196F3', border: '1px solid #BFDBFE', padding: '6px 12px', borderRadius: 20 }}>
                ACTIVE BACKEND RULES: 14% Rest Comm | 10% Driver Comm | ₹40 Platform Fee
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Food Subtotal (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={simFoodCost}
                      onChange={(e) => setSimFoodCost(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 700, color: '#111827', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={simDeliveryFee}
                      onChange={(e) => setSimDeliveryFee(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 700, color: '#111827', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Restaurant Store
                    </label>
                    <select
                      value={simRestaurantName}
                      onChange={(e) => setSimRestaurantName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="">-- Select Store --</option>
                      {realRestaurants.map((r: any, idx: number) => (
                        <option key={r.id || r.restaurantId || `rest-${idx}`} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                      Delivery Partner
                    </label>
                    <select
                      value={simDriverName}
                      onChange={(e) => setSimDriverName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="">-- Select Rider --</option>
                      {realPartners.map((dp: any, idx: number) => (
                        <option key={dp.id || dp.partnerId || `dp-${idx}`} value={dp.fullName}>{dp.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Calculated Split Preview Box */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 16,
                  border: '1px solid #E5E7EB',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
                    Real-time Calculated Auto-Split
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E5E7EB', paddingBottom: 8 }}>
                      <span style={{ color: '#6B7280', fontWeight: 600 }}>Total Customer Bill:</span>
                      <span style={{ fontWeight: 800, color: '#111827' }}>₹{livePreviewSplit.totalPaid.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#111827', fontWeight: 700 }}>
                      <span> Foodie Admin Total Commission:</span>
                      <span style={{ color: '#2196F3', fontWeight: 800 }}>₹{livePreviewSplit.adminTotalRevenue.toFixed(2)}</span>
                    </div>

                    <div style={{ fontSize: 12, color: '#6B7280', paddingLeft: 12, marginTop: -4, lineHeight: 1.5 }}>
                      • 14% Food Commission: ₹{livePreviewSplit.adminFoodCommission.toFixed(2)}
                      <br />
                      • 10% Driver Commission: ₹{livePreviewSplit.adminDeliveryCommission.toFixed(2)}
                      <br />
                      • Fixed Service Fee: ₹{livePreviewSplit.platformFee.toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#111827', fontWeight: 700, paddingTop: 4 }}>
                      <span> Restaurant Net Payout (86%):</span>
                      <span style={{ color: '#111827', fontWeight: 800 }}>₹{livePreviewSplit.restaurantNetShare.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#111827', fontWeight: 700 }}>
                      <span> Delivery Partner Net Payout (90%):</span>
                      <span style={{ color: '#111827', fontWeight: 800 }}>₹{livePreviewSplit.deliveryPartnerNetShare.toFixed(2)}</span>
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Real Payment Transactions Database
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                All incoming customer payment transaction records captured from Cashfree / Payment Gateway.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {txDateFilter === 'ALL'
                ? `${serverTransactions.length} Transactions Recorded`
                : `${filteredTransactions.length} of ${serverTransactions.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Date Range:</span>
              {[
                { key: 'ALL' as const, label: 'All Transactions' },
                { key: 'TODAY' as const, label: 'Today' },
                { key: 'THIS_WEEK' as const, label: 'This Week' },
                { key: 'THIS_MONTH' as const, label: 'This Month' },
                { key: 'THIS_YEAR' as const, label: 'This Year' },
                { key: 'CUSTOM' as const, label: 'Custom Date Range' },
              ].map((opt) => {
                const isActive = txDateFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTxDateFilter(opt.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isActive ? '1px solid #2196F3' : '1px solid #E5E7EB',
                      backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                      color: isActive ? '#2196F3' : '#6B7280',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range Selectors */}
            {txDateFilter === 'CUSTOM' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="tx-start-date" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    From:
                  </label>
                  <input
                    id="tx-start-date"
                    type="date"
                    value={txCustomStartDate}
                    onChange={(e) => setTxCustomStartDate(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="tx-end-date" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    To:
                  </label>
                  <input
                    id="tx-end-date"
                    type="date"
                    value={txCustomEndDate}
                    onChange={(e) => setTxCustomEndDate(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                {(txCustomStartDate || txCustomEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxCustomStartDate('');
                      setTxCustomEndDate('');
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6B7280',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Dates
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetDateFilter}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid #BFDBFE',
                    backgroundColor: '#EFF6FF',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#2196F3',
                    cursor: 'pointer',
                  }}
                >
                  Reset to All
                </button>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>User ID</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px' }}>Gateway</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading real payment transactions...</td>
                  </tr>
                ) : serverTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No payment transactions found in database.</td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No transactions found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all transactions.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetDateFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Transactions
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx: PaymentTransactionRecord) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                        {tx.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                        {tx.orderId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: 12 }}>
                        {tx.userId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(tx.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151' }}>
                        {tx.paymentMethod ? tx.paymentMethod.replace(/RAZORPAY/gi, 'CASHFREE') : 'CASHFREE_UPI'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
                        Cashfree ({tx.gatewayTransactionId ? tx.gatewayTransactionId.slice(0, 10) : 'N/A'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            border: '1px solid #BBF7D0',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 20,
                          }}
                        >
                          {tx.status || 'CAPTURED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Order Payment Settlement & Distribution Ledger
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                Real backend settlements showing exact breakdown: Customer Payment → 14% Food Comm → 10% Driver Comm → ₹40 Platform Fee → Net Distributions.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {settlementDateFilter === 'ALL'
                ? `${serverSettlements.length} Settlements`
                : `${filteredSettlements.length} of ${serverSettlements.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <PaymentTabDateFilterBar
            idPrefix="settlements"
            filter={settlementDateFilter}
            onFilterChange={setSettlementDateFilter}
            customStartDate={settlementCustomStartDate}
            onStartDateChange={setSettlementCustomStartDate}
            customEndDate={settlementCustomEndDate}
            onEndDateChange={setSettlementCustomEndDate}
            onReset={handleResetSettlementFilter}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Settlement ID / Order</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Total Paid (Admin)</th>
                  <th style={{ padding: '12px 16px' }}>Admin Net Revenue</th>
                  <th style={{ padding: '12px 16px' }}>Restaurant Net (86%)</th>
                  <th style={{ padding: '12px 16px' }}>Delivery Net (90%)</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Settled At</th>
                </tr>
              </thead>
              <tbody>
                {settlementsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading order settlements...</td>
                  </tr>
                ) : serverSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No settlement records available.</td>
                  </tr>
                ) : filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No settlements found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all settlements.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetSettlementFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Records
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((s: PaymentSettlementRecord) => (
                    <tr key={s.id || s.settlementId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{s.orderNumber || s.orderId}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{s.id || s.settlementId}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{s.customerName || 'Customer'}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{s.paymentMethod ? s.paymentMethod.replace(/RAZORPAY/gi, 'CASHFREE') : 'CASHFREE_UPI'}</div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(s.totalPaid || 0).toFixed(2)}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#2196F3' }}>
                        +₹{(s.adminTotalRevenue || 0).toFixed(2)}
                        <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>
                          Rest: ₹{(s.restaurantFoodCommission || 0).toFixed(2)} | Deliv: ₹{(s.deliveryPartnerCommission || 0).toFixed(2)} | Fee: ₹{(s.platformFee || 40).toFixed(2)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>+₹{(s.restaurantNetShare || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{s.restaurantName || 'Restaurant'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>+₹{(s.deliveryPartnerNetShare || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{s.driverName || 'Rider'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 20,
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          {s.settlementStatus || 'FUNDS_DISTRIBUTED'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Authoritative Double-Entry Financial Ledger
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                Immutable audit trail of all DEBIT & CREDIT postings across Platform, Restaurant, and Driver wallets.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {ledgerDateFilter === 'ALL'
                ? `${serverLedger.length} Ledger Entries`
                : `${filteredLedger.length} of ${serverLedger.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <PaymentTabDateFilterBar
            idPrefix="ledger"
            filter={ledgerDateFilter}
            onFilterChange={setLedgerDateFilter}
            customStartDate={ledgerCustomStartDate}
            onStartDateChange={setLedgerCustomStartDate}
            customEndDate={ledgerCustomEndDate}
            onEndDateChange={setLedgerCustomEndDate}
            onReset={handleResetLedgerFilter}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Entry ID</th>
                  <th style={{ padding: '12px 16px' }}>Wallet Account ID</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Reference Type</th>
                  <th style={{ padding: '12px 16px' }}>Reference ID</th>
                  <th style={{ padding: '12px 16px' }}>Balance After</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading financial ledger entries...</td>
                  </tr>
                ) : serverLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No ledger entries recorded yet.</td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No ledger entries found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all entries.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetLedgerFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Records
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((l: LedgerEntryRecord) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>
                        {l.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, fontFamily: 'monospace', color: '#6B7280' }}>
                        {l.walletAccountId || 'PLATFORM-ESCROW'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: l.entryType === 'CREDIT' ? '#DCFCE7' : '#FEE2E2',
                            color: l.entryType === 'CREDIT' ? '#15803D' : '#B91C1C',
                            border: l.entryType === 'CREDIT' ? '1px solid #BBF7D0' : '1px solid #FECACA',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {l.entryType || 'CREDIT'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: l.entryType === 'CREDIT' ? '#22C55E' : '#EF4444' }}>
                        {l.entryType === 'CREDIT' ? '+' : '-'}₹{(l.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#111827' }}>
                        {l.referenceType || 'ORDER_SETTLEMENT'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                        {l.referenceId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(l.balanceAfter || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Restaurant Order Settlements (14% Comm)
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                Accumulated net 86% food revenue payouts to restaurant partners with formal disbursement tracking.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {restSettlementDateFilter === 'ALL'
                ? `${restaurantSettlements.length} Store Payout Records`
                : `${filteredRestaurantSettlements.length} of ${restaurantSettlements.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <PaymentTabDateFilterBar
            idPrefix="rest-settlements"
            filter={restSettlementDateFilter}
            onFilterChange={setRestSettlementDateFilter}
            customStartDate={restSettlementCustomStartDate}
            onStartDateChange={setRestSettlementCustomStartDate}
            customEndDate={restSettlementCustomEndDate}
            onEndDateChange={setRestSettlementCustomEndDate}
            onReset={handleResetRestSettlementFilter}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Settlement ID</th>
                  <th style={{ padding: '12px 16px' }}>Restaurant Store</th>
                  <th style={{ padding: '12px 16px' }}>Period</th>
                  <th style={{ padding: '12px 16px' }}>Orders Count</th>
                  <th style={{ padding: '12px 16px' }}>Food Subtotal</th>
                  <th style={{ padding: '12px 16px' }}>14% Comm Deducted</th>
                  <th style={{ padding: '12px 16px' }}>Net Payout Amount</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {restSettlementsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading restaurant payouts...</td>
                  </tr>
                ) : restaurantSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No restaurant settlement payout records found.</td>
                  </tr>
                ) : filteredRestaurantSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No restaurant settlement payout records found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all store payouts.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetRestSettlementFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Records
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRestaurantSettlements.map((rs: RestaurantSettlementRecord) => (
                    <tr key={rs.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                        {rs.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                        {rs.restaurantName || 'Partner Store'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
                        {rs.periodStart ? `${rs.periodStart.slice(0, 10)} to ${rs.periodEnd?.slice(0, 10)}` : 'Weekly Cycle'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        {rs.totalOrdersCount || 1}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(rs.totalSubtotal || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#EF4444' }}>
                        -₹{(rs.totalCommission || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827' }}>
                        ₹{(rs.netPayoutAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: rs.status === 'DISBURSED' ? '#DCFCE7' : '#FEF3C7',
                            color: rs.status === 'DISBURSED' ? '#15803D' : '#B45309',
                            border: `1px solid ${rs.status === 'DISBURSED' ? '#BBF7D0' : '#FDE68A'}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {rs.status || 'PENDING'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {rs.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDisburseId(rs.id)}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                            }}
                          >
                            Disburse Funds
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Restaurant Wallet Payouts (Requested Disbursals)
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                Bank transfer disbursals requested via application wallets by restaurants.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {restPayoutDateFilter === 'ALL'
                ? `${restaurantPayouts.length} Requested Payouts`
                : `${filteredRestaurantPayouts.length} of ${restaurantPayouts.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <PaymentTabDateFilterBar
            idPrefix="rest-payouts"
            filter={restPayoutDateFilter}
            onFilterChange={setRestPayoutDateFilter}
            customStartDate={restPayoutCustomStartDate}
            onStartDateChange={setRestPayoutCustomStartDate}
            customEndDate={restPayoutCustomEndDate}
            onEndDateChange={setRestPayoutCustomEndDate}
            onReset={handleResetRestPayoutFilter}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={filteredRestaurantPayouts.length > 0 && selectedRestPayouts.size === filteredRestaurantPayouts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRestPayouts(new Set(filteredRestaurantPayouts.map((p: PayoutRecord) => p.id)));
                        } else {
                          setSelectedRestPayouts(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Payout ID</th>
                  <th style={{ padding: '12px 16px' }}>Restaurant Account Name</th>
                  <th style={{ padding: '12px 16px' }}>Wallet Account</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Bank & Account Details</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Requested Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {restPayoutsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading restaurant payouts...</td>
                  </tr>
                ) : restaurantPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No restaurant payout records.</td>
                  </tr>
                ) : filteredRestaurantPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No restaurant payout records found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all payout requests.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetRestPayoutFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Records
                      </button>
                    </td>
                  </tr>
                ) : (
                  [...filteredRestaurantPayouts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p: PayoutRecord) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
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
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                        {p.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                        {p.ownerName || p.accountHolderName || 'Partner Store'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                        {p.walletAccountId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(p.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151' }}>
                        {p.bankName || 'Bank'} • {p.accountNumber ? `•• ${p.accountNumber.slice(-4)}` : '••••'} ({p.ifscCode || 'IFSC'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: p.status === 'COMPLETED' ? '#DCFCE7' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#FEE2E2' : '#FEF3C7',
                            color: p.status === 'COMPLETED' ? '#15803D' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#B91C1C' : '#B45309',
                            border: `1px solid ${p.status === 'COMPLETED' ? '#BBF7D0' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#FECACA' : '#FDE68A'}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {p.status || 'REQUESTED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
                        {p.createdAt ? String(p.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {(p.status === 'REQUESTED' || p.status === 'FAILED') ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              disabled={isApproving || isRejecting}
                              onClick={() => handleApproveSinglePayout(p.id, 'RESTAURANT')}
                              style={{
                                padding: '6px 12px',
                                background: (isApproving || isRejecting) ? '#94A3B8' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: (isApproving || isRejecting) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                              }}
                            >
                              Approve
                            </button>
                            {p.status === 'REQUESTED' && (
                              <button
                                type="button"
                                disabled={isApproving || isRejecting}
                                onClick={() => handleRejectSinglePayout(p.id, 'RESTAURANT')}
                                style={{
                                  padding: '6px 12px',
                                  background: (isApproving || isRejecting) ? '#F3F4F6' : '#FEF2F2',
                                  color: (isApproving || isRejecting) ? '#9CA3AF' : '#EF4444',
                                  border: `1px solid ${(isApproving || isRejecting) ? '#E5E7EB' : '#FECACA'}`,
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: (isApproving || isRejecting) ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 1px 2px rgba(239, 68, 68, 0.1)',
                                }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedRestPayouts.size > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApproveRestPayouts}
                  disabled={isApproving}
                  style={{
                    padding: '8px 16px',
                    background: isApproving ? '#94A3B8' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: isApproving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
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
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text as="h2" variant="heading3" color="#111827" style={{ margin: 0, fontWeight: 700 }}>
                Partner Wallet Payouts (Requested Disbursals)
              </Text>
              <Text as="p" variant="caption" color="#6B7280" style={{ margin: '2px 0 0' }}>
                Bank transfer disbursals requested via application wallets by restaurants or delivery partners.
              </Text>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 20 }}>
              {delivPayoutDateFilter === 'ALL'
                ? `${deliveryPayouts.length} Requested Payouts`
                : `${filteredDeliveryPayouts.length} of ${deliveryPayouts.length} Filtered`}
            </span>
          </div>

          {/* Date Filter Bar */}
          <PaymentTabDateFilterBar
            idPrefix="deliv-payouts"
            filter={delivPayoutDateFilter}
            onFilterChange={setDelivPayoutDateFilter}
            customStartDate={delivPayoutCustomStartDate}
            onStartDateChange={setDelivPayoutCustomStartDate}
            customEndDate={delivPayoutCustomEndDate}
            onEndDateChange={setDelivPayoutCustomEndDate}
            onReset={handleResetDelivPayoutFilter}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={filteredDeliveryPayouts.length > 0 && selectedDelivPayouts.size === filteredDeliveryPayouts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDelivPayouts(new Set(filteredDeliveryPayouts.map(p => p.id)));
                        } else {
                          setSelectedDelivPayouts(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Payout ID</th>
                  <th style={{ padding: '12px 16px' }}>Delivery Partner Name</th>
                  <th style={{ padding: '12px 16px' }}>Wallet Account</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Bank & Account Details</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Requested Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {delivPayoutsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Loading driver payouts...</td>
                  </tr>
                ) : deliveryPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>No delivery partner payout records.</td>
                  </tr>
                ) : filteredDeliveryPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px 24px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        No delivery partner payout records found for the selected date range.
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                        Try adjusting your date range or clear the filter to see all driver payout requests.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetDelivPayoutFilter}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#2196F3',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                        }}
                      >
                        Reset to All Records
                      </button>
                    </td>
                  </tr>
                ) : (
                  [...filteredDeliveryPayouts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p: PayoutRecord) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
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
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                        {p.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                        {p.ownerName || p.accountHolderName || 'Delivery Partner'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                        {p.walletAccountId || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        ₹{(p.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151' }}>
                        {p.bankName || 'Bank'} • {p.accountNumber ? `•• ${p.accountNumber.slice(-4)}` : '••••'} ({p.ifscCode || 'IFSC'})
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: p.status === 'COMPLETED' ? '#DCFCE7' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#FEE2E2' : '#FEF3C7',
                            color: p.status === 'COMPLETED' ? '#15803D' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#B91C1C' : '#B45309',
                            border: `1px solid ${p.status === 'COMPLETED' ? '#BBF7D0' : (p.status === 'FAILED' || p.status === 'REJECTED') ? '#FECACA' : '#FDE68A'}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {p.status || 'REQUESTED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
                        {p.createdAt ? String(p.createdAt).replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {(p.status === 'REQUESTED' || p.status === 'FAILED') ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              disabled={isApproving || isRejecting}
                              onClick={() => handleApproveSinglePayout(p.id, 'DELIVERY')}
                              style={{
                                padding: '6px 12px',
                                background: (isApproving || isRejecting) ? '#94A3B8' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: (isApproving || isRejecting) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                              }}
                            >
                              Approve
                            </button>
                            {p.status === 'REQUESTED' && (
                              <button
                                type="button"
                                disabled={isApproving || isRejecting}
                                onClick={() => handleRejectSinglePayout(p.id, 'DELIVERY')}
                                style={{
                                  padding: '6px 12px',
                                  background: (isApproving || isRejecting) ? '#F3F4F6' : '#FEF2F2',
                                  color: (isApproving || isRejecting) ? '#9CA3AF' : '#EF4444',
                                  border: `1px solid ${(isApproving || isRejecting) ? '#E5E7EB' : '#FECACA'}`,
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: (isApproving || isRejecting) ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 1px 2px rgba(239, 68, 68, 0.1)',
                                }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedDelivPayouts.size > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApproveDelivPayouts}
                  disabled={isApproving}
                  style={{
                    padding: '8px 16px',
                    background: isApproving ? '#94A3B8' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: isApproving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
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
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: 24,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                  Foodie Admin Net Platform Revenue Breakdown
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                  Real-time platform revenue breakdown across all processed order settlements.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 20 }}>
                  Total Platform Earnings: ₹{totalAdminEarningsRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Date Filter Toolbar */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', marginBottom: 20 }}>
              <PaymentTabDateFilterBar
                idPrefix="earnings"
                filter={earningsDateFilter}
                onFilterChange={handleEarningsPresetChange}
                customStartDate={earningsDraftStartDate}
                onStartDateChange={(val) => {
                  setEarningsDraftStartDate(val);
                  setEarningsRangeError(null);
                }}
                customEndDate={earningsDraftEndDate}
                onEndDateChange={(val) => {
                  setEarningsDraftEndDate(val);
                  setEarningsRangeError(null);
                }}
                onReset={handleResetEarningsFilter}
                options={EARNINGS_AND_REFUNDS_DATE_OPTIONS}
                onApply={handleApplyEarningsCustomDates}
                rangeError={earningsRangeError}
                resetButtonLabel="Reset"
                applyButtonLabel="Apply Filter"
                containerStyle={{ borderBottom: 'none' }}
              />
            </div>

            {/* Period Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, fontSize: 12, color: '#6B7280' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Active Period:</span>{' '}
                <span style={{ color: '#111827', fontWeight: 700 }}>
                  {earningsDateFilter === 'TODAY' && 'Today'}
                  {earningsDateFilter === 'THIS_WEEK' && 'This Week (Monday to Present)'}
                  {earningsDateFilter === 'THIS_MONTH' && 'This Month (Month-to-Date)'}
                  {earningsDateFilter === 'THIS_YEAR' && 'This Year (Year-to-Date)'}
                  {earningsDateFilter === 'CUSTOM' && (earningsAppliedStartDate || earningsAppliedEndDate ? `${earningsAppliedStartDate || 'Any'} to ${earningsAppliedEndDate || 'Present'}` : 'Custom Date Range')}
                  {earningsDateFilter === 'ALL' && 'All Records (Lifetime Total)'}
                </span>
                {' • '}
                <span>{eligibleEarningsSettlements.length} eligible settled orders</span>
              </div>
              {settlementsLoading && (
                <span style={{ color: '#2196F3', fontWeight: 600 }}>Refreshing earnings data...</span>
              )}
            </div>

            {/* Revenue Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>14% Food Item Commission</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '8px 0' }}>
                  ₹{totalFoodCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>14% retained on total food subtotal</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>10% Delivery Fee Commission</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '8px 0' }}>
                  ₹{totalDeliveryCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>10% retained on total delivery fee</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Fixed Platform Service Fees</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '8px 0' }}>
                  ₹{totalPlatformFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>₹{commissionConfig.platformFixedFee} fixed per order retained 100%</div>
              </div>
            </div>

            {/* Empty State when 0 eligible settlements in filter */}
            {!settlementsLoading && eligibleEarningsSettlements.length === 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: 32,
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 16,
                  border: '1px dashed #E5E7EB',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  No earnings recorded for the selected date range.
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
                  Displaying ₹0.00 for all commission categories. Try adjusting your timeframe filter or reset to default.
                </div>
                <button
                  type="button"
                  onClick={handleResetEarningsFilter}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: '#E3F2FD',
                    color: '#2196F3',
                    border: '1px solid #BFDBFE',
                    cursor: 'pointer',
                  }}
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: COMMISSION RULES */}
      {activeTab === 'COMMISSION_RULES' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            padding: 28,
            maxWidth: 600,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Platform Commission & Fee Configuration
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 20px' }}>
            Modify active backend commission rates for real-time order distribution calculations.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Restaurant Food Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configRestRate}
                onChange={(e) => setConfigRestRate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Deducted from restaurant food subtotal (Default: 14%)</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Delivery Partner Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configDelivRate}
                onChange={(e) => setConfigDelivRate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Deducted from driver delivery payout (Default: 10%)</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Fixed Platform Service Fee (₹ per order)
              </label>
              <input
                type="number"
                min="0"
                value={configPlatformFee}
                onChange={(e) => setConfigPlatformFee(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Retained 100% by Foodie Admin per order (Default: ₹40)</span>
            </div>

            <button
              type="submit"
              disabled={isSavingRules}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.25)',
              }}
            >
              {isSavingRules ? 'Saving to Database...' : 'Save & Publish Commission Rules'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: REFUNDS & REVERSALS */}
      {activeTab === 'REFUNDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400 }}>
          {/* Top KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {/* Card 1: Pending Approvals */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cancellation Approvals
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  {pendingCancelledRefunds.length} Pending
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>
                ₹{pendingCancelledRefunds.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Total online payment refund amount awaiting Finance Admin approval for the selected period.
              </div>
            </div>

            {/* Card 2: Online Payment Capture */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Captured Online Payments
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: '#E3F2FD',
                    color: '#2196F3',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  UPI • Cards • Netbanking
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
                Cashfree Payment Gateway
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Online payments are processed via Cashfree. Gateway refund is initiated directly via Cashfree once approved.
              </div>
            </div>

            {/* Card 3: Disbursed Refunds */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Processed & Disbursed
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  {processedCancelledRefunds.length} Settled
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#22C55E' }}>
                ₹{processedCancelledRefunds.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Credited directly back to customer bank accounts / UPI IDs / Wallets.
              </div>
            </div>

            {/* Card 4: Live Backend Database Sync */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Backend Sync
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                  PostgreSQL & Gateway Active
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.35 }}>
                  Real-time cancellation approval queue connected directly to live backend orders & settlements database.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#15803D' }}>Live Backend Database Synchronized</span>
              </div>
            </div>
          </div>

          {/* Section 1: Customer Cancelled Orders — Online Payment Refund Approvals Queue */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: 24,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Header & Controls */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                    Customer Cancelled Orders — Online Payment Refund Approvals
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      padding: '3px 10px',
                      borderRadius: 9999,
                    }}
                  >
                    {pendingCancelledRefunds.length} Action Required
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '6px 0 0', maxWidth: 840, lineHeight: 1.45 }}>
                  When a customer cancels an order paid via <strong>Online Payments (Cashfree PG - UPI, Cards, Netbanking)</strong>,
                  funds were already debited from their account. Review the Customer Name, Customer ID, Order ID, and Amount below to authorize instant refund disbursal back to their original payment instrument via Cashfree.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void refetchCancelledRefunds()}
                  disabled={cancelledRefundsLoading}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Refresh approval list"
                >
                  <span style={{ display: 'inline-block', transform: cancelledRefundsLoading ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                    ↻
                  </span>
                  Refresh List
                </button>
              </div>
            </div>

            {/* Date Filter Toolbar */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              <PaymentTabDateFilterBar
                idPrefix="refunds"
                filter={refundsDateFilter}
                onFilterChange={handleRefundsPresetChange}
                customStartDate={refundsDraftStartDate}
                onStartDateChange={(val) => {
                  setRefundsDraftStartDate(val);
                  setRefundsRangeError(null);
                }}
                customEndDate={refundsDraftEndDate}
                onEndDateChange={(val) => {
                  setRefundsDraftEndDate(val);
                  setRefundsRangeError(null);
                }}
                onReset={handleResetRefundsFilter}
                options={EARNINGS_AND_REFUNDS_DATE_OPTIONS}
                onApply={handleApplyRefundsCustomDates}
                rangeError={refundsRangeError}
                resetButtonLabel="Reset"
                applyButtonLabel="Apply Filter"
                containerStyle={{ borderBottom: 'none' }}
              />
            </div>

            {/* Active Date Period Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Filtering by Refund Initiation Date:</span>{' '}
                <span style={{ color: '#111827', fontWeight: 700 }}>
                  {refundsDateFilter === 'TODAY' && 'Today'}
                  {refundsDateFilter === 'THIS_WEEK' && 'This Week'}
                  {refundsDateFilter === 'THIS_MONTH' && 'This Month'}
                  {refundsDateFilter === 'THIS_YEAR' && 'This Year'}
                  {refundsDateFilter === 'CUSTOM' && (refundsAppliedStartDate || refundsAppliedEndDate ? `${refundsAppliedStartDate || 'Any'} to ${refundsAppliedEndDate || 'Present'}` : 'Custom Date Range')}
                  {refundsDateFilter === 'ALL' && 'All Records'}
                </span>
                {' • '}
                <span>{dateFilteredRefunds.length} total refunds in period</span>
              </div>
              {cancelledRefundsLoading && (
                <span style={{ color: '#2196F3', fontWeight: 600 }}>Refreshing refund queue...</span>
              )}
            </div>

            {/* Filter Tabs & Search Bar & Sort Dropdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                paddingBottom: 16,
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              {/* Status Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Status:</span>
                {[
                  { key: 'PENDING', label: `Pending Approvals (${pendingCancelledRefunds.length})` },
                  { key: 'ALL', label: `All Online Cancellations (${dateFilteredRefunds.length})` },
                  { key: 'PROCESSED', label: `Processed / Refunded (${processedCancelledRefunds.length})` },
                ].map((f) => {
                  const isActive = refundStatusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setRefundStatusFilter(f.key as any);
                        setRefundCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isActive ? '1px solid #2196F3' : '1px solid #E5E7EB',
                        backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                        color: isActive ? '#2196F3' : '#6B7280',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar & Sort Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="refund-sort-select" style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                    Sort:
                  </label>
                  <select
                    id="refund-sort-select"
                    value={refundSortBy}
                    onChange={(e) => {
                      setRefundSortBy(e.target.value as any);
                      setRefundCurrentPage(1);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                    }}
                  >
                    <option value="DATE_DESC">Newest Initiated</option>
                    <option value="DATE_ASC">Oldest Initiated</option>
                    <option value="AMOUNT_DESC">Highest Amount</option>
                    <option value="AMOUNT_ASC">Lowest Amount</option>
                  </select>
                </div>

                <div style={{ position: 'relative', width: 280 }}>
                  <input
                    type="text"
                    placeholder="Filter by Customer, ID, Order #..."
                    value={refundSearchTerm}
                    onChange={(e) => {
                      setRefundSearchTerm(e.target.value);
                      setRefundCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: 10,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#F9FAFB',
                    }}
                  />
                  <svg
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', width: 14, height: 14 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M16 16l4.5 4.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Approval Requests List */}
            {cancelledRefundsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14, fontWeight: 500 }}>
                Fetching customer cancellation refund requests from payment backend...
              </div>
            ) : filteredRefundList.length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 16,
                  border: '1px dashed #E5E7EB',
                }}
              >
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5" />
                  </svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  No customer cancellation requests match this filter
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 16px' }}>
                  No online payment refunds found for the selected status and date range.
                </p>
                <button
                  type="button"
                  onClick={handleResetRefundsFilter}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: '#E3F2FD',
                    color: '#2196F3',
                    border: '1px solid #BFDBFE',
                    cursor: 'pointer',
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {paginatedRefundList.map((req) => {
                  const isPending = req.status === 'PENDING_APPROVAL';
                  const isApproved = req.status === 'APPROVED' || req.status === 'REFUNDED';
                  const isRejected = req.status === 'REJECTED';
                  const isActioning = processingRefundId === req.id;

                  const matchedSettlement = serverSettlements.find(
                    (s) => s.orderId === req.orderId || s.orderNumber === req.orderId
                  );
                  const restaurantName = (req as any).restaurantName || matchedSettlement?.restaurantName || 'Restaurant Partner';

                  return (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        border: isPending ? '1px solid #2196F3' : '1px solid #E5E7EB',
                        padding: '20px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        boxShadow: isPending ? '0 4px 12px rgba(33, 150, 243, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Top Meta Line: Badges & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {/* Specifically Online Payment Badge */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 6,
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              letterSpacing: '0.4px',
                            }}
                          >
                            <span>{req.paymentMethod}</span>
                          </span>

                          {/* Gateway Provider */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                            }}
                          >
                            {req.gatewayProvider} DIRECT REVERSAL
                          </span>

                          {/* Order ID Pill */}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#374151',
                              backgroundColor: '#F3F4F6',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontFamily: 'monospace',
                            }}
                          >
                            ORDER: {req.orderId}
                          </span>

                          {/* Restaurant Name Pill */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#4B5563',
                              backgroundColor: '#F3F4F6',
                              padding: '3px 8px',
                              borderRadius: 6,
                            }}
                          >
                            Store: {restaurantName}
                          </span>
                        </div>

                        {/* Approval Status */}
                        <div>
                          {isPending && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '5px 12px',
                                borderRadius: 9999,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                              AWAITING REFUND APPROVAL
                            </span>
                          )}
                          {isApproved && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '5px 12px',
                                borderRadius: 9999,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                              }}
                            >
                              APPROVED & REFUNDED
                            </span>
                          )}
                          {isRejected && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '5px 12px',
                                borderRadius: 9999,
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                              }}
                            >
                              REJECTED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 16,
                          padding: '14px 16px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: 12,
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        {/* Col 1: Customer Details */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                            Customer Information
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                backgroundColor: '#E3F2FD',
                                color: '#2196F3',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {req.customerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                                {req.customerName}
                              </div>
                              <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>
                                ID: {req.customerId}
                              </div>
                            </div>
                          </div>
                          {req.customerPhone && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                              Phone: {req.customerPhone}
                            </div>
                          )}
                        </div>

                        {/* Col 2: Refund Amount */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                            Online Refund Amount
                          </span>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                            ₹{req.amount.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>
                            Full Online Payment Value
                          </div>
                        </div>

                        {/* Col 3: Gateway & Payment Identifiers */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                            Payment Identifiers
                          </span>
                          <div style={{ fontSize: 11, color: '#111827', marginTop: 4, fontFamily: 'monospace' }}>
                            <strong>UUID:</strong> {req.paymentUuid.slice(0, 14)}...
                          </div>
                          {req.gatewayTransactionId && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, fontFamily: 'monospace' }}>
                              <strong>Tx Ref:</strong> {req.gatewayTransactionId}
                            </div>
                          )}
                          {req.refundReference && (
                            <div style={{ fontSize: 11, color: '#15803D', fontWeight: 600, marginTop: 2 }}>
                              <strong>Refund Ref:</strong> {req.refundReference}
                            </div>
                          )}
                        </div>

                        {/* Col 4: Cancellation Reason & Time */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                            Cancellation Reason
                          </span>
                          <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginTop: 3, lineHeight: 1.35 }}>
                            &ldquo;{req.cancellationReason}&rdquo;
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                            Initiated {new Date(req.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(req.cancelledAt).toLocaleDateString()}
                          </div>
                          {req.reviewedAt && (
                            <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>
                              Completed {new Date(req.reviewedAt).toLocaleDateString()} by {req.reviewedBy || 'Finance Admin'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {isPending
                            ? 'Approving will trigger the backend Cashfree refund gateway reversal and update customer ledger.'
                            : `Processed by ${req.reviewedBy || 'Finance Admin'}.`}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isPending && (
                            <>
                              {/* Reject Button */}
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => void handleRejectRefundRequest(req)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: 10,
                                  border: '1px solid #FECACA',
                                  backgroundColor: '#FEF2F2',
                                  color: '#EF4444',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>

                              {/* Approve & Refund Button */}
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => void handleApproveRefundRequest(req)}
                                style={{
                                  padding: '8px 18px',
                                  borderRadius: 10,
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                  color: '#FFFFFF',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                {isActioning ? (
                                  <span>Processing Refund via Cashfree...</span>
                                ) : (
                                  <span>Approve & Disburse Refund via Cashfree (₹{req.amount.toFixed(2)})</span>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalRefundPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 16,
                      borderTop: '1px solid #E5E7EB',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#6B7280' }}>
                      Showing {(refundCurrentPage - 1) * refundItemsPerPage + 1} to{' '}
                      {Math.min(refundCurrentPage * refundItemsPerPage, filteredRefundList.length)} of{' '}
                      {filteredRefundList.length} records
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        disabled={refundCurrentPage <= 1}
                        onClick={() => setRefundCurrentPage((p) => Math.max(1, p - 1))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #E5E7EB',
                          backgroundColor: refundCurrentPage <= 1 ? '#F9FAFB' : '#FFFFFF',
                          color: refundCurrentPage <= 1 ? '#9CA3AF' : '#374151',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: refundCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalRefundPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setRefundCurrentPage(pg)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: refundCurrentPage === pg ? '1px solid #2196F3' : '1px solid #E5E7EB',
                            backgroundColor: refundCurrentPage === pg ? '#E3F2FD' : '#FFFFFF',
                            color: refundCurrentPage === pg ? '#2196F3' : '#374151',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={refundCurrentPage >= totalRefundPages}
                        onClick={() => setRefundCurrentPage((p) => Math.min(totalRefundPages, p + 1))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #E5E7EB',
                          backgroundColor: refundCurrentPage >= totalRefundPages ? '#F9FAFB' : '#FFFFFF',
                          color: refundCurrentPage >= totalRefundPages ? '#9CA3AF' : '#374151',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: refundCurrentPage >= totalRefundPages ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISBURSE MODAL */}
      {selectedDisburseId ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
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
              padding: 28,
              maxWidth: 440,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              Disburse Restaurant Settlement
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
              Enter the bank transaction reference number for settlement ID: <strong style={{ fontFamily: 'monospace' }}>{selectedDisburseId}</strong>.
            </p>

            <form onSubmit={handleDisburseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Bank Reference Number / UTR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR129048102938"
                  value={disburseTxRef}
                  onChange={(e) => setDisburseTxRef(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDisburseId(null)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisbursing}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
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
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
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
              padding: 28,
              maxWidth: 460,
              width: '100%',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Configure Commission & Fee Rules
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', fontWeight: 600 }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
              Adjust global platform commission rates applied to incoming customer bill payments.
            </p>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Restaurant Food Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configRestRate}
                onChange={(e) => setConfigRestRate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Deducted from restaurant food item subtotal</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Delivery Partner Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={configDelivRate}
                onChange={(e) => setConfigDelivRate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Deducted from order delivery fee payout</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Platform Fixed Service Fee (₹ per order)
              </label>
              <input
                type="number"
                min="0"
                value={configPlatformFee}
                onChange={(e) => setConfigPlatformFee(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Retained 100% by Admin per transaction</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSaveConfig(e)}
                disabled={isSavingRules}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
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
