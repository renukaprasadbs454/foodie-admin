'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'foodie-shared-web';

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
    messages: [
      {
        id: 'msg-101',
        enquiryId: 'ENQ-901',
        sender: 'customer',
        senderName: 'Ananya Sharma',
        message: 'I was debited ₹450 for a cancelled order yesterday but haven\'t received refund in my bank account.',
        timestamp: '15 mins ago',
      },
    ],
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
    messages: [
      {
        id: 'msg-201',
        enquiryId: 'ENQ-902',
        sender: 'customer',
        senderName: 'Vikram Mehta',
        message: 'The promo code states invalid even though I am placing my first order.',
        timestamp: '40 mins ago',
      },
      {
        id: 'msg-202',
        enquiryId: 'ENQ-902',
        sender: 'admin',
        senderName: 'Admin Support',
        message: 'Our tech team is validating your first order eligibility status.',
        timestamp: '25 mins ago',
      },
    ],
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
    messages: [
      {
        id: 'msg-301',
        enquiryId: 'ENQ-903',
        sender: 'customer',
        senderName: 'Rajesh Gupta (Royal Biryani)',
        message: 'We have updated our GST details and require our weekly commission payout report.',
        timestamp: '1 hour ago',
      },
    ],
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
    messages: [
      {
        id: 'msg-401',
        enquiryId: 'ENQ-904',
        sender: 'customer',
        senderName: 'Ramesh Kumar (Rider #DRV-402)',
        message: 'I completed 12 orders during rain surge hours in Indiranagar yesterday. Rain bonus ₹300 is missing.',
        timestamp: '2 hours ago',
      },
    ],
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
    messages: [
      {
        id: 'msg-501',
        enquiryId: 'ENQ-905',
        sender: 'customer',
        senderName: 'Sanjay Kapoor',
        message: 'Interested in featuring Foodie Hyperlocal Platform in our upcoming startup ecosystem report.',
        timestamp: '3 hours ago',
      },
    ],
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
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Persistence, Online Backend API sync, and live cross-app polling
  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support-tickets');
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || json;
        if (Array.isArray(dataList) && dataList.length > 0) {
          setEnquiries(dataList);
          try {
            localStorage.setItem('foodie_support_enquiries', JSON.stringify(dataList));
          } catch { }
          return;
        }
      }
    } catch (e) { }

    try {
      const res = await fetch('https://api.foodie.kwiko.org/api/v1/admin/support-tickets', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || json;
        if (Array.isArray(dataList) && dataList.length > 0) {
          setEnquiries(dataList);
          try {
            localStorage.setItem('foodie_support_enquiries', JSON.stringify(dataList));
          } catch { }
          return;
        }
      }
    } catch (e) { }

    try {
      const stored = localStorage.getItem('foodie_support_enquiries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnquiries(parsed);
        }
      } else {
        localStorage.setItem('foodie_support_enquiries', JSON.stringify(INITIAL_ENQUIRIES));
      }
    } catch { }
  };

  useEffect(() => {
    fetchTickets();
    const intervalId = setInterval(fetchTickets, 1500);

    const handleSync = () => {
      fetchTickets();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('foodie_enquiry_updated', handleSync);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('foodie_enquiry_updated', handleSync);
    };
  }, []);

  const saveEnquiriesToStorage = (newList: EnquiryRecord[], replyEnquiryId?: string, replyText?: string) => {
    setEnquiries(newList);
    try {
      localStorage.setItem('foodie_support_enquiries', JSON.stringify(newList));
      window.dispatchEvent(new Event('foodie_enquiry_updated'));
    } catch { }

    try {
      void fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', data: newList }),
      }).catch(() => { });

      if (replyEnquiryId && replyText) {
        void fetch('/api/support-tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reply', id: replyEnquiryId, replyMessage: replyText, sender: 'admin', senderName: 'Admin Support' }),
        }).catch(() => { });
      }
    } catch (e) { }
  };

  // Reply Modal State
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [selectedEnquiry?.messages?.length, selectedEnquiry?.id]);

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

    const nextEnquiries = enquiries.filter((item) => item.id !== enquiryId);
    saveEnquiriesToStorage(nextEnquiries);
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
    saveEnquiriesToStorage([reopenedRecord, ...enquiries]);

    showToast(`↺ Ticket ${enquiryId} reopened and restored to active support queue.`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !replyText.trim()) {
      alert('Please enter your response message.');
      return;
    }

    const adminMsgText = replyText.trim();
    const newReply: ChatMessage = {
      id: `MSG-${Date.now()}`,
      enquiryId: selectedEnquiry.id,
      sender: 'admin',
      senderName: 'Admin Support',
      message: adminMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedList = enquiries.map((item) => {
      if (item.id === selectedEnquiry.id) {
        const existingMsgs = item.messages && item.messages.length > 0
          ? item.messages
          : [{
            id: `msg-orig-${item.id}`,
            enquiryId: item.id,
            sender: 'customer' as const,
            senderName: item.senderName,
            message: item.message,
            timestamp: item.timestamp,
          }];

        const updatedMsgs = [...existingMsgs, newReply];

        return {
          ...item,
          replyMessage: adminMsgText,
          status: 'IN_PROGRESS' as const,
          messages: updatedMsgs,
        };
      }
      return item;
    });

    saveEnquiriesToStorage(updatedList, selectedEnquiry.id, adminMsgText);

    const updatedCurrent = updatedList.find(i => i.id === selectedEnquiry.id) || null;
    setSelectedEnquiry(updatedCurrent);
    setReplyText('');
    showToast(`✉ Response sent & delivered to ${selectedEnquiry.senderName}'s app chat!`);
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
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            border: '1px solid #38BDF8',
            padding: '14px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 12px 30px rgba(2, 132, 199, 0.3)',
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0369A1', margin: '0 0 6px 0' }}>
            Contact Us & Support Operations Desk
          </h1>
          <p style={{ fontSize: 13, color: '#0284C7', margin: 0 }}>
            Manage customer, restaurant, delivery partner & general enquiries with direct message replies and resolution tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
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
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Active Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>{enquiries.length}</div>
          <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 600, marginTop: 2 }}>{totalOpenCount} Open tickets</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Customer Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>{customerCount}</div>
          <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>User tickets & refunds</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Restaurant Enquiries</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>{restaurantCount}</div>
          <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Menu, POS & payouts</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Delivery Partners</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>{deliveryCount}</div>
          <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Incentives & KYC review</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Resolved Audit Log</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>{historyCount}</div>
          <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 600, marginTop: 2 }}>100% Audit Logged</div>
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
          border: '1px solid #BAE6FD',
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
                border: '1px solid #BAE6FD',
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#FFFFFF',
                color: '#0369A1',
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
              border: '1px solid #BAE6FD',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#0369A1',
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
              border: '1px solid #BAE6FD',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#0369A1',
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
              border: '1px solid #BAE6FD',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#0369A1',
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
              border: '1px solid #BAE6FD',
              backgroundColor: '#F0F9FF',
              color: '#0369A1',
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
          border: '1px solid #BAE6FD',
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
                background: isActive ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'transparent',
                color: isActive ? '#FFFFFF' : '#0369A1',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: isActive ? '#FFFFFF' : '#E0F2FE',
                  color: isActive ? '#0369A1' : '#0284C7',
                  border: isActive ? 'none' : '1px solid #BAE6FD',
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
                border: '1px solid #BAE6FD',
                color: '#0284C7',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>No active enquiries matching your filters</div>
              <div style={{ fontSize: 13, color: '#0284C7', marginTop: 4 }}>
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
                  border: '1px solid #BAE6FD',
                  borderLeft: '5px solid #0284C7',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#0284C7', color: '#FFFFFF', padding: '2px 6px', borderRadius: 4 }}>
                        {item.id}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0369A1' }}>{item.subject}</span>

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor: '#F0F9FF',
                          color: '#0369A1',
                          border: '1px solid #BAE6FD',
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
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            padding: '3px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {item.priority === 'HIGH' ? '🔥 HIGH URGENCY' : item.priority === 'MEDIUM' ? '⚡ MEDIUM' : 'LOW'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#0284C7', marginTop: 6 }}>
                      From: <strong style={{ color: '#0369A1' }}>{item.senderName}</strong> ({item.senderEmail} • {item.senderPhone}) | Recd: {item.timestamp}
                      {item.orderId ? <span style={{ marginLeft: 8, color: '#0369A1', fontWeight: 700 }}>• Order Ref: #{item.orderId}</span> : null}
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
                        color: '#0369A1',
                        border: '1px solid #BAE6FD',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 3px rgba(14, 165, 233, 0.1)',
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
                        background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                      }}
                    >
                      <span>✓</span>
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                </div>


              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: CONTACT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, border: '1px solid #BAE6FD', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #BAE6FD', backgroundColor: '#F0F9FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0 }}>Resolved Contact History Audit Log</h2>
              <p style={{ fontSize: 12, color: '#0284C7', margin: '2px 0 0 0' }}>Archived and resolved support enquiries with complete audit trail</p>
            </div>

            <span style={{ fontSize: 12, fontWeight: 800, backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', padding: '4px 12px', borderRadius: 20 }}>
              {getFilteredHistory().length} Resolved Tickets
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #BAE6FD', color: '#0369A1', backgroundColor: '#F0F9FF' }}>
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
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#0284C7' }}>
                      No resolved records matching active search filters.
                    </td>
                  </tr>
                ) : (
                  getFilteredHistory().map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #E0F2FE' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0369A1' }}>{row.id}</div>
                        <div style={{ fontWeight: 800, color: '#0369A1', marginTop: 2 }}>{row.senderName}</div>
                        <div style={{ fontSize: 11, color: '#0284C7' }}>{row.senderEmail}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                        <div style={{ fontWeight: 700, color: '#0369A1', fontSize: 12 }}>{row.subject}</div>
                        <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          "{row.message}"
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 240 }}>
                        <div style={{ fontSize: 12, color: '#0369A1', fontWeight: 600 }}>{row.replyMessage || 'Resolved via phone call'}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 11, color: '#0284C7' }}>{row.resolvedAt || 'Resolved'}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, textAlign: 'center' }}>
                            RESOLVED
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReopenTicket(row.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#0369A1',
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

      {/* MESSAGE REPLY MODAL - WHATSAPP-STYLE CONVERSATION UI */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
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
              maxWidth: 620,
              width: '100%',
              maxHeight: '94vh',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. WHATSAPP-STYLE HEADER (PROFESSIONAL BLUE THEME) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #12658F 0%, #168BC4 100%)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Circular Customer Avatar with Online Indicator */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.22)',
                      border: '1.5px solid rgba(255, 255, 255, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 14,
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {selectedEnquiry.senderName
                      ? selectedEnquiry.senderName.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'CU'}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 11,
                      height: 11,
                      backgroundColor: '#25D366',
                      border: '2px solid #12658F',
                      borderRadius: '50%',
                    }}
                    title="Online"
                  />
                </div>

                {/* Title & Customer Status */}
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: 0,
                      lineHeight: 1.25,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Reply to Customer ({selectedEnquiry.id})
                  </h3>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{selectedEnquiry.senderName}</span>
                    <span>•</span>
                    <span style={{ color: '#BAE6FD', fontWeight: 600 }}>online • active enquiry</span>
                  </div>
                </div>
              </div>

              {/* Close (X) Button */}
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: '#FFFFFF',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.32)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* 2. CUSTOMER / ORDER INFORMATION */}
            <div
              style={{
                backgroundColor: '#F5FBFE',
                borderBottom: '1px solid #E2E8F0',
                padding: '9px 18px',
                fontSize: 12,
                lineHeight: 1.45,
                color: '#334155',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <strong style={{ color: '#12658F' }}>Subject:</strong>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedEnquiry.subject}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 16,
                  rowGap: 4,
                  marginTop: 3,
                }}
              >
                <div>
                  <strong style={{ color: '#12658F' }}>Recipient Email:</strong>{' '}
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>
                    {selectedEnquiry.senderEmail} {selectedEnquiry.senderPhone ? `(${selectedEnquiry.senderPhone})` : ''}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#12658F' }}>Order ID:</strong>{' '}
                  <span
                    style={{
                      color: '#12658F',
                      fontWeight: 700,
                      backgroundColor: '#EAF7FC',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #BAE6FD',
                    }}
                  >
                    {selectedEnquiry.orderId
                      ? `#${selectedEnquiry.orderId.replace(/^#/, '')}`
                      : (selectedEnquiry.subject.match(/#([A-Za-z0-9-]+)/)?.[0] || 'ORD-9821')}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. CONVERSATION HISTORY (WHATSAPP-STYLE CHAT BUBBLES IN CLEAN BLUE/NEUTRAL THEME) */}
            <div
              ref={chatScrollRef}
              style={{
                flex: '1 1 auto',
                minHeight: 200,
                maxHeight: 280,
                overflowY: 'auto',
                backgroundColor: '#F5FBFE',
                backgroundImage: 'radial-gradient(#CBD5E1 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* WhatsApp-style Centered Date/History Badge */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 6px 0' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    color: '#12658F',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 12px',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(18, 101, 143, 0.08)',
                    border: '1px solid #E0F2FE',
                    letterSpacing: '0.04em',
                  }}
                >
                  Conversation History ({(selectedEnquiry.messages && selectedEnquiry.messages.length) || 1}{' '}
                  {((selectedEnquiry.messages && selectedEnquiry.messages.length) || 1) === 1 ? 'Message' : 'Messages'})
                </span>
              </div>

              {(selectedEnquiry.messages && selectedEnquiry.messages.length > 0
                ? selectedEnquiry.messages.filter(
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
                      backgroundColor: isAdmin ? '#EAF7FC' : '#FFFFFF',
                      color: '#0F172A',
                      padding: '8px 12px',
                      borderRadius: 10,
                      borderTopRightRadius: isAdmin ? 2 : 10,
                      borderTopLeftRadius: isAdmin ? 10 : 2,
                      border: isAdmin ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                      position: 'relative',
                    }}
                  >
                    {/* Sender Name */}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isAdmin ? '#0369A1' : '#12658F',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{isAdmin ? 'You (Admin Support)' : msg.senderName || selectedEnquiry.senderName}</span>
                    </div>

                    {/* Chat Message Content */}
                    <div
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        color: '#0F172A',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.message}
                    </div>

                    {/* Timestamp & Read Receipts */}
                    <div
                      style={{
                        fontSize: 10.5,
                        color: '#64748B',
                        textAlign: 'right',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      <span>{msg.timestamp || '15 mins ago'}</span>
                      {isAdmin && (
                        <span
                          style={{
                            color: '#0284C7',
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: '-1px',
                          }}
                          title="Delivered & Read"
                        >
                          ✓✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. QUICK RESPONSE TEMPLATES (COMPACT ROUNDED BLUE CHIPS) */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                padding: '9px 18px 6px 18px',
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
                    fontWeight: 700,
                    color: '#12658F',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#168BC4' }}>⚡</span> Quick Response Templates
                </label>
                <span style={{ fontSize: 10.5, color: '#64748B' }}>Click template to insert</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => setReplyText(tmpl.text)}
                    style={{
                      padding: '4px 11px',
                      borderRadius: 16,
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#FFFFFF',
                      color: '#12658F',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(22, 139, 196, 0.06)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EAF7FC';
                      e.currentTarget.style.borderColor = '#168BC4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#BAE6FD';
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#168BC4' }}>+</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. WHATSAPP-STYLE MESSAGE COMPOSER (BLUE ACCENT) */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                padding: '8px 18px 14px 18px',
                flexShrink: 0,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#12658F',
                  display: 'block',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Compose Response Message *
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Optional Attachment Icon */}
                <button
                  type="button"
                  title="Attachment"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid #BAE6FD',
                    backgroundColor: '#FFFFFF',
                    color: '#168BC4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(22, 139, 196, 0.06)',
                  }}
                  onClick={() => {
                    // Non-intrusive cosmetic trigger
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* Rounded Message Input Box */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    border: '1px solid #BAE6FD',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 1px 2px rgba(22, 139, 196, 0.05)',
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
                    placeholder="Type your official reply message to be dispatched via email and SMS notification..."
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: '#0F172A',
                      fontSize: 13,
                      lineHeight: 1.4,
                      resize: 'none',
                      fontFamily: 'inherit',
                      padding: 0,
                    }}
                    required
                  />
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    border: '1px solid #BAE6FD',
                    borderRadius: 20,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F0F9FF';
                    e.currentTarget.style.color = '#12658F';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  Cancel
                </button>

                {/* WhatsApp-Styled Blue Send / Dispatch Button */}
                <button
                  type="submit"
                  title="Dispatch Response Now"
                  aria-label="Dispatch Response Now"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    background: 'linear-gradient(135deg, #168BC4 0%, #12658F 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 139, 196, 0.35)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 139, 196, 0.48)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 139, 196, 0.35)';
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  <span>Dispatch Response Now</span>
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
            backgroundColor: 'rgba(8, 47, 73, 0.5)',
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
              boxShadow: '0 20px 40px rgba(14, 165, 233, 0.2)',
              border: '1px solid #BAE6FD',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0 }}>
                Log New Support Enquiry Ticket
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#0284C7' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                >
                  <option value="CUSTOMER">Customer Enquiry</option>
                  <option value="RESTAURANT">Restaurant Enquiry</option>
                  <option value="DELIVERY">Delivery Partner Enquiry</option>
                  <option value="GENERAL">General Enquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                  Priority Urgency *
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                >
                  <option value="HIGH">🔥 High Urgency</option>
                  <option value="MEDIUM">⚡ Medium Urgency</option>
                  <option value="LOW">💧 Low Urgency</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                Sender Name *
              </label>
              <input
                type="text"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                  Sender Email *
                </label>
                <input
                  type="email"
                  value={newSenderEmail}
                  onChange={(e) => setNewSenderEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                  Sender Phone
                </label>
                <input
                  type="text"
                  value={newSenderPhone}
                  onChange={(e) => setNewSenderPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                Subject *
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief title of enquiry..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: 4 }}>
                Detailed Enquiry Description *
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Enter details of customer/partner inquiry..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, resize: 'vertical', backgroundColor: '#F0F9FF', color: '#0369A1', outline: 'none' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F0F9FF',
                  color: '#0369A1',
                  border: '1px solid #BAE6FD',
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
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
