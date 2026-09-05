'use client';

import React, { useState } from 'react';
import { Text } from 'foodie-shared-web';

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
  resolvedAt?: string;
  orderId?: string;
}

const INITIAL_ENQUIRIES: EnquiryRecord[] = [
  {
    id: 'ENQ-901',
    category: 'CUSTOMER',
    senderName: 'Ananya Sharma',
    senderEmail: 'ananya.s@gmail.com',
    senderPhone: '+91 98765 12345',
    subject: 'Delayed Refund for Order #ORD-9821',
    message: 'I was debited ₹450 for a cancelled order yesterday but haven\'t received refund in my bank account.',
    timestamp: '15 mins ago',
    status: 'OPEN',
    priority: 'HIGH',
    orderId: 'ORD-9821',
  },
  {
    id: 'ENQ-902',
    category: 'CUSTOMER',
    senderName: 'Vikram Mehta',
    senderEmail: 'vikram.m@yahoo.com',
    senderPhone: '+91 98123 45678',
    subject: 'Unable to apply promo code WELCOME100',
    message: 'The promo code states invalid even though I am placing my first order.',
    timestamp: '40 mins ago',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    replyMessage: 'Our tech team is validating your first order eligibility status.',
  },
  {
    id: 'ENQ-903',
    category: 'RESTAURANT',
    senderName: 'Rajesh Gupta (Royal Biryani)',
    senderEmail: 'contact@royalbiryani.in',
    senderPhone: '+91 99001 88776',
    subject: 'Request to update menu prices & commission statement',
    message: 'We have updated our GST details and require our weekly commission payout report.',
    timestamp: '1 hour ago',
    status: 'OPEN',
    priority: 'MEDIUM',
  },
  {
    id: 'ENQ-904',
    category: 'DELIVERY',
    senderName: 'Ramesh Kumar (Rider #DRV-402)',
    senderEmail: 'ramesh.rider@gmail.com',
    senderPhone: '+91 97400 33211',
    subject: 'Rain Surge Payout Incentive Not Credited',
    message: 'I completed 12 orders during rain surge hours in Indiranagar yesterday. Rain bonus ₹300 is missing.',
    timestamp: '2 hours ago',
    status: 'OPEN',
    priority: 'HIGH',
  },
  {
    id: 'ENQ-905',
    category: 'GENERAL',
    senderName: 'Sanjay Kapoor (TechCrunch)',
    senderEmail: 'sanjay@techcrunch.com',
    senderPhone: '+91 98222 11000',
    subject: 'Media & Franchise Partnership Inquiry',
    message: 'Interested in featuring Foodie Hyperlocal Platform in our upcoming startup ecosystem report.',
    timestamp: '3 hours ago',
    status: 'OPEN',
    priority: 'LOW',
  },
  {
    id: 'ENQ-906',
    category: 'CUSTOMER',
    senderName: 'Sneha Patel',
    senderEmail: 'sneha.patel@gmail.com',
    senderPhone: '+91 98990 77112',
    subject: 'Wrong items delivered in Order #ORD-10492',
    message: 'Ordered vegetarian paneer tikka meal but received non-veg chicken items. Requesting immediate replacement.',
    timestamp: '3 hours ago',
    status: 'OPEN',
    priority: 'HIGH',
    orderId: 'ORD-10492',
  },
  {
    id: 'ENQ-907',
    category: 'RESTAURANT',
    senderName: 'Chef Mario (Pizzeria Gusto)',
    senderEmail: 'mario@pizzeriagusto.com',
    senderPhone: '+91 97112 44990',
    subject: 'Kitchen Display Printer Offline Issue',
    message: 'Orders are not auto-printing on thermal printer after Bluetooth update.',
    timestamp: '4 hours ago',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    replyMessage: 'Merchant support engineer dispatched thermal printer driver patch.',
  },
  {
    id: 'ENQ-908',
    category: 'DELIVERY',
    senderName: 'Deepa V. (Rider #DRV-889)',
    senderEmail: 'deepa.rider@gmail.com',
    senderPhone: '+91 96221 00334',
    subject: 'Vehicle Insurance & KYC Document Re-validation Pending',
    message: 'Uploaded renewed two-wheeler insurance certificate 2 days ago. Account remains temporarily soft-locked.',
    timestamp: '5 hours ago',
    status: 'OPEN',
    priority: 'MEDIUM',
  },
];

const INITIAL_HISTORY: EnquiryRecord[] = [
  {
    id: 'ENQ-880',
    category: 'CUSTOMER',
    senderName: 'Priya Nair',
    senderEmail: 'priya.nair@outlook.com',
    senderPhone: '+91 96555 44332',
    subject: 'Address change for live order',
    message: 'Please change delivery address from Flat 201 to Flat 405.',
    timestamp: '1 day ago',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    replyMessage: 'Address updated and driver notified successfully via dispatch desk.',
    resolvedAt: '1 day ago by Admin',
  },
  {
    id: 'ENQ-881',
    category: 'RESTAURANT',
    senderName: 'Chef Marco (Bella Italia)',
    senderEmail: 'info@bellaitalia.com',
    senderPhone: '+91 98888 12121',
    subject: 'POS Integration API Credentials Request',
    message: 'We require sandbox API keys to integrate our kitchen POS with Foodie Merchant SDK.',
    timestamp: '2 days ago',
    status: 'RESOLVED',
    priority: 'LOW',
    replyMessage: 'API Credentials and Sandbox documentation dispatched to vendor email.',
    resolvedAt: '2 days ago by Tech Desk',
  },
  {
    id: 'ENQ-879',
    category: 'DELIVERY',
    senderName: 'Sunita Rao (Rider #DRV-112)',
    senderEmail: 'sunita.rao@gmail.com',
    senderPhone: '+91 98441 55900',
    subject: 'Emergency vehicle breakdown assistance during delivery',
    message: 'Tire puncture on Ring Road while carrying Order #ORD-7710. Requested re-assignment.',
    timestamp: '3 days ago',
    status: 'RESOLVED',
    priority: 'HIGH',
    replyMessage: 'Backup delivery partner assigned and order delivered with 8 min delay. Bonus credited to Sunita.',
    resolvedAt: '3 days ago by Dispatch Desk',
  },
];

const QUICK_TEMPLATES = [
  { label: 'Refund Processing', text: 'We have processed the refund for your order. Funds will reflect in your account within 3-5 business days.' },
  { label: 'Promo Code Fixed', text: 'Our tech team validated your account status and resolved the promo code issue. You can apply it now.' },
  { label: 'Merchant Payout Dispatched', text: 'Your weekly payout & GST statement has been compiled. Funds will transfer in tonight\'s settlement cycle.' },
  { label: 'Surge Bonus Credited', text: 'Surge incentive bonus has been manually credited to your rider wallet.' },
  { label: 'KYC Document Verified', text: 'Your uploaded document has been verified by compliance desk and account status is active.' },
];

type ContactTab = 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL' | 'HISTORY';

export function ContactUsPage() {
  const [activeTab, setActiveTab] = useState<ContactTab>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>(INITIAL_ENQUIRIES);
  const [history, setHistory] = useState<EnquiryRecord[]>(INITIAL_HISTORY);

  // Reply Modal State
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Enquiry Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL'>('CUSTOMER');
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderPhone, setNewSenderPhone] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleMarkAsResolved = (enquiryId: string) => {
    const target = enquiries.find((item) => item.id === enquiryId);
    if (!target) return;

    const resolvedRecord: EnquiryRecord = {
      ...target,
      status: 'RESOLVED',
      resolvedAt: 'Just now by Operations Desk',
      replyMessage: target.replyMessage || 'Issue investigated and marked as resolved by Support team.',
    };

    setEnquiries((prev) => prev.filter((item) => item.id !== enquiryId));
    setHistory((prev) => [resolvedRecord, ...prev]);

    showToast(`✓ Enquiry ${enquiryId} marked as RESOLVED and moved to History!`);
  };

  const handleReopenTicket = (enquiryId: string) => {
    const target = history.find((item) => item.id === enquiryId);
    if (!target) return;

    const reopenedRecord: EnquiryRecord = {
      ...target,
      status: 'IN_PROGRESS',
      resolvedAt: undefined,
    };

    setHistory((prev) => prev.filter((item) => item.id !== enquiryId));
    setEnquiries((prev) => [reopenedRecord, ...prev]);

    showToast(`↺ Ticket ${enquiryId} reopened and restored to active support queue.`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !replyText.trim()) {
      alert('Please enter your response message.');
      return;
    }

    setEnquiries((prev) =>
      prev.map((item) =>
        item.id === selectedEnquiry.id
          ? { ...item, replyMessage: replyText.trim(), status: 'IN_PROGRESS' }
          : item
      )
    );

    showToast(`✉ Response dispatched to ${selectedEnquiry.senderEmail}!`);
    setSelectedEnquiry(null);
    setReplyText('');
  };

  const handleCreateEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSenderName || !newSenderEmail || !newSubject || !newMessage) {
      alert('Please fill out all required fields.');
      return;
    }

    const newRecord: EnquiryRecord = {
      id: `ENQ-${Math.floor(900 + Math.random() * 100)}`,
      category: newCategory,
      senderName: newSenderName.trim(),
      senderEmail: newSenderEmail.trim(),
      senderPhone: newSenderPhone.trim() || '+91 98000 00000',
      subject: newSubject.trim(),
      message: newMessage.trim(),
      timestamp: 'Just now',
      status: 'OPEN',
      priority: newPriority,
    };

    setEnquiries((prev) => [newRecord, ...prev]);
    showToast(`★ New support ticket ${newRecord.id} created successfully!`);
    setIsCreateModalOpen(false);
    setNewSenderName('');
    setNewSenderEmail('');
    setNewSenderPhone('');
    setNewSubject('');
    setNewMessage('');
    setActiveTab(newCategory);
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

  const getFilteredEnquiries = (cat: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL') => {
    return enquiries.filter((item) => item.category === cat && matchesFilters(item));
  };

  const getFilteredHistory = () => {
    return history.filter((item) => matchesFilters(item));
  };

  // Metrics
  const totalOpenCount = enquiries.filter((e) => e.status === 'OPEN').length;
  const customerCount = enquiries.filter((e) => e.category === 'CUSTOMER').length;
  const restaurantCount = enquiries.filter((e) => e.category === 'RESTAURANT').length;
  const deliveryCount = enquiries.filter((e) => e.category === 'DELIVERY').length;
  const generalCount = enquiries.filter((e) => e.category === 'GENERAL').length;
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
            backgroundColor: '#0F3D21',
            color: '#F59E0B',
            border: '1px solid #F59E0B',
            padding: '14px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
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
          <Text as="h1" variant="heading1" color="#14532D">
            Support Operations Desk
          </Text>
          <Text as="p" variant="caption" color="#64748B">
            Manage customer, restaurant, delivery partner & general enquiries with direct message replies, filters & resolution tracking
          </Text>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#14532D',
            color: '#F59E0B',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(20, 83, 45, 0.2)',
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
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#14532D', marginTop: 4 }}>{enquiries.length}</div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>{totalOpenCount} Open tickets</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Customer Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#047857', marginTop: 4 }}>{customerCount}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>User tickets & refunds</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Restaurant Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309', marginTop: 4 }}>{restaurantCount}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Menu, POS & payouts</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Delivery Partners</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#1D4ED8', marginTop: 4 }}>{deliveryCount}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Incentives & KYC review</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Resolved Audit Log</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#475569', marginTop: 4 }}>{historyCount}</div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>100% Audit Logged</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
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
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Filter: All Statuses</option>
            <option value="OPEN">● Open</option>
            <option value="IN_PROGRESS">● In Progress</option>
            <option value="RESOLVED">● Resolved</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Priority: All</option>
            <option value="HIGH">🔥 High Urgency</option>
            <option value="MEDIUM">⚡ Medium Urgency</option>
            <option value="LOW">💧 Low Urgency</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
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
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#991B1B',
              fontSize: 12,
              fontWeight: 800,
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
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          overflowX: 'auto',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        {[
          { id: 'CUSTOMER', label: 'Customer Enquiries', count: getFilteredEnquiries('CUSTOMER').length },
          { id: 'RESTAURANT', label: 'Restaurant Enquiries', count: getFilteredEnquiries('RESTAURANT').length },
          { id: 'DELIVERY', label: 'Delivery Partner Enquiries', count: getFilteredEnquiries('DELIVERY').length },
          { id: 'GENERAL', label: 'General Enquiries', count: getFilteredEnquiries('GENERAL').length },
          { id: 'HISTORY', label: 'Contact History', count: getFilteredHistory().length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ContactTab)}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isActive ? '#14532D' : 'transparent',
                color: isActive ? '#F59E0B' : '#475569',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: isActive ? '#F59E0B' : '#E2E8F0',
                  color: isActive ? '#14532D' : '#475569',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Enquiries List */}
      {activeTab !== 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {getFilteredEnquiries(activeTab as any).length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: 48,
                borderRadius: 14,
                textAlign: 'center',
                border: '1px solid #E2E8F0',
                color: '#64748B',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#14532D' }}>No active enquiries matching your filters</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                All support tickets in this view have been resolved or reset search filters.
              </div>
            </div>
          ) : (
            getFilteredEnquiries(activeTab as any).map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  borderLeft:
                    item.priority === 'HIGH'
                      ? '5px solid #EF4444'
                      : item.status === 'IN_PROGRESS'
                      ? '5px solid #F59E0B'
                      : '5px solid #10B981',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#0F3D21', color: '#FFFFFF', padding: '2px 6px', borderRadius: 4 }}>
                        {item.id}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#14532D' }}>{item.subject}</span>
                      
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor: item.status === 'IN_PROGRESS' ? '#FEF3C7' : '#D1FAE5',
                          color: item.status === 'IN_PROGRESS' ? '#B45309' : '#047857',
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        ● {item.status}
                      </span>

                      {item.priority && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            backgroundColor: item.priority === 'HIGH' ? '#FEE2E2' : item.priority === 'MEDIUM' ? '#FEF3C7' : '#F1F5F9',
                            color: item.priority === 'HIGH' ? '#991B1B' : item.priority === 'MEDIUM' ? '#B45309' : '#475569',
                            padding: '3px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {item.priority === 'HIGH' ? '🔥 HIGH URGENCY' : item.priority === 'MEDIUM' ? '⚡ MEDIUM' : 'LOW'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                      From: <strong>{item.senderName}</strong> ({item.senderEmail} • {item.senderPhone}) | Recd: {item.timestamp}
                      {item.orderId ? <span style={{ marginLeft: 8, color: '#1D4ED8', fontWeight: 700 }}>• Order Ref: #{item.orderId}</span> : null}
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
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        border: '1px solid #FCD34D',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>✉</span>
                      <span>Message Reply</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAsResolved(item.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#14532D',
                        color: '#F59E0B',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>✓</span>
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                </div>

                {/* Enquiry Message Content */}
                <div style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  "{item.message}"
                </div>

                {/* Dispatch Reply Draft */}
                {item.replyMessage && (
                  <div style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, border: '1px solid #A7F3D0', fontSize: 12, color: '#065F46' }}>
                    <strong>Dispatch Draft Sent:</strong> {item.replyMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: CONTACT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#14532D', margin: 0 }}>Resolved Contact History Audit Log</h2>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>Archived and resolved support enquiries with complete audit trail</p>
            </div>

            <span style={{ fontSize: 12, fontWeight: 800, backgroundColor: '#D1FAE5', color: '#047857', padding: '4px 12px', borderRadius: 20 }}>
              {getFilteredHistory().length} Resolved Tickets
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '14px 20px' }}>Enquiry & Sender</th>
                  <th style={{ padding: '14px 20px' }}>Category</th>
                  <th style={{ padding: '14px 20px' }}>Original Request</th>
                  <th style={{ padding: '14px 20px' }}>Admin Response Sent</th>
                  <th style={{ padding: '14px 20px' }}>Resolution Audit</th>
                  <th style={{ padding: '14px 20px' }}>Status & Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHistory().length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                      No resolved records matching active search filters.
                    </td>
                  </tr>
                ) : (
                  getFilteredHistory().map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0F3D21' }}>{row.id}</div>
                        <div style={{ fontWeight: 800, color: '#14532D', marginTop: 2 }}>{row.senderName}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{row.senderEmail}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor:
                              row.category === 'CUSTOMER'
                                ? '#D1FAE5'
                                : row.category === 'RESTAURANT'
                                ? '#FEF3C7'
                                : row.category === 'DELIVERY'
                                ? '#DBEAFE'
                                : '#F3E8FF',
                            color:
                              row.category === 'CUSTOMER'
                                ? '#047857'
                                : row.category === 'RESTAURANT'
                                ? '#B45309'
                                : row.category === 'DELIVERY'
                                ? '#1D4ED8'
                                : '#6B21A8',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 12 }}>{row.subject}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          "{row.message}"
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                        <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>{row.replyMessage || 'Resolved via phone call'}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 11, color: '#64748B' }}>{row.resolvedAt || 'Resolved'}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ backgroundColor: '#D1FAE5', color: '#047857', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, textAlign: 'center' }}>
                            RESOLVED
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReopenTicket(row.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#B45309',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Reopen Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532D', margin: 0 }}>
                Reply to {selectedEnquiry.senderName} ({selectedEnquiry.id})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              <strong>Subject:</strong> {selectedEnquiry.subject}<br />
              <strong>Recipient Email:</strong> {selectedEnquiry.senderEmail} ({selectedEnquiry.senderPhone})
            </div>

            {/* Quick Templates */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                Quick Response Templates
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => setReplyText(tmpl.text)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      color: '#1E293B',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 6 }}>
                Compose Response Message *
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                placeholder="Type your official reply message to be dispatched via email and SMS notification..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#14532D',
                  color: '#F59E0B',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Dispatch Response Now
              </button>
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
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
              borderRadius: 16,
              maxWidth: 540,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#14532D', margin: 0 }}>
                Log New Support Enquiry Ticket
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  <option value="CUSTOMER">Customer Enquiry</option>
                  <option value="RESTAURANT">Restaurant Enquiry</option>
                  <option value="DELIVERY">Delivery Partner Enquiry</option>
                  <option value="GENERAL">General Enquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                  Priority Urgency *
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  <option value="HIGH">🔥 High Urgency</option>
                  <option value="MEDIUM">⚡ Medium Urgency</option>
                  <option value="LOW">💧 Low Urgency</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                Sender Name *
              </label>
              <input
                type="text"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                  Sender Email *
                </label>
                <input
                  type="email"
                  value={newSenderEmail}
                  onChange={(e) => setNewSenderEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                  Sender Phone
                </label>
                <input
                  type="text"
                  value={newSenderPhone}
                  onChange={(e) => setNewSenderPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                Subject *
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief title of enquiry..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#14532D', display: 'block', marginBottom: 4 }}>
                Detailed Enquiry Description *
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Enter details of customer/partner inquiry..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#14532D',
                  color: '#F59E0B',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
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
