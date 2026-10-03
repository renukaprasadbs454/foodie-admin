'use client';

import React, { useState } from 'react';

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'CUSTOMERS' | 'RESTAURANTS' | 'DELIVERY_PARTNERS';
  sentTime: string;
  recipientsCount: number;
  deliveryRate: string;
  openRate: string;
  status: 'DELIVERED' | 'SCHEDULED' | 'FAILED';
}

const MOCK_NOTIFICATIONS_HISTORY: NotificationRecord[] = [
  {
    id: 'notif-101',
    title: 'Welcome Bonus Voucher Credited!',
    body: 'Flat ₹100 discount applied on your first order with code WELCOME100.',
    audience: 'CUSTOMERS',
    sentTime: '10 mins ago',
    recipientsCount: 14800,
    deliveryRate: '99.4%',
    openRate: '42.8%',
    status: 'DELIVERED',
  },
  {
    id: 'notif-102',
    title: 'Peak Rain Surge Bonus ACTIVE (+₹25)',
    body: 'Earn ₹25 additional payout per completed delivery in Indiranagar zone.',
    audience: 'DELIVERY_PARTNERS',
    sentTime: '25 mins ago',
    recipientsCount: 450,
    deliveryRate: '98.8%',
    openRate: '88.2%',
    status: 'DELIVERED',
  },
  {
    id: 'notif-103',
    title: 'Diwali Feast & Culinary Gala 2025',
    body: 'Join platform campaign and boost your store visibility by up to 60%.',
    audience: 'RESTAURANTS',
    sentTime: '2 hours ago',
    recipientsCount: 180,
    deliveryRate: '100%',
    openRate: '76.4%',
    status: 'DELIVERED',
  },
  {
    id: 'notif-104',
    title: 'Monsoon Hot Chai & Bakery Bonanza',
    body: 'Get Flat 30% OFF on all bakery & cafes near you!',
    audience: 'ALL',
    sentTime: '1 day ago',
    recipientsCount: 22500,
    deliveryRate: '99.1%',
    openRate: '38.5%',
    status: 'DELIVERED',
  },
];

type NotificationTab = 'SEND' | 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'HISTORY';

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTab>('SEND');

  // Form State for Send Notifications
  const [audience, setAudience] = useState<'ALL' | 'CUSTOMERS' | 'RESTAURANTS' | 'DELIVERY_PARTNERS'>('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deeplink, setDeeplink] = useState('/coupons');
  const [scheduledTime, setScheduledTime] = useState('IMMEDIATE');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [history, setHistory] = useState<NotificationRecord[]>(MOCK_NOTIFICATIONS_HISTORY);

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      alert('Please enter Notification Title and Message Content');
      return;
    }

    const newRecord: NotificationRecord = {
      id: `notif-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      body: body.trim(),
      audience,
      sentTime: 'Just now',
      recipientsCount: audience === 'ALL' ? 25000 : audience === 'CUSTOMERS' ? 18000 : audience === 'RESTAURANTS' ? 350 : 650,
      deliveryRate: '99.5%',
      openRate: '0.0%',
      status: 'DELIVERED',
    };

    setHistory((prev) => [newRecord, ...prev]);
    setTitle('');
    setBody('');
    setToastMsg(`Broadcast notification "${newRecord.title}" sent to ${audience}!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

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
            padding: '12px 24px',
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
            zIndex: 9999,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Platform Notifications Center
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Send push notifications, monitor customer & store alerts, dispatch delivery driver updates & review history
          </p>
        </div>
      </div>

      {/* 5 Outer Visible Navigation Tabs */}
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
          { id: 'SEND', label: 'Send Notifications' },
          { id: 'CUSTOMER', label: 'Customer Notifications' },
          { id: 'RESTAURANT', label: 'Restaurant Notifications' },
          { id: 'DELIVERY', label: 'Delivery Partner Notifications' },
          { id: 'HISTORY', label: 'Notification History' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as NotificationTab)}
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
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 14px rgba(33, 150, 243, 0.25)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SEND NOTIFICATIONS */}
      {activeTab === 'SEND' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Compose Form */}
          <form
            onSubmit={handleSendNotification}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              Compose Broadcast Push Notification
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Target Audience *</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Platform Users (Broadcast)</option>
                <option value="CUSTOMERS">Customer Apps Only</option>
                <option value="RESTAURANTS">Restaurant Partner Dashboards</option>
                <option value="DELIVERY_PARTNERS">Delivery Driver Fleet</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Notification Title *</label>
              <input
                type="text"
                placeholder="e.g. 50% OFF Weekend Super Deal!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Message Content *</label>
              <textarea
                placeholder="e.g. Order now from top rated pizzerias & get instant cashback in your wallet."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', resize: 'vertical', color: '#111827', backgroundColor: '#FFFFFF', fontFamily: 'inherit' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Action URL / Deep Link</label>
                <input
                  type="text"
                  placeholder="e.g. /coupons"
                  value={deeplink}
                  onChange={(e) => setDeeplink(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Schedule Time</label>
                <select
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                >
                  <option value="IMMEDIATE">Send Immediately</option>
                  <option value="IN_1_HOUR">In 1 Hour</option>
                  <option value="TONIGHT_8PM">Tonight at 8:00 PM</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
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
                boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
              }}
            >
              Send Broadcast Notification Now
            </button>
          </form>

          {/* Live Mobile & Desktop Preview Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Live User Notification Preview
            </h3>

            {/* Mobile Push Notification Mock Bubble */}
            <div style={{ backgroundColor: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB', padding: '18px 20px', maxWidth: 420 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2196F3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FOODIE MARKETPLACE</span>
                </div>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>now</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                {title || 'Your Push Notification Title'}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>
                {body || 'Notification message content preview will appear here on customer mobile devices.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER NOTIFICATIONS */}
      {activeTab === 'CUSTOMER' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Customer Push Broadcast Alerts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[
              { title: 'Welcome Bonus Voucher Credited!', time: '10 mins ago', desc: 'Flat ₹100 discount applied on your first order with code WELCOME100.', stats: '14,800 sent • 99.4% delivered' },
              { title: 'Order #ORD-9821 Out For Delivery', time: '30 mins ago', desc: 'Ramesh Kumar has picked up your order from Royal Biryani House.', stats: 'Personalized Alert' },
              { title: 'Monsoon Flash Sale LIVE', time: '2 hours ago', desc: 'Get Flat 30% OFF on all hot beverages & bakeries.', stats: '22,500 sent • 38.5% opened' },
            ].map((card, idx) => (
              <div key={idx} style={{ backgroundColor: '#F9FAFB', padding: 18, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{card.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>{card.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', marginTop: 10 }}>{card.stats}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANT NOTIFICATIONS */}
      {activeTab === 'RESTAURANT' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Restaurant Partner Portal Alerts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[
              { title: 'New Express Order #ORD-9824', time: '5 mins ago', desc: 'Punjab Grill received a new order for 2x Paneer Tikka.', stats: 'Instant Portal Sound Alert' },
              { title: 'Weekly Payout Deposited', time: '1 day ago', desc: '₹48,250 net earnings transferred to HDFC Bank A/C ****9812.', stats: '350 merchants notified' },
              { title: 'FSSAI License Renewal Alert', time: '2 days ago', desc: 'Please update your FSSAI food safety certificate before expiry.', stats: 'Compliance Alert' },
            ].map((card, idx) => (
              <div key={idx} style={{ backgroundColor: '#F9FAFB', padding: 18, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{card.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>{card.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', marginTop: 10 }}>{card.stats}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY PARTNER NOTIFICATIONS */}
      {activeTab === 'DELIVERY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Delivery Fleet Dispatch Alerts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[
              { title: 'Rain Surge Bonus ACTIVE (+₹25)', time: '15 mins ago', desc: 'Earn ₹25 extra per delivery in Indiranagar & Koramangala zones.', stats: '450 drivers active' },
              { title: 'New Delivery Assignment Nearby', time: '45 mins ago', desc: 'Pickup assigned at Bella Italia Pizzeria (1.2 km away).', stats: 'Driver App Push' },
              { title: 'Document Verification Complete', time: '1 day ago', desc: 'Driving License DL-9823 verified by Admin console.', stats: 'KYC Confirmation' },
            ].map((card, idx) => (
              <div key={idx} style={{ backgroundColor: '#F9FAFB', padding: 18, borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{card.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>{card.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', marginTop: 10 }}>{card.stats}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFICATION HISTORY */}
      {activeTab === 'HISTORY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Notification Dispatch History Logs</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title & Message</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Audience</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sent Time</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipients</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Rate</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Rate</th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{row.body}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 8px', borderRadius: 9999 }}>
                      {row.audience}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12 }}>{row.sentTime}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{row.recipientsCount.toLocaleString()}</td>
                  <td style={{ padding: '16px 20px', color: '#22C55E', fontWeight: 600 }}>{row.deliveryRate}</td>
                  <td style={{ padding: '16px 20px', color: '#2196F3', fontWeight: 600 }}>{row.openRate}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 9999 }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
