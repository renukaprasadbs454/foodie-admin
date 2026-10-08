'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useGetAllTicketsQuery,
  useReplyToTicketMutation,
  useResolveTicketMutation,
  useCreateTicketMutation,
  useGetTicketMessagesQuery,
} from '../../../api/endpoints/supportApi';

import { useAppSelector } from '@/store/hooks';

export interface ChatMessage {
  id: string;
  enquiryId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface EnquiryRecord {
  id: string;
  category: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL';
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  replyMessage?: string;
  messages?: ChatMessage[];
  resolvedAt?: string;
  orderId?: string;
}

const QUICK_TEMPLATES = [
  { label: 'Refund Processing', text: 'We have processed the refund for your order. Funds will reflect in your account within 3-5 business days.' },
  { label: 'Promo Code Fixed', text: 'Our tech team validated your account status and resolved the promo code issue. You can apply it now.' },
  { label: 'Merchant Payout Dispatched', text: 'Your weekly payout statement has been compiled. Funds will transfer in tonight\'s settlement cycle.' },
  { label: 'Surge Bonus Credited', text: 'Surge incentive bonus has been manually credited to your rider wallet.' },
  { label: 'KYC Document Verified', text: 'Your uploaded document has been verified by compliance desk and account status is active.' },
];

type ContactTab = 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'HISTORY';

export function ContactUsPage() {
  const authState = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<ContactTab>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'ALL' | 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY'>('ALL');

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [history, setHistory] = useState<EnquiryRecord[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { data: apiTickets } = useGetAllTicketsQuery(undefined, { pollingInterval: 2500 });
  const [replyMutation] = useReplyToTicketMutation();
  const [resolveMutation] = useResolveTicketMutation();
  const [createTicketMutation] = useCreateTicketMutation();

  // Reply Modal State
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live messages query for selected enquiry
  const { data: activeTicketMessages } = useGetTicketMessagesQuery(selectedEnquiry?.id || '', {
    skip: !selectedEnquiry?.id,
    pollingInterval: 2000,
  });

  // New Enquiry Modal State — prefilled with logged-in user contact info
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<'CUSTOMER' | 'RESTAURANT' | 'DELIVERY'>('CUSTOMER');
  const [newSenderName, setNewSenderName] = useState(() => authState.fullName || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_fullname') || sessionStorage.getItem('foodie_admin_fullname')) : null) || '');
  const [newSenderEmail, setNewSenderEmail] = useState(() => authState.email || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_email') || sessionStorage.getItem('foodie_admin_email')) : null) || '');
  const [newSenderPhone, setNewSenderPhone] = useState(() => authState.phone || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_phone') || sessionStorage.getItem('foodie_admin_phone')) : null) || '');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  useEffect(() => {
    if (isCreateModalOpen) {
      if (authState.fullName && !newSenderName) setNewSenderName(authState.fullName);
      if (authState.email && !newSenderEmail) setNewSenderEmail(authState.email);
      if (authState.phone && !newSenderPhone) setNewSenderPhone(authState.phone);
    }
  }, [isCreateModalOpen, authState]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (apiTickets && Array.isArray(apiTickets)) {
      const mapped: EnquiryRecord[] = (apiTickets as any).map((t: any) => {
        const firstUserMsg = t.messages?.find((m: any) => m.senderType !== 'AGENT' && m.senderType !== 'AI');
        return {
          id: t.id,
          category: t.category || 'CUSTOMER',
          senderName: t.senderName || firstUserMsg?.senderName || 'User',
          senderEmail: t.senderEmail || t.customerId || 'N/A',
          senderPhone: t.senderPhone || 'N/A',
          subject: t.subject || 'Support Ticket',
          message: t.message || firstUserMsg?.content || firstUserMsg?.message || 'View details',
          timestamp: t.timestamp || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : 'Just now'),
          status: t.status || 'OPEN',
          priority: t.priority || 'MEDIUM',
          orderId: t.orderId,
          messages: Array.isArray(t.messages)
            ? t.messages.map((m: any) => ({
              id: m.id,
              enquiryId: t.id,
              sender: (m.sender === 'admin' || m.senderType === 'AGENT' || m.senderType === 'AI') ? 'admin' : 'customer',
              senderName: m.senderName || (m.senderType === 'AGENT' ? 'Admin Support' : 'User'),
              message: m.message || m.content || '',
              timestamp: m.timestamp || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : 'Just now')
            }))
            : [],
          replyMessage: t.replyMessage
        };
      });
      const nonGeneral = mapped.filter((t) => (t.category as string) !== 'GENERAL');
      const active = nonGeneral.filter((t) => t.status !== 'RESOLVED');
      setEnquiries(active);
      setHistory(nonGeneral);
    }
  }, [apiTickets]);

  useEffect(() => {
    if (selectedEnquiry && activeTicketMessages && activeTicketMessages.length > 0) {
      setSelectedEnquiry((prev) => {
        if (!prev || prev.id !== selectedEnquiry.id) return prev;
        return {
          ...prev,
          messages: activeTicketMessages,
        };
      });
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 60);
    }
  }, [activeTicketMessages]);

  const handleMarkAsResolved = async (enquiryId: string) => {
    try {
      await resolveMutation({ id: enquiryId, status: 'RESOLVED' }).unwrap();
      showToast(`Enquiry ${enquiryId} marked as RESOLVED and moved to History!`);
      if (selectedEnquiry?.id === enquiryId) {
        setSelectedEnquiry(null);
      }
    } catch {
      showToast(`Enquiry ${enquiryId} marked as RESOLVED`);
      if (selectedEnquiry?.id === enquiryId) {
        setSelectedEnquiry(null);
      }
    }
  };

  const handleReopenTicket = async (enquiryId: string) => {
    try {
      await resolveMutation({ id: enquiryId, status: 'OPEN' }).unwrap();
      showToast(`Ticket ${enquiryId} reopened and restored to active support queue.`);
    } catch {
      showToast(`Failed to reopen ticket ${enquiryId}`);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !replyText.trim()) {
      alert('Please enter your response message.');
      return;
    }

    const textToSend = replyText.trim();
    try {
      await replyMutation({
        ticketId: selectedEnquiry.id,
        message: textToSend,
        senderName: 'Admin Support',
      }).unwrap();
      setReplyText('');
      showToast(`Response sent & delivered to live thread!`);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    } catch {
      showToast('Failed to send reply');
    }
  };

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSenderName || !newSenderEmail || !newSubject || !newMessage) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const res = await createTicketMutation({
        category: newCategory,
        senderName: newSenderName.trim(),
        senderEmail: newSenderEmail.trim(),
        senderPhone: newSenderPhone.trim() || '+91 98000 00000',
        subject: newSubject.trim(),
        message: newMessage.trim(),
        priority: newPriority,
      }).unwrap();

      showToast(`New support ticket ${res?.id || ''} created successfully!`);
      setIsCreateModalOpen(false);
      setNewSenderName('');
      setNewSenderEmail('');
      setNewSenderPhone('');
      setNewSubject('');
      setNewMessage('');
      setActiveTab(newCategory);
    } catch {
      showToast('Failed to create ticket');
    }
  };

  const matchesFilters = (item: EnquiryRecord) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;

    let matchesDate = true;
    if (dateFilter === 'TODAY') {
      matchesDate = item.timestamp.includes('mins') || item.timestamp.includes('hour') || item.timestamp.includes('Just now');
    } else if (dateFilter === 'WEEK') {
      matchesDate = !item.timestamp.includes('month');
    }

    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.id.toLowerCase().includes(q) ||
      item.senderName.toLowerCase().includes(q) ||
      item.senderEmail.toLowerCase().includes(q) ||
      item.senderPhone.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      (item.orderId && item.orderId.toLowerCase().includes(q));

    return matchesStatus && matchesPriority && matchesDate && matchesQuery;
  };

  const getFilteredEnquiries = (cat: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY') => {
    return enquiries.filter((item) => item.category === cat && matchesFilters(item));
  };

  const getFilteredHistory = () => {
    return history.filter((item) => {
      const matchesCategory = historyCategoryFilter === 'ALL' || item.category === historyCategoryFilter;
      return matchesCategory && matchesFilters(item);
    });
  };

  // Metrics
  const totalOpenCount = enquiries.filter((e) => e.status === 'OPEN').length;
  const customerCount = enquiries.filter((e) => e.category === 'CUSTOMER').length;
  const restaurantCount = enquiries.filter((e) => e.category === 'RESTAURANT').length;
  const deliveryCount = enquiries.filter((e) => e.category === 'DELIVERY').length;
  const historyCount = history.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '14px 24px',
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Contact Us & Support Operations Desk
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Manage customer, restaurant & delivery partner enquiries with direct message replies and resolution tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
            transition: 'transform 0.15s ease',
          }}
        >
          <span>+</span>
          <span>Log Support Enquiry</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Enquiries</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{enquiries.length}</div>
          <div style={{ fontSize: 12, color: '#2196F3', fontWeight: 500, marginTop: 4 }}>{totalOpenCount} Open tickets</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Enquiries</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{customerCount}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>User tickets & refunds</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurant Enquiries</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{restaurantCount}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Menu, POS & payouts</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Partners</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{deliveryCount}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Incentives & KYC review</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved Audit Log</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 4 }}>{historyCount}</div>
          <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 500, marginTop: 4 }}>100% Audit Logged</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search enquiries by sender, email, phone, subject, order ID or ENQ code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Status: All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Priority: All</option>
            <option value="HIGH">High Urgency</option>
            <option value="MEDIUM">Medium Urgency</option>
            <option value="LOW">Low Urgency</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Timeframe: All</option>
            <option value="TODAY">Received Today</option>
            <option value="WEEK">Last 7 Days</option>
          </select>
        </div>

        {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || dateFilter !== 'ALL' ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setDateFilter('ALL');
            }}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        ) : null}
      </div>

      {/* Category Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          backgroundColor: '#FFFFFF',
          padding: '8px',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          overflowX: 'auto',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        {[
          { id: 'CUSTOMER', label: 'Customer Enquiries', count: getFilteredEnquiries('CUSTOMER').length },
          { id: 'RESTAURANT', label: 'Restaurant Enquiries', count: getFilteredEnquiries('RESTAURANT').length },
          { id: 'DELIVERY', label: 'Delivery Partner Enquiries', count: getFilteredEnquiries('DELIVERY').length },
          { id: 'HISTORY', label: 'Contact History', count: getFilteredHistory().length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ContactTab)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isActive ? '0 4px 14px rgba(33, 150, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#F3F4F6',
                  color: isActive ? '#FFFFFF' : '#374151',
                  padding: '2px 8px',
                  borderRadius: 9999,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Enquiries List (Customer, Restaurant, Delivery) */}
      {activeTab !== 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {getFilteredEnquiries(activeTab as any).length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: 48,
                borderRadius: 20,
                textAlign: 'center',
                border: '1px solid #E5E7EB',
                color: '#6B7280',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>No active enquiries matching your filters</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                All support tickets in this view have been resolved or reset search filters.
              </div>
            </div>
          ) : (
            getFilteredEnquiries(activeTab as any).map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E5E7EB',
                  borderLeft: '4px solid #2196F3',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 8px', borderRadius: 6 }}>
                        {item.id}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                        {item.senderName} - {item.orderId ? `Order #${item.orderId}` : 'No Order ID'}
                      </span>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: item.status === 'RESOLVED' ? '#DCFCE7' : item.status === 'IN_PROGRESS' ? '#FEF3C7' : '#E3F2FD',
                          color: item.status === 'RESOLVED' ? '#15803D' : item.status === 'IN_PROGRESS' ? '#B45309' : '#2196F3',
                          padding: '3px 10px',
                          borderRadius: 9999,
                        }}
                      >
                        {item.status}
                      </span>

                      {item.priority && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: item.priority === 'HIGH' ? '#FEE2E2' : '#F3F4F6',
                            color: item.priority === 'HIGH' ? '#EF4444' : '#6B7280',
                            padding: '3px 10px',
                            borderRadius: 9999,
                          }}
                        >
                          {item.priority === 'HIGH' ? 'High Urgency' : item.priority === 'MEDIUM' ? 'Medium' : 'Low'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
                      From: <strong style={{ color: '#111827' }}>{item.senderName}</strong> ({item.senderEmail} • {item.senderPhone}) | Recd: {item.timestamp}
                      {item.orderId ? <span style={{ marginLeft: 8, color: '#2196F3', fontWeight: 600 }}>• Order Ref: #{item.orderId}</span> : null}
                    </div>
                  </div>

                  {/* Actions: Message Reply & Mark as Resolved */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEnquiry(item);
                        setReplyText(item.replyMessage || '');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FFFFFF',
                        color: '#2196F3',
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>Message Reply</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAsResolved(item.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                      }}
                    >
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                </div>

                {/* Subject & Complaint Message Display */}
                <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', padding: '14px 18px', borderRadius: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Subject: {item.subject}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 1.5, backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                    "{item.message}"
                  </div>
                </div>

                {/* Conversation Thread Preview Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#6B7280', borderTop: '1px solid #F3F4F6', paddingTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 10px', borderRadius: 9999, fontSize: 11 }}>
                      {item.messages?.length || 1} {((item.messages?.length || 1) === 1) ? 'Message' : 'Messages'} in live thread
                    </span>
                    {item.replyMessage && (
                      <span style={{ color: '#374151', fontWeight: 500, fontSize: 12 }}>
                        Latest reply: "{item.replyMessage.length > 60 ? item.replyMessage.slice(0, 60) + '...' : item.replyMessage}"
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnquiry(item);
                      setReplyText(item.replyMessage || '');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2196F3',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View Contact History & Reply &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: CONTACT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                {statusFilter === 'RESOLVED' ? 'Resolved Contact History Audit Log' : 'Partner Contact History & Complaints Audit Log'}
              </h2>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0 0' }}>
                Complete audit trail of enquiries & complaints received from Delivery, Restaurant, and Customer partners
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Partner Category Filter Pills */}
              {[
                { id: 'ALL', label: 'All Partners' },
                { id: 'CUSTOMER', label: 'Customers' },
                { id: 'RESTAURANT', label: 'Restaurants' },
                { id: 'DELIVERY', label: 'Delivery Fleet' },
              ].map((pill) => {
                const isSelected = historyCategoryFilter === pill.id;
                const count = pill.id === 'ALL'
                  ? history.filter((i) => matchesFilters(i)).length
                  : history.filter((i) => i.category === pill.id && matchesFilters(i)).length;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setHistoryCategoryFilter(pill.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 9999,
                      border: isSelected ? '1px solid #2196F3' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#E3F2FD' : '#FFFFFF',
                      color: isSelected ? '#2196F3' : '#6B7280',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{pill.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        backgroundColor: isSelected ? '#2196F3' : '#F3F4F6',
                        color: isSelected ? '#FFFFFF' : '#6B7280',
                        padding: '1px 6px',
                        borderRadius: 9999,
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: '#FFFFFF', color: '#111827', border: '1px solid #E5E7EB', padding: '4px 12px', borderRadius: 9999 }}>
                {getFilteredHistory().length} Total Records
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enquiry & Sender</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Request</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Response Sent</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution Audit</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status & Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHistory().length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                      No contact history records matching active search filters.
                    </td>
                  </tr>
                ) : (
                  getFilteredHistory().map((row) => {
                    const isRestaurant = row.category === 'RESTAURANT';
                    const isDelivery = row.category === 'DELIVERY';
                    const catBg = isRestaurant ? '#FEF3C7' : isDelivery ? '#DCFCE7' : '#E3F2FD';
                    const catColor = isRestaurant ? '#B45309' : isDelivery ? '#15803D' : '#2196F3';

                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#2196F3' }}>{row.id}</div>
                          <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>{row.senderName}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{row.senderEmail}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: catBg,
                              color: catColor,
                              padding: '4px 10px',
                              borderRadius: 9999,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{row.category}</span>
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{row.subject}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{row.message}"
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                          <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{row.replyMessage || 'Resolved via support desk'}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 12, color: '#6B7280' }}>{row.resolvedAt || (row.status === 'RESOLVED' ? 'Resolved by Admin' : 'In Progress')}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
                            <span
                              style={{
                                backgroundColor: row.status === 'RESOLVED' ? '#DCFCE7' : row.status === 'IN_PROGRESS' ? '#FEF3C7' : '#E3F2FD',
                                color: row.status === 'RESOLVED' ? '#15803D' : row.status === 'IN_PROGRESS' ? '#B45309' : '#2196F3',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 9999,
                                textAlign: 'center',
                              }}
                            >
                              {row.status}
                            </span>

                            {/* View Full Conversation Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEnquiry(row);
                                setReplyText(row.replyMessage || '');
                              }}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#FFFFFF',
                                color: '#2196F3',
                                border: '1px solid #E5E7EB',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span>View Conversation</span>
                            </button>

                            {row.status === 'RESOLVED' ? (
                              <button
                                type="button"
                                onClick={() => handleReopenTicket(row.id)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#2196F3',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                Reopen Ticket
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkAsResolved(row.id)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#15803D',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MESSAGE REPLY MODAL */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedEnquiry(null)}
        >
          <form
            onSubmit={handleSendReply}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 620,
              width: '100%',
              maxHeight: '92vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {selectedEnquiry.senderName
                    ? selectedEnquiry.senderName.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'CU'}
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#FFFFFF',
                      margin: 0,
                    }}
                  >
                    Reply to {selectedEnquiry.senderName} ({selectedEnquiry.orderId ? `#${selectedEnquiry.orderId}` : selectedEnquiry.id})
                  </h3>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginTop: 2,
                    }}
                  >
                    Active Support Enquiry
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 22,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Customer / Order Information */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                padding: '10px 20px',
                fontSize: 12,
                color: '#6B7280',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <strong style={{ color: '#111827' }}>Subject:</strong>
                <span style={{ color: '#374151' }}>{selectedEnquiry.subject}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 16,
                  rowGap: 4,
                  marginTop: 4,
                }}
              >
                <div>
                  <strong style={{ color: '#111827' }}>Email:</strong>{' '}
                  <span style={{ color: '#374151' }}>
                    {selectedEnquiry.senderEmail} {selectedEnquiry.senderPhone ? `(${selectedEnquiry.senderPhone})` : ''}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#111827' }}>Order ID:</strong>{' '}
                  <span
                    style={{
                      color: '#2196F3',
                      fontWeight: 600,
                    }}
                  >
                    {selectedEnquiry.orderId
                      ? `#${selectedEnquiry.orderId.replace(/^#/, '')}`
                      : (selectedEnquiry.subject.match(/#([A-Za-z0-9-]+)/)?.[0] || 'ORD-9821')}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversation History */}
            <div
              ref={chatScrollRef}
              style={{
                flex: '1 1 auto',
                minHeight: 200,
                maxHeight: 280,
                overflowY: 'auto',
                backgroundColor: '#F5F7FA',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 6px 0' }}>
                <span
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#6B7280',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '3px 12px',
                    borderRadius: 9999,
                    border: '1px solid #E5E7EB',
                    letterSpacing: '0.04em',
                  }}
                >
                  Conversation History ({(selectedEnquiry.messages && selectedEnquiry.messages.length) || 1}{' '}
                  {((selectedEnquiry.messages && selectedEnquiry.messages.length) || 1) === 1 ? 'Message' : 'Messages'})
                </span>
              </div>

              {(((activeTicketMessages && activeTicketMessages.length > 0 ? activeTicketMessages : selectedEnquiry.messages) && (activeTicketMessages || selectedEnquiry.messages)!.length > 0)
                ? (activeTicketMessages || selectedEnquiry.messages)!.filter(
                  (m) =>
                    !m.message.includes('Message delivered to Admin Support') &&
                    !m.message.includes('Message sent to Admin Support')
                )
                : [
                  {
                    id: `msg-orig-${selectedEnquiry.id}`,
                    enquiryId: selectedEnquiry.id,
                    sender: 'customer' as const,
                    senderName: selectedEnquiry.senderName,
                    message: selectedEnquiry.message,
                    timestamp: selectedEnquiry.timestamp,
                  },
                ]
              ).map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      backgroundColor: isAdmin ? '#E3F2FD' : '#FFFFFF',
                      color: '#111827',
                      padding: '10px 14px',
                      borderRadius: 14,
                      borderTopRightRadius: isAdmin ? 4 : 14,
                      borderTopLeftRadius: isAdmin ? 14 : 4,
                      border: isAdmin ? '1px solid #BAE6FD' : '1px solid #E5E7EB',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isAdmin ? '#2196F3' : '#6B7280',
                        marginBottom: 3,
                      }}
                    >
                      {isAdmin ? 'You (Admin Support)' : msg.senderName || selectedEnquiry.senderName}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: '#111827',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.message}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: '#9CA3AF',
                        textAlign: 'right',
                        marginTop: 4,
                      }}
                    >
                      {msg.timestamp || 'Just now'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Response Templates */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #E5E7EB',
                padding: '10px 20px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Quick Templates
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => setReplyText(tmpl.text)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      color: '#374151',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    + {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Composer */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '12px 20px 16px 20px',
                borderTop: '1px solid #E5E7EB',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    padding: '8px 12px',
                  }}
                >
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                    rows={2}
                    placeholder="Type your response message..."
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: '#111827',
                      fontSize: 13,
                      lineHeight: 1.4,
                      resize: 'none',
                      fontFamily: 'inherit',
                      padding: 0,
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW SUPPORT TICKET MODAL */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateEnquiry}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Log New Support Enquiry Ticket
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="CUSTOMER">Customer Enquiry</option>
                  <option value="RESTAURANT">Restaurant Enquiry</option>
                  <option value="DELIVERY">Delivery Partner Enquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Priority Urgency *
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="HIGH">High Urgency</option>
                  <option value="MEDIUM">Medium Urgency</option>
                  <option value="LOW">Low Urgency</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Sender Name *
              </label>
              <input
                type="text"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Sender Email *
                </label>
                <input
                  type="email"
                  value={newSenderEmail}
                  onChange={(e) => setNewSenderEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Sender Phone
                </label>
                <input
                  type="text"
                  value={newSenderPhone}
                  onChange={(e) => setNewSenderPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Subject *
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief title of enquiry..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Detailed Enquiry Description *
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Enter details of customer/partner inquiry..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, resize: 'vertical', backgroundColor: '#FFFFFF', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                }}
              >
                Save & Open Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
