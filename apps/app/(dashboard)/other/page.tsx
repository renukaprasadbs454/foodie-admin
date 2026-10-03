'use client';

import React from 'react';
import Link from 'next/link';

export default function OtherBusinessPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
          Other Business Services & Auxiliary Operations
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Manage location boundaries, operating zones, delivery charges, auxiliary business services & regional settings
        </p>
      </div>

      {/* Grid of Other Business Services */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {/* Card 1: Location Management */}
        <Link
          href="/location"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #2196F3',
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.1)',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2196F3' }}>GEO-OPERATIONS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 10px', borderRadius: 9999 }}>
              PRIMARY FEATURE
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Location Management
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Configure operating cities, service area coverage, delivery polygon zones, distance-based charges & radius parameters.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2196F3' }}>
              Cities • Service Areas • Zones • Charges • Radius
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>

        {/* Card 2: Social Media Management */}
        <Link
          href="/social-media"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>CHANNELS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: 9999 }}>
              FEATURED
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Social Media
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Manage platform social media links (Pinterest, LinkedIn, Facebook, Instagram, YouTube, etc.) and active display status.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Links • URLs • Active Status • Channel Setup
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>

        {/* Card 3: Regional Delivery Rules */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>LOGISTICS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 9999 }}>
              POLICIES
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Regional Delivery Rules
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Set up state-level delivery dispatch policies, weather contingency multipliers & driver payout guarantees.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Configured under Location & Settings
            </span>
          </div>
        </div>

        {/* Card 4: Merchant Onboarding Limits */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>MERCHANT OPS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 9999 }}>
              CAPACITY
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Zone Merchant Limits
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Manage outlet density caps per delivery zone and regulate merchant registration thresholds per pincode.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Integrated with Restaurants & Location
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
