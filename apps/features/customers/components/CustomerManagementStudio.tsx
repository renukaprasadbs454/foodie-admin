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

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // RTK Query Hooks - Fetches live database records once and keeps cache warm for instant client-side search/filter
  const {
    data: customerData,
    isLoading: isLoadingCustomers,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useGetCustomersQuery();

  const {
    data: ticketsData,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    refetch: refetchTickets,
  } = useGetSupportTicketsQuery();

  const [updateCustomerStatus, { isLoading: isUpdatingStatus }] = useUpdateCustomerStatusMutation();
  const [updateTicketStatus, { isLoading: isUpdatingTicket }] = useUpdateTicketStatusMutation();

  const summary = customerData?.summary ?? {
    totalRegistered: 0,
    activeAccounts: 0,
    suspendedAccounts: 0,
    averageCustomerLtv: 0,
  };

  const rawCustomersList: CustomerProfile[] = Array.isArray(customerData?.customers)
    ? customerData.customers
    : Array.isArray(customerData)
    ? (customerData as CustomerProfile[])
    : Array.isArray((customerData as any)?.data?.customers)
    ? (customerData as any).data.customers
    : Array.isArray((customerData as any)?.data)
    ? (customerData as any).data
    : [];

  const customersList: CustomerProfile[] = rawCustomersList.filter((cust: CustomerProfile) => {
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
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            Customer Operations & Support Desk
          </h1>
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
            Customer Directory ({summary.totalRegistered})
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
            {isLoadingCustomers ? '...' : summary.totalRegistered}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Real Database Users</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : summary.activeAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Verified & Unrestricted</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suspended Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : summary.suspendedAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Safety / Abuse Flagged</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Customer LTV</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : formatMoneyInr(summary.averageCustomerLtv)}
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

              <select
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
          {isCustomersError ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, color: '#0369A1', margin: '16px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Failed to load customer data from backend</div>
              <p style={{ fontSize: 13, margin: '4px 0 12px', color: '#0284C7' }}>
                Please check your network connection or backend server status.
              </p>
              <button
                type="button"
                onClick={() => refetchCustomers()}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: '#FFFFFF', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' }}
              >
                Retry Fetch
              </button>
            </div>
          ) : isLoadingCustomers ? (
            /* Loading Skeleton */
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#0284C7', fontSize: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #BAE6FD', borderTopColor: '#0284C7', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              Fetching live customer profiles from backend...
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
                              <div style={{ fontSize: 11, color: '#6B7280' }}>Joined: {cust.joinedDate}</div>
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
    </div>
  );
}

