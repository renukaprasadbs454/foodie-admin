'use client';

import React, { useState } from 'react';

type LegalTab = 'TERMS' | 'PRIVACY' | 'REFUND' | 'DELIVERY' | 'COOKIE';

export function LegalPage({ initialTab = 'TERMS' }: { initialTab?: LegalTab }) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Cookie settings state
  const [essentialCookies] = useState(true);
  const [analyticsCookies, setAnalyticsCookies] = useState(true);
  const [marketingCookies, setMarketingCookies] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Legal & Compliance Governance Center
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Platform terms, privacy compliance, refund rules, delivery standards & cookie consent policies
          </p>
        </div>
      </div>

      {/* 5 Navigation Tabs */}
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
          { id: 'TERMS', label: 'Terms & Conditions' },
          { id: 'PRIVACY', label: 'Privacy Policy' },
          { id: 'REFUND', label: 'Refund & Cancellation Policy' },
          { id: 'DELIVERY', label: 'Delivery Policy' },
          { id: 'COOKIE', label: 'Cookie Policy' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as LegalTab)}
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

      {/* TAB 1: TERMS & CONDITIONS */}
      {activeTab === 'TERMS' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Master Platform Terms & Conditions
          </h2>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>1. Platform Operational Framework</h3>
              <div style={{ color: '#6B7280' }}>
                Foodie Hyperlocal operates as an intermediary marketplace connecting customers, multi-vendor food merchants, cloud kitchens, and independent delivery partners. All users agree to adhere to platform code of conduct.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>2. Merchant Agreement & Hygiene Compliance</h3>
              <div style={{ color: '#6B7280' }}>
                Restaurants and food partners agree to maintain active FSSAI licenses, update real-time item availability, and ensure food preparation adheres to strict health & safety standards.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>3. Delivery Partner Conduct & Payout Rights</h3>
              <div style={{ color: '#6B7280' }}>
                Delivery partners function as independent gig dispatchers entitled to transparent per-kilometer and surge earnings. Zero-tolerance policy applies for order tampering or unverified KYC profiles.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>4. Data Protection & Privacy Governance</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('PRIVACY')}
                  style={{
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                  }}
                >
                  View Full Privacy Policy &rarr;
                </button>
              </div>
              <div style={{ color: '#6B7280' }}>
                All user accounts, location tracking, KYC records, and transaction logs are governed under strict data confidentiality guidelines with 256-bit TLS 1.3 encryption, PCI-DSS Level 1 payment compliance, and short-lived signed S3 access.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIVACY POLICY */}
      {activeTab === 'PRIVACY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Data Protection & Privacy Policy Guidelines
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>256-Bit SSL Encryption</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                All mobile app & web traffic is encrypted using TLS 1.3 protocol. User credentials and transaction logs are stored in encrypted database clusters.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Driver KYC Confidentiality</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Delivery partner Aadhaar, Driving License, and vehicle Registration documents are stored in secure AWS S3 buckets accessible only via short-lived signed URLs.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>PCI-DSS Payment Standards</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Credit/Debit card details and UPI payment hashes are processed via PCI-DSS Level 1 certified gateway (Cashfree).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REFUND & CANCELLATION POLICY */}
      {activeTab === 'REFUND' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Customer Refund & Order Cancellation Policy
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ color: '#111827' }}>Instant Wallet Refunds</strong>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Cancellation refunds requested before kitchen food preparation starts are credited to Foodie Pay Wallet within 60 seconds.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ color: '#111827' }}>Post-Preparation Cancellations</strong>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Cancellation requests after food preparation has commenced incur a nominal 50% kitchen compensation charge.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ color: '#111827' }}>Missing or Damaged Items</strong>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Customers reporting missing items with photo proof receive pro-rata partial refunds or instant replacement vouchers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY POLICY */}
      {activeTab === 'DELIVERY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Hyperlocal Delivery Policy & Dispatch SLAs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Service Radius Limits</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Standard delivery radius is capped at 12 km from restaurant location to ensure food fresh-temperature standards.
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>On-Time SLA Guarantee</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Target delivery time is calculated dynamically based on Google Maps traffic API + 15 min kitchen preparation buffer.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COOKIE POLICY */}
      {activeTab === 'COOKIE' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Cookie Consent & Tracking Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Essential System Cookies</div>
                <input type="checkbox" checked={essentialCookies} disabled style={{ width: 18, height: 18, accentColor: '#2196F3' }} />
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Required for user authentication, session security, and cart persistence.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Analytics & Performance Cookies</div>
                <input type="checkbox" checked={analyticsCookies} onChange={(e) => setAnalyticsCookies(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2196F3' }} />
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Allows us to measure app performance, page load speed, and checkout bottlenecks.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Marketing & Promotional Cookies</div>
                <input type="checkbox" checked={marketingCookies} onChange={(e) => setMarketingCookies(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2196F3' }} />
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Used for personalized coupon recommendations and discount push messages.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
