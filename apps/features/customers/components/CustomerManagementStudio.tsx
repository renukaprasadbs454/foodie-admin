'use client';

import React, { useEffect, useState } from 'react';
import type { CustomerProfile, SupportTicket, AccountStatus, TicketStatus } from '../types/customerTypes';
import { calculateCustomerLtvBadge } from '../types/customerTypes';
import {
  useGetCustomersQuery,
  useUpdateCustomerStatusMutation,
  useGetSupportTicketsQuery,
  useUpdateTicketStatusMutation,
} from '@/api/endpoints/customersApi';
import { useGetAdminOrdersQuery } from '@/api/endpoints/ordersApi';
import type { OrderItemRecord } from '@/features/orders/types';
import {
  useGetCommissionRulesQuery,
  useUpdateCommissionRulesMutation,
} from '@/api/endpoints/paymentsApi';
import {
  useGetDeliveryChargesQuery,
  useUpdateDeliveryChargesMutation,
} from '@/api/endpoints/locationApi';
import { formatMoneyInr } from '../../analytics/types';

export function CustomerManagementStudio() {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'TICKETS'>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [selectedCustomerForBlock, setSelectedCustomerForBlock] = useState<CustomerProfile | null>(null);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<CustomerProfile | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Platform Fee Integration
  const { data: commissionRules, isLoading: isLoadingCommission } = useGetCommissionRulesQuery();
  const [updateCommissionRules, { isLoading: isUpdatingPlatformFee }] = useUpdateCommissionRulesMutation();
  const [isPlatformFeeModalOpen, setIsPlatformFeeModalOpen] = useState(false);
  const [platformFeeInput, setPlatformFeeInput] = useState<string>('');
  const [platformFeeError, setPlatformFeeError] = useState<string | null>(null);

  // Delivery Fee (Distance-Based) Integration
  const { data: deliveryCharges, isLoading: isLoadingDeliveryCharges } = useGetDeliveryChargesQuery();
  const [updateDeliveryCharges, { isLoading: isUpdatingDeliveryFee }] = useUpdateDeliveryChargesMutation();
  const [isDeliveryFeeModalOpen, setIsDeliveryFeeModalOpen] = useState(false);
  const [baseChargeInput, setBaseChargeInput] = useState<string>('');
  const [baseDistanceKmInput, setBaseDistanceKmInput] = useState<string>('');
  const [additionalChargePerKmInput, setAdditionalChargePerKmInput] = useState<string>('');
  const [deliveryFeeError, setDeliveryFeeError] = useState<string | null>(null);
  const [testSimKm, setTestSimKm] = useState<number>(5);

  const handleOpenPlatformFeeModal = () => {
    const currentFee = commissionRules?.platformFixedFee ?? 40;
    setPlatformFeeInput(String(currentFee));
    setPlatformFeeError(null);
    setIsPlatformFeeModalOpen(true);
  };

  const handleSavePlatformFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(platformFeeInput);
    if (platformFeeInput.trim() === '' || isNaN(val) || val < 0) {
      setPlatformFeeError('Please enter a valid, non-negative platform fee amount (₹).');
      return;
    }

    try {
      await updateCommissionRules({
        restaurantCommissionRate: commissionRules?.restaurantCommissionRate ?? 15,
        deliveryCommissionRate: commissionRules?.deliveryCommissionRate ?? 10,
        platformFixedFee: val,
      }).unwrap();

      setToastMsg(`Platform fee successfully updated to ₹${val.toFixed(2)}.`);
      setTimeout(() => setToastMsg(null), 3500);
      setIsPlatformFeeModalOpen(false);
    } catch (err: any) {
      setPlatformFeeError(err?.data?.message || err?.message || 'Failed to update platform fee on server.');
    }
  };

  const handleOpenDeliveryFeeModal = () => {
    setBaseChargeInput(String(deliveryCharges?.baseCharge ?? 35));
    setBaseDistanceKmInput(String(deliveryCharges?.baseDistanceKm ?? 3));
    setAdditionalChargePerKmInput(String(deliveryCharges?.additionalChargePerKm ?? 10));
    setDeliveryFeeError(null);
    setIsDeliveryFeeModalOpen(true);
  };

  const handleSaveDeliveryFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseFee = Number(baseChargeInput);
    const baseDist = Number(baseDistanceKmInput);
    const addFee = Number(additionalChargePerKmInput);

    if (baseChargeInput.trim() === '' || isNaN(baseFee) || baseFee < 0) {
      setDeliveryFeeError('Base delivery fee must be a valid, non-negative number (₹).');
      return;
    }
    if (baseDistanceKmInput.trim() === '' || isNaN(baseDist) || baseDist <= 0) {
      setDeliveryFeeError('Base distance coverage must be greater than 0 KM.');
      return;
    }
    if (additionalChargePerKmInput.trim() === '' || isNaN(addFee) || addFee < 0) {
      setDeliveryFeeError('Additional charge per KM must be a valid, non-negative number (₹).');
      return;
    }

    try {
      await updateDeliveryCharges({
        baseCharge: baseFee,
        baseDistanceKm: baseDist,
        additionalChargePerKm: addFee,
        freeDeliveryMinOrder: deliveryCharges?.freeDeliveryMinOrder ?? 499,
        nightSurcharge: deliveryCharges?.nightSurcharge ?? 25,
        surgeMultiplier: deliveryCharges?.surgeMultiplier ?? 1.15,
      }).unwrap();

      setToastMsg(
        `Delivery fee structure saved: ₹${baseFee.toFixed(2)} for first ${baseDist} km, +₹${addFee.toFixed(2)}/km thereafter.`
      );
      setTimeout(() => setToastMsg(null), 3500);
      setIsDeliveryFeeModalOpen(false);
    } catch (err: any) {
      setDeliveryFeeError(err?.data?.message || err?.message || 'Failed to update delivery fee on server.');
    }
  };

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // RTK Query Hooks - Fetches live database records and real customer orders
  const {
    data: customerData,
    isLoading: isLoadingCustomers,
    isFetching: isFetchingCustomers,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useGetCustomersQuery();

  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useGetAdminOrdersQuery();

  const {
    data: ticketsData,
    isLoading: isLoadingTickets,
    isFetching: isFetchingTickets,
    isError: isTicketsError,
    refetch: refetchTickets,
  } = useGetSupportTicketsQuery();

  const [updateCustomerStatus, { isLoading: isUpdatingStatus }] = useUpdateCustomerStatusMutation();
  const [updateTicketStatus, { isLoading: isUpdatingTicket }] = useUpdateTicketStatusMutation();

  const handleRefreshLive = async () => {
    setIsManualRefreshing(true);
    try {
      const [custResult, ordResult, tckResult] = await Promise.all([
        refetchCustomers(),
        refetchOrders(),
        refetchTickets(),
      ]);

      if (custResult.isError || ordResult.isError) {
        setToastMsg('Failed to refresh data: Backend request encountered an error.');
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setToastMsg('Customer records and orders successfully refreshed from backend.');
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch {
      setToastMsg('Failed to refresh live customer data.');
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isFetchingAny = isManualRefreshing || isFetchingCustomers || isFetchingOrders || isFetchingTickets;

  // Helper to normalize phone numbers (strips spaces, hyphens, parentheses)
  const normalizePhone = (p?: string | null) => (p ? p.replace(/[\s\-()]/g, '') : '');

  // Live Combined Customer & Order Records
  const { allEnrichedCustomers, liveSummary } = React.useMemo(() => {
    const rawCustomers: CustomerProfile[] = Array.isArray(customerData?.customers)
      ? customerData.customers
      : Array.isArray(customerData)
      ? (customerData as CustomerProfile[])
      : Array.isArray((customerData as any)?.data?.customers)
      ? (customerData as any).data.customers
      : Array.isArray((customerData as any)?.data)
      ? (customerData as any).data
      : [];

    const rawOrders: OrderItemRecord[] = Array.isArray(ordersData)
      ? ordersData
      : Array.isArray((ordersData as any)?.data)
      ? (ordersData as any).data
      : [];

    // Map orders by normalized phone and by customerName
    const ordersByPhone = new Map<string, OrderItemRecord[]>();
    const ordersByName = new Map<string, OrderItemRecord[]>();

    for (const ord of rawOrders) {
      const p = normalizePhone(ord.customerPhone);
      if (p) {
        if (!ordersByPhone.has(p)) ordersByPhone.set(p, []);
        ordersByPhone.get(p)!.push(ord);
      }
      const n = (ord.customerName || '').trim().toLowerCase();
      if (n) {
        if (!ordersByName.has(n)) ordersByName.set(n, []);
        ordersByName.get(n)!.push(ord);
      }
    }

    const matchedOrderIds = new Set<string>();
    let totalSpendSum = 0;

    // 1. Process all registered database customers
    const enrichedList: CustomerProfile[] = rawCustomers.map((cust) => {
      const p = normalizePhone(cust.phone);
      const n = (cust.name || '').trim().toLowerCase();

      // Correlate customer orders primarily by normalized phone, fallback to name
      const custOrders = (p && ordersByPhone.get(p)) || (n && ordersByName.get(n)) || [];

      // Mark matched order IDs
      for (const o of custOrders) {
        if (o.id) matchedOrderIds.add(o.id);
      }

      // Calculate total spend: sum of valid orders (excluding CANCELLED / REJECTED)
      const validOrders = custOrders.filter(
        (o) => !['CANCELLED', 'REJECTED', 'CANCELED'].includes(String(o.status).toUpperCase())
      );
      const totalSpend = validOrders.reduce(
        (acc, o) => acc + (typeof o.totalAmount === 'number' ? o.totalAmount : Number(o.totalAmount) || 0),
        0
      );
      totalSpendSum += totalSpend;

      // Determine latest order date
      let latestOrderDate = cust.lastOrderDate || cust.joinedDate;
      for (const o of custOrders) {
        if (o.createdAt) {
          const dt = o.createdAt.split('T')[0];
          if (!latestOrderDate || new Date(dt) > new Date(latestOrderDate)) {
            latestOrderDate = dt;
          }
        }
      }

      const ltvBadge = calculateCustomerLtvBadge(totalSpend);

      return {
        ...cust,
        totalOrders: custOrders.length,
        totalSpend,
        loyaltyTier: ltvBadge.tier as CustomerProfile['loyaltyTier'],
        lastOrderDate: latestOrderDate,
        orders: custOrders,
      };
    });

    // 2. Discover any additional customers from orders who may not be in registered customer list yet
    const registeredPhones = new Set(rawCustomers.map((c) => normalizePhone(c.phone)).filter(Boolean));
    const registeredNames = new Set(rawCustomers.map((c) => (c.name || '').trim().toLowerCase()).filter(Boolean));

    const extraOrdersByPhone = new Map<string, OrderItemRecord[]>();
    for (const ord of rawOrders) {
      if (ord.id && matchedOrderIds.has(ord.id)) continue;
      const p = normalizePhone(ord.customerPhone);
      if (p && !registeredPhones.has(p)) {
        if (!extraOrdersByPhone.has(p)) extraOrdersByPhone.set(p, []);
        extraOrdersByPhone.get(p)!.push(ord);
      } else if (!p) {
        const n = (ord.customerName || '').trim().toLowerCase();
        if (n && !registeredNames.has(n)) {
          if (!extraOrdersByPhone.has(n)) extraOrdersByPhone.set(n, []);
          extraOrdersByPhone.get(n)!.push(ord);
        }
      }
    }

    for (const [key, ords] of extraOrdersByPhone.entries()) {
      const firstOrd = ords[0];
      const validOrders = ords.filter(
        (o) => !['CANCELLED', 'REJECTED', 'CANCELED'].includes(String(o.status).toUpperCase())
      );
      const totalSpend = validOrders.reduce(
        (acc, o) => acc + (typeof o.totalAmount === 'number' ? o.totalAmount : Number(o.totalAmount) || 0),
        0
      );
      totalSpendSum += totalSpend;

      let latestOrderDate = firstOrd.createdAt ? firstOrd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      let earliestOrderDate = latestOrderDate;
      for (const o of ords) {
        const dt = o.createdAt ? o.createdAt.split('T')[0] : '';
        if (dt && (!latestOrderDate || new Date(dt) > new Date(latestOrderDate))) latestOrderDate = dt;
        if (dt && (!earliestOrderDate || new Date(dt) < new Date(earliestOrderDate))) earliestOrderDate = dt;
      }

      const ltvBadge = calculateCustomerLtvBadge(totalSpend);

      enrichedList.push({
        id: `ord-cust-${key}`,
        name: firstOrd.customerName || 'Ordering Customer',
        email: '—',
        phone: firstOrd.customerPhone || '—',
        totalOrders: ords.length,
        totalSpend,
        savedAddressesCount: 1,
        accountStatus: 'ACTIVE',
        joinedDate: earliestOrderDate,
        lastOrderDate: latestOrderDate,
        loyaltyTier: ltvBadge.tier as CustomerProfile['loyaltyTier'],
        orders: ords,
      });
    }

    const totalReg = enrichedList.length;
    const activeAcc = enrichedList.filter((c) => c.accountStatus === 'ACTIVE').length;
    const suspendedAcc = enrichedList.filter((c) => c.accountStatus === 'SUSPENDED').length;
    const avgLtv = totalReg > 0 ? totalSpendSum / totalReg : 0;

    return {
      allEnrichedCustomers: enrichedList,
      liveSummary: {
        totalRegistered: totalReg,
        activeAccounts: activeAcc,
        suspendedAccounts: suspendedAcc,
        averageCustomerLtv: avgLtv,
      },
    };
  }, [customerData, ordersData]);

  const customersList: CustomerProfile[] = allEnrichedCustomers.filter((cust: CustomerProfile) => {
    if (!cust) return false;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (cust.name && cust.name.toLowerCase().includes(q)) ||
      (cust.email && cust.email.toLowerCase().includes(q)) ||
      (cust.phone && cust.phone.includes(q)) ||
      (cust.id && cust.id.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || cust.accountStatus === statusFilter;
    return Boolean(matchesSearch && matchesStatus);
  });

  const ticketsList: SupportTicket[] = Array.isArray(ticketsData)
    ? ticketsData
    : Array.isArray((ticketsData as any)?.data)
    ? (ticketsData as any).data
    : [];

  const openTicketsCount =
    typeof customerData?.openTicketsCount === 'number'
      ? customerData.openTicketsCount
      : ticketsList.filter((t: SupportTicket) => t?.status === 'OPEN').length;

  const handleToggleAccountStatus = async (id: string, newStatus: AccountStatus) => {
    try {
      await updateCustomerStatus({
        id,
        accountStatus: newStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
        reason: blockReason,
      }).unwrap();

      setToastMsg(`Customer account ${id} updated to ${newStatus}`);
      setTimeout(() => setToastMsg(null), 3500);
      setSelectedCustomerForBlock(null);
      setBlockReason('');
      void refetchCustomers();
      void refetchOrders();
    } catch (err) {
      setToastMsg(`Failed to update customer status. Please try again.`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateTicketStatus({ id: ticketId, status: newStatus }).unwrap();
      setToastMsg(`Ticket ${ticketId} status updated to ${newStatus}`);
      setTimeout(() => setToastMsg(null), 3500);
      void refetchTickets();
    } catch (err) {
      setToastMsg(`Failed to update ticket status.`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Toast Alert */}
      {toastMsg ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>{toastMsg}</span>
          <span style={{ fontSize: 12, color: '#E0F2FE' }}>● Live Operations</span>
        </div>
      ) : null}

      {/* Responsive Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 280, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
              Customer Operations & Support Desk
            </h1>
            <button
              type="button"
              id="btn-refresh-customers"
              onClick={handleRefreshLive}
              disabled={isFetchingAny}
              title="Refresh live customer profiles and orders from backend"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: '#0284C7',
                fontSize: 12,
                fontWeight: 600,
                cursor: isFetchingAny ? 'not-allowed' : 'pointer',
                opacity: isFetchingAny ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'inline-block', animation: isFetchingAny ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              {isFetchingAny ? 'Refreshing...' : 'Refresh Live Data'}
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Manage customer profiles, account security controls, and customer dispute support tickets.
          </p>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F5F7FA',
            border: '1px solid #E5E7EB',
            padding: 4,
            borderRadius: 12,
            width: '100%',
            maxWidth: 420,
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('DIRECTORY')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 8,
              border: activeTab === 'DIRECTORY' ? '1px solid #E5E7EB' : 'none',
              fontSize: 13,
              fontWeight: activeTab === 'DIRECTORY' ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'DIRECTORY' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'DIRECTORY' ? '#2196F3' : '#6B7280',
              boxShadow: activeTab === 'DIRECTORY' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Customer Directory ({liveSummary.totalRegistered})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TICKETS')}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 8,
              border: activeTab === 'TICKETS' ? '1px solid #E5E7EB' : 'none',
              fontSize: 13,
              fontWeight: activeTab === 'TICKETS' ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'TICKETS' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'TICKETS' ? '#2196F3' : '#6B7280',
              boxShadow: activeTab === 'TICKETS' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Support Tickets ({openTicketsCount} Open)
          </button>
        </div>
      </div>

      {/* Top Executive Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Registered</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {(isLoadingCustomers || isLoadingOrders) && !customerData ? '...' : liveSummary.totalRegistered}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Real Database Users</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {(isLoadingCustomers || isLoadingOrders) && !customerData ? '...' : liveSummary.activeAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Verified & Unrestricted</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suspended Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {(isLoadingCustomers || isLoadingOrders) && !customerData ? '...' : liveSummary.suspendedAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Safety / Abuse Flagged</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Customer LTV</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {(isLoadingCustomers || isLoadingOrders) && !customerData ? '...' : formatMoneyInr(liveSummary.averageCustomerLtv)}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Lifetime value per customer</div>
        </div>
      </div>

      {/* TAB 1: CUSTOMER DIRECTORY */}
      {activeTab === 'DIRECTORY' ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          {/* Responsive Controls Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap', minWidth: 260 }}>
              <input
                type="text"
                id="customer-search-input"
                placeholder="Search by name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  flex: 1,
                  minWidth: 220,
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              />

              {/* Action Buttons immediately after customer search area */}
              <button
                type="button"
                id="btn-set-platform-fee"
                onClick={handleOpenPlatformFeeModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F5F7FA',
                  color: '#2196F3',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F7FA';
                }}
              >
                Platform Fee
              </button>

              <button
                type="button"
                id="btn-set-delivery-fee"
                onClick={handleOpenDeliveryFeeModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F5F7FA',
                  color: '#2196F3',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F7FA';
                }}
              >
                Delivery Fee
              </button>

              <select
                id="customer-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, minWidth: 160, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
              >
                <option value="ALL">Filter: All Statuses</option>
                <option value="ACTIVE">● Active Only</option>
                <option value="SUSPENDED">○ Suspended Only</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: '#0284C7', fontWeight: 600 }}>
              Showing {customersList.length} customers
            </div>
          </div>

          {/* Error State */}
          {(isCustomersError || isOrdersError) ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, color: '#0369A1', margin: '16px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isCustomersError ? 'Failed to load customer profiles from backend' : 'Failed to load customer order records from backend'}
              </div>
              <p style={{ fontSize: 13, margin: '4px 0 12px', color: '#0284C7' }}>
                Please check your network connection or backend server status.
              </p>
              <button
                type="button"
                onClick={() => {
                  void refetchCustomers();
                  void refetchOrders();
                }}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: '#FFFFFF', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' }}
              >
                Retry Fetch
              </button>
            </div>
          ) : ((isLoadingCustomers || isLoadingOrders) && !customerData) ? (
            /* Loading Skeleton */
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#0284C7', fontSize: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #BAE6FD', borderTopColor: '#0284C7', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              Fetching live customer profiles and order data from backend...
            </div>
          ) : customersList.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#0284C7', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <div style={{ fontWeight: 700, color: '#0369A1' }}>No customers found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search or filter criteria.</div>
            </div>
          ) : (
            /* Directory Table */
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px' }}>Customer</th>
                    <th style={{ padding: '14px 16px' }}>Contact</th>
                    <th style={{ padding: '14px 16px' }}>Total Orders</th>
                    <th style={{ padding: '14px 16px' }}>Total Spend</th>
                    <th style={{ padding: '14px 16px' }}>LTV Tier</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersList.map((cust) => {
                    const ltv = calculateCustomerLtvBadge(cust.totalSpend);

                    return (
                      <tr key={cust.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => setSelectedCustomerForDetails(cust)}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{cust.name}</div>
                              <div style={{ fontSize: 11, color: '#6B7280' }}>
                                {cust.id ? <span title={`Customer ID: ${cust.id}`}>ID: {cust.id.length > 12 ? `${cust.id.slice(0, 8)}...` : cust.id} • </span> : null}
                                Joined: {cust.joinedDate}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: '#111827', fontWeight: 500 }}>{cust.email}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{cust.phone}</div>
                        </td>

                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                          {cust.totalOrders} orders
                        </td>

                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                          {formatMoneyInr(cust.totalSpend)}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#E3F2FD',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                            }}
                          >
                            {cust.loyaltyTier || ltv.tier}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 20,
                              backgroundColor: cust.accountStatus === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                              color: cust.accountStatus === 'ACTIVE' ? '#15803D' : '#B91C1C',
                              border: `1px solid ${cust.accountStatus === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                            }}
                          >
                            {cust.accountStatus === 'ACTIVE' ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForDetails(cust)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                backgroundColor: '#F5F7FA',
                                color: '#2196F3',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForBlock(cust)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: cust.accountStatus === 'ACTIVE' ? '1px solid #FECACA' : 'none',
                                background: cust.accountStatus === 'ACTIVE' ? '#FEE2E2' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                                color: cust.accountStatus === 'ACTIVE' ? '#B91C1C' : '#FFFFFF',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: cust.accountStatus === 'ACTIVE' ? 'none' : '0 2px 6px rgba(33, 150, 243, 0.25)',
                              }}
                            >
                              {cust.accountStatus === 'ACTIVE' ? 'Suspend' : 'Re-activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: SUPPORT TICKETS DESK */
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
            Active Customer Support & Dispute Tickets
          </h3>

          {isTicketsError ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, color: '#6B7280', border: '1px solid #E5E7EB' }}>
              Failed to load support tickets. <button onClick={() => refetchTickets()} style={{ marginLeft: 8, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFF', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoadingTickets ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B7280' }}>Fetching support tickets...</div>
          ) : ticketsList.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B7280' }}>No active support tickets found.</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Ticket ID</th>
                    <th style={{ padding: '12px 14px' }}>Customer</th>
                    <th style={{ padding: '12px 14px' }}>Order</th>
                    <th style={{ padding: '12px 14px' }}>Category & Subject</th>
                    <th style={{ padding: '12px 14px' }}>Priority</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsList.map((tck) => (
                    <tr key={tck.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px', fontWeight: 600, color: '#2196F3' }}>{tck.ticketNumber || tck.id}</td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{tck.customerName}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{tck.customerEmail}</div>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 600, color: '#111827' }}>{tck.orderId}</td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#F3F4F6',
                            border: '1px solid #E5E7EB',
                            color: '#4B5563',
                            marginRight: 6,
                          }}
                        >
                          {tck.category}
                        </span>
                        <span style={{ fontWeight: 500, color: '#111827' }}>{tck.subject}</span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: tck.priority === 'HIGH' ? '#FEE2E2' : '#E3F2FD',
                            color: tck.priority === 'HIGH' ? '#B91C1C' : '#1D4ED8',
                            border: `1px solid ${tck.priority === 'HIGH' ? '#FECACA' : '#BFDBFE'}`,
                          }}
                        >
                          {tck.priority}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <select
                          value={tck.status}
                          disabled={isUpdatingTicket}
                          onChange={(e) => handleUpdateTicketStatus(tck.id, e.target.value as TicketStatus)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #E5E7EB',
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: '#FFFFFF',
                            color: '#111827',
                            outline: 'none',
                          }}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px', fontSize: 12, color: '#6B7280' }}>{tck.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Account Block / Suspension Modal */}
      {selectedCustomerForBlock ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedCustomerForBlock(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                {selectedCustomerForBlock.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Re-activate Account'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCustomerForBlock(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              You are updating account status for <strong style={{ color: '#111827' }}>{selectedCustomerForBlock.name}</strong> ({selectedCustomerForBlock.email}).
            </p>

            {selectedCustomerForBlock.accountStatus === 'ACTIVE' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 4 }}>
                  Suspension Reason (Audit Log)
                </label>
                <textarea
                  rows={3}
                  placeholder="State reason for security audit..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedCustomerForBlock(null)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', fontSize: 13, cursor: 'pointer', color: '#6B7280', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() =>
                  handleToggleAccountStatus(
                    selectedCustomerForBlock.id,
                    selectedCustomerForBlock.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                  )
                }
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedCustomerForBlock.accountStatus === 'ACTIVE' ? '#EF4444' : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: isUpdatingStatus ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {isUpdatingStatus ? 'Updating...' : `Confirm ${selectedCustomerForBlock.accountStatus === 'ACTIVE' ? 'Suspension' : 'Activation'}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Customer Details Modal */}
      {selectedCustomerForDetails ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedCustomerForDetails(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {selectedCustomerForDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {selectedCustomerForDetails.name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Customer ID: {selectedCustomerForDetails.id}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', padding: 16, borderRadius: 14, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EMAIL ADDRESS</span>
                <span style={{ fontWeight: 600, color: '#111827', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.email}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PHONE NUMBER</span>
                <span style={{ fontWeight: 600, color: '#111827', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.phone}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACCOUNT STATUS</span>
                <span style={{ fontWeight: 600, color: '#111827', marginTop: 2, display: 'block' }}>
                  {selectedCustomerForDetails.accountStatus}
                </span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>LTV TIER</span>
                <span style={{ fontWeight: 600, color: '#111827', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.loyaltyTier}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL ORDERS</span>
                <span style={{ fontWeight: 700, color: '#111827', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.totalOrders}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL SPEND</span>
                <span style={{ fontWeight: 700, color: '#111827', marginTop: 2, display: 'block' }}>{formatMoneyInr(selectedCustomerForDetails.totalSpend)}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>JOINED DATE</span>
                <span style={{ fontWeight: 500, color: '#4B5563', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.joinedDate}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SAVED ADDRESSES</span>
                <span style={{ fontWeight: 500, color: '#4B5563', marginTop: 2, display: 'block' }}>{selectedCustomerForDetails.savedAddressesCount || 1} addresses</span>
              </div>
            </div>

            {/* Live Associated Order History Section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  Associated Order History ({selectedCustomerForDetails.orders?.length || 0})
                </span>
                <span style={{ fontSize: 11, color: '#0284C7', fontWeight: 600 }}>
                  ● Real Backend Records
                </span>
              </div>

              {(!selectedCustomerForDetails.orders || selectedCustomerForDetails.orders.length === 0) ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, color: '#6B7280', fontSize: 12, border: '1px solid #E5E7EB' }}>
                  No orders placed yet by this customer.
                </div>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px 10px' }}>Order Code</th>
                        <th style={{ padding: '8px 10px' }}>Store / Restaurant</th>
                        <th style={{ padding: '8px 10px' }}>Amount</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomerForDetails.orders.map((ord: OrderItemRecord) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0284C7' }}>{ord.orderCode || ord.id.slice(0, 8)}</td>
                          <td style={{ padding: '8px 10px', color: '#111827' }}>{ord.storeName || 'Restaurant'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#111827' }}>{formatMoneyInr(ord.totalAmount)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: ord.status === 'DELIVERED' ? '#DCFCE7' : ord.status === 'CANCELED' ? '#FEE2E2' : '#EFF6FF',
                              color: ord.status === 'DELIVERED' ? '#15803D' : ord.status === 'CANCELED' ? '#B91C1C' : '#1D4ED8',
                            }}>
                              {ord.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#6B7280', fontSize: 11 }}>
                            {ord.createdAt ? ord.createdAt.split('T')[0] : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#111827' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* REQUIREMENT 2: Set Platform Fee Modal */}
      {isPlatformFeeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsPlatformFeeModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 26,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  ₹
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Set Platform Fee
                  </h3>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Customer Checkout Fixed Service Fee</div>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-platform-fee-modal"
                onClick={() => setIsPlatformFeeModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePlatformFee}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  New Platform Fee Amount (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6B7280',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    id="input-platform-fee"
                    min="0"
                    step="0.5"
                    value={platformFeeInput}
                    onChange={(e) => {
                      setPlatformFeeInput(e.target.value);
                      if (platformFeeError) setPlatformFeeError(null);
                    }}
                    placeholder="Enter fee amount (e.g. 40)"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 30px',
                      borderRadius: 10,
                      border: platformFeeError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>
                {platformFeeError && (
                  <div id="platform-fee-error" style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                    {platformFeeError}
                  </div>
                )}
                <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
                  Universal fixed service fee applied on customer checkout orders.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  id="btn-cancel-platform-fee"
                  onClick={() => setIsPlatformFeeModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#4B5563',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-platform-fee"
                  disabled={isUpdatingPlatformFee}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isUpdatingPlatformFee ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingPlatformFee ? 0.7 : 1,
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                  }}
                >
                  {isUpdatingPlatformFee ? 'Saving...' : 'Save Platform Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUIREMENT 3: Set Delivery Fee (Based on KM) Modal */}
      {isDeliveryFeeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsDeliveryFeeModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 26,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E5E7EB',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Set Delivery Fee (Based on KM)
                  </h3>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    Distance Slabs & Per-Kilometer Delivery Charge Matrix
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-delivery-fee-modal"
                onClick={() => setIsDeliveryFeeModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Current Configuration Summary */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Base Delivery Fee
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {isLoadingDeliveryCharges ? '...' : `₹${Number(deliveryCharges?.baseCharge ?? 35).toFixed(2)}`}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Base Distance
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {isLoadingDeliveryCharges ? '...' : `${deliveryCharges?.baseDistanceKm ?? 3} km`}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Extra Fee / KM
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {isLoadingDeliveryCharges ? '...' : `₹${Number(deliveryCharges?.additionalChargePerKm ?? 10).toFixed(2)}/km`}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveDeliveryFee}>
              {/* Form Input Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Base Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    id="input-base-charge"
                    min="0"
                    step="1"
                    value={baseChargeInput}
                    onChange={(e) => {
                      setBaseChargeInput(e.target.value);
                      if (deliveryFeeError) setDeliveryFeeError(null);
                    }}
                    placeholder="e.g. 35"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    Flat fee for initial base distance
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Base Distance Coverage (KM)
                  </label>
                  <input
                    type="number"
                    id="input-base-distance-km"
                    min="0.5"
                    step="0.5"
                    value={baseDistanceKmInput}
                    onChange={(e) => {
                      setBaseDistanceKmInput(e.target.value);
                      if (deliveryFeeError) setDeliveryFeeError(null);
                    }}
                    placeholder="e.g. 3"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    Included distance in base fee
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Additional Fee per KM (₹ / extra km)
                </label>
                <input
                  type="number"
                  id="input-additional-charge-per-km"
                  min="0"
                  step="1"
                  value={additionalChargePerKmInput}
                  onChange={(e) => {
                    setAdditionalChargePerKmInput(e.target.value);
                    if (deliveryFeeError) setDeliveryFeeError(null);
                  }}
                  placeholder="e.g. 10"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                  Rate charged for every kilometer beyond the base distance
                </span>
              </div>

              {deliveryFeeError && (
                <div id="delivery-fee-error" style={{ color: '#DC2626', fontSize: 12, marginBottom: 14, fontWeight: 500 }}>
                  {deliveryFeeError}
                </div>
              )}

              {/* Dynamic Distance Slabs Structure Preview */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span> Distance Slabs Structure (Calculated from Parameters)
                </div>

                {(() => {
                  const bDist = Math.max(0.1, Number(baseDistanceKmInput) || 3);
                  const bFee = Math.max(0, Number(baseChargeInput) || 35);
                  const aFee = Math.max(0, Number(additionalChargePerKmInput) || 10);
                  const midDist = bDist + 2;
                  const slab2EndFee = bFee + 2 * aFee;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>0 – {bDist} km (Base Slab)</span>
                        <span style={{ fontWeight: 700, color: '#0284C7' }}>₹{bFee.toFixed(2)} flat</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{bDist} – {midDist} km (Medium Range)</span>
                        <span style={{ fontWeight: 700, color: '#0284C7' }}>
                          ₹{bFee.toFixed(2)} – ₹{slab2EndFee.toFixed(2)} (+₹{aFee.toFixed(2)}/km)
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>Above {midDist} km (Extended Range)</span>
                        <span style={{ fontWeight: 700, color: '#0284C7' }}>
                          ₹{slab2EndFee.toFixed(2)} + ₹{aFee.toFixed(2)}/km
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Distance Test Simulator */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #CBD5E1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Test Trip Distance:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
                      {testSimKm} km → Fee: ₹
                      {(
                        (Number(baseChargeInput) || 35) +
                        Math.max(0, testSimKm - (Number(baseDistanceKmInput) || 3)) * (Number(additionalChargePerKmInput) || 10)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[2, 3, 5, 8, 12].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setTestSimKm(km)}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: testSimKm === km ? '1px solid #0284C7' : '1px solid #E2E8F0',
                          backgroundColor: testSimKm === km ? '#E0F2FE' : '#FFFFFF',
                          color: testSimKm === km ? '#0369A1' : '#64748B',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  id="btn-cancel-delivery-fee"
                  onClick={() => setIsDeliveryFeeModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#4B5563',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-delivery-fee"
                  disabled={isUpdatingDeliveryFee}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isUpdatingDeliveryFee ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingDeliveryFee ? 0.7 : 1,
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                  }}
                >
                  {isUpdatingDeliveryFee ? 'Saving...' : 'Save Delivery Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

