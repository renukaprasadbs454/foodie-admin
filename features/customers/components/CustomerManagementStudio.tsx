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

  // RTK Query Hooks
  const {
    data: customerData,
    isLoading: isLoadingCustomers,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useGetCustomersQuery({ search: debouncedSearch, status: statusFilter });

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

  const rawCustomersList = customerData?.customers ?? [];
  const customersList = rawCustomersList.filter((cust) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      cust.name.toLowerCase().includes(q) ||
      cust.email.toLowerCase().includes(q) ||
      cust.phone.includes(q) ||
      cust.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || cust.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const ticketsList = ticketsData ?? [];
  const openTicketsCount = customerData?.openTicketsCount ?? ticketsList.filter((t) => t.status === 'OPEN').length;

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
            backgroundColor: '#0F3D21',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(15,61,33,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>{toastMsg}</span>
          <span style={{ fontSize: 12, color: '#F59E0B' }}>● Live Operations</span>
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
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F3D21', margin: 0, wordBreak: 'break-word' }}>
             Customer Operations & Support Desk
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Manage customer profiles, account security controls, and customer dispute support tickets.
          </p>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#E2E8F0',
            padding: 4,
            borderRadius: 10,
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
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'DIRECTORY' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'DIRECTORY' ? '#0F3D21' : '#64748B',
              boxShadow: activeTab === 'DIRECTORY' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
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
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'TICKETS' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'TICKETS' ? '#0F3D21' : '#64748B',
              boxShadow: activeTab === 'TICKETS' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
             Support Tickets ({openTicketsCount} Open)
          </button>
        </div>
      </div>

      {/* Top Executive Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Registered</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F3D21', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : summary.totalRegistered}
          </div>
          <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 6 }}>● Real Database Users</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : summary.activeAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Verified & Unrestricted</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Suspended Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : summary.suspendedAccounts}
          </div>
          <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 6 }}>Safety / Abuse Flagged</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Average Customer LTV</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {isLoadingCustomers ? '...' : formatMoneyInr(summary.averageCustomerLtv)}
          </div>
          <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginTop: 6 }}>Lifetime value per customer</div>
        </div>
      </div>

      {/* TAB 1: CUSTOMER DIRECTORY */}
      {activeTab === 'DIRECTORY' ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20 }}>
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
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  flex: 1,
                  minWidth: 220,
                }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 600, minWidth: 160 }}
              >
                <option value="ALL">Filter: All Statuses</option>
                <option value="ACTIVE">● Active Only</option>
                <option value="SUSPENDED">○ Suspended Only</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              Showing {customersList.length} customers
            </div>
          </div>

          {/* Error State */}
          {isCustomersError ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, color: '#991B1B', margin: '16px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}> Failed to load customer data from backend</div>
              <p style={{ fontSize: 13, margin: '4px 0 12px', color: '#B91C1C' }}>
                Please check your network connection or backend server status.
              </p>
              <button
                type="button"
                onClick={() => refetchCustomers()}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                 Retry Fetch
              </button>
            </div>
          ) : isLoadingCustomers ? (
            /* Loading Skeleton */
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#0F3D21', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              Fetching live customer profiles from backend...
            </div>
          ) : customersList.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <div style={{ fontWeight: 700, color: '#334155' }}>No customers found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing search or filter criteria.</div>
            </div>
          ) : (
            /* Directory Table */
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Contact</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Total Orders</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Total Spend</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>LTV Tier</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersList.map((cust) => {
                    const ltv = calculateCustomerLtvBadge(cust.totalSpend);

                    return (
                      <tr key={cust.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => setSelectedCustomerForDetails(cust)}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: '#0F3D21',
                                color: '#F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F3D21' }}>{cust.name}</div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>Joined: {cust.joinedDate}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <div style={{ color: '#334155', fontWeight: 600 }}>{cust.email}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{cust.phone}</div>
                        </td>

                        <td style={{ padding: '12px', fontWeight: 700, color: '#1E293B' }}>
                          {cust.totalOrders} orders
                        </td>

                        <td style={{ padding: '12px', fontWeight: 800, color: '#166534' }}>
                          {formatMoneyInr(cust.totalSpend)}
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: ltv.bg,
                              color: ltv.color,
                            }}
                          >
                            {cust.loyaltyTier || ltv.tier}
                          </span>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 20,
                              backgroundColor: cust.accountStatus === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                              color: cust.accountStatus === 'ACTIVE' ? '#166534' : '#DC2626',
                            }}
                          >
                            {cust.accountStatus === 'ACTIVE' ? '● Active' : '○ Suspended'}
                          </span>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForDetails(cust)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#F8FAFC',
                                color: '#334155',
                                fontSize: 11,
                                fontWeight: 700,
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
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                backgroundColor: cust.accountStatus === 'ACTIVE' ? '#FFF1F2' : '#F0FDF4',
                                color: cust.accountStatus === 'ACTIVE' ? '#991B1B' : '#166534',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {cust.accountStatus === 'ACTIVE' ? ' Suspend' : ' Re-activate'}
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
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: '0 0 16px' }}>
             Active Customer Support & Dispute Tickets
          </h3>

          {isTicketsError ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, color: '#991B1B' }}>
               Failed to load support tickets. <button onClick={() => refetchTickets()} style={{ marginLeft: 8, padding: '4px 10px', borderRadius: 6, border: 'none', backgroundColor: '#DC2626', color: '#FFF', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : isLoadingTickets ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>Fetching support tickets...</div>
          ) : ticketsList.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>No active support tickets found.</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Ticket ID</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Order</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Category & Subject</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Priority</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsList.map((tck) => (
                    <tr key={tck.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F3D21' }}>{tck.ticketNumber || tck.id}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{tck.customerName}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{tck.customerEmail}</div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#2563EB' }}>{tck.orderId}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#E0E7FF',
                            color: '#3730A3',
                            marginRight: 6,
                          }}
                        >
                          {tck.category}
                        </span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{tck.subject}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: tck.priority === 'HIGH' ? '#DC2626' : tck.priority === 'MEDIUM' ? '#D97706' : '#64748B',
                          }}
                        >
                          {tck.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={tck.status}
                          disabled={isUpdatingTicket}
                          onChange={(e) => handleUpdateTicketStatus(tck.id, e.target.value as TicketStatus)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: tck.status === 'RESOLVED' ? '#DCFCE7' : tck.status === 'OPEN' ? '#FEF3C7' : '#FFFFFF',
                            color: tck.status === 'RESOLVED' ? '#166534' : tck.status === 'OPEN' ? '#D97706' : '#334155',
                          }}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748B' }}>{tck.createdAt}</td>
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
            backgroundColor: 'rgba(15,23,42,0.6)',
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D21', margin: 0 }}>
                {selectedCustomerForBlock.accountStatus === 'ACTIVE' ? ' Suspend Account' : ' Re-activate Account'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCustomerForBlock(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
              You are updating account status for <strong>{selectedCustomerForBlock.name}</strong> ({selectedCustomerForBlock.email}).
            </p>

            {selectedCustomerForBlock.accountStatus === 'ACTIVE' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Suspension Reason (Audit Log)
                </label>
                <textarea
                  rows={3}
                  placeholder="State reason for security audit..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedCustomerForBlock(null)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: 13, cursor: 'pointer' }}
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
                  backgroundColor: selectedCustomerForBlock.accountStatus === 'ACTIVE' ? '#DC2626' : '#166534',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: isUpdatingStatus ? 0.7 : 1,
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
            backgroundColor: 'rgba(15,23,42,0.6)',
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                    backgroundColor: '#0F3D21',
                    color: '#F59E0B',
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
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D21', margin: 0 }}>
                    {selectedCustomerForDetails.name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Customer ID: {selectedCustomerForDetails.id}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>EMAIL ADDRESS</span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedCustomerForDetails.email}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>PHONE NUMBER</span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedCustomerForDetails.phone}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>ACCOUNT STATUS</span>
                <span style={{ fontWeight: 700, color: selectedCustomerForDetails.accountStatus === 'ACTIVE' ? '#166534' : '#DC2626' }}>
                  {selectedCustomerForDetails.accountStatus}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>LTV TIER</span>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>{selectedCustomerForDetails.loyaltyTier}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>TOTAL ORDERS</span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedCustomerForDetails.totalOrders}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>TOTAL SPEND</span>
                <span style={{ fontWeight: 700, color: '#166534' }}>{formatMoneyInr(selectedCustomerForDetails.totalSpend)}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>JOINED DATE</span>
                <span style={{ fontWeight: 700, color: '#475569' }}>{selectedCustomerForDetails.joinedDate}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: 11, fontWeight: 600 }}>SAVED ADDRESSES</span>
                <span style={{ fontWeight: 700, color: '#475569' }}>{selectedCustomerForDetails.savedAddressesCount || 1} addresses</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
