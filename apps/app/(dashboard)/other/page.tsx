'use client';

import React from 'react';
import Link from 'next/link';

export default function OtherBusinessPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0C4A6E', margin: '0 0 6px 0' }}>
          🌐 Other Business Services & Auxiliary Operations
        </h1>
        <p style={{ fontSize: 13, color: '#0369A1', margin: 0 }}>
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
            borderRadius: 16,
            padding: 24,
            border: '1.5px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.1)',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>📍</span>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#E0F2FE', color: '#0284C7', padding: '3px 8px', borderRadius: 6 }}>
              PRIMARY FEATURE
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C4A6E', margin: '0 0 6px 0' }}>
              Location Management
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Configure operating cities, service area coverage, delivery polygon zones, distance-based charges & radius parameters.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F0F9FF', paddingTop: 12, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
              Cities • Service Areas • Zones • Charges • Radius
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0284C7' }}>→</span>
          </div>
        </Link>

        {/* Card 2: Social Media Management */}
        <Link
          href="/settings?tab=social-media"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1.5px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.1)',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>📱</span>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#E0F2FE', color: '#0369A1', padding: '3px 8px', borderRadius: 6 }}>
              FEATURED
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C4A6E', margin: '0 0 6px 0' }}>
              Social Media Studio
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Manage platform social media links (Pinterest, LinkedIn, Facebook, Instagram, YouTube, etc.) and active display status.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F0F9FF', paddingTop: 12, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
              Links • URLs • Active Status • Channel Setup
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0284C7' }}>→</span>
          </div>
        </Link>

        {/* Card 3: Regional Delivery Rules */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>🚚</span>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: 6 }}>
              LOGISTICS
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C4A6E', margin: '0 0 6px 0' }}>
              Regional Delivery Rules
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Set up state-level delivery dispatch policies, weather contingency multipliers & driver payout guarantees.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F0F9FF', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
              Configured under Location & Settings
            </span>
          </div>
        </div>

        {/* Card 4: Merchant Onboarding Limits */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>🏬</span>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#E0F2FE', color: '#0284C7', padding: '3px 8px', borderRadius: 6 }}>
              MERCHANT OPS
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C4A6E', margin: '0 0 6px 0' }}>
              Zone Merchant Limits
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Manage outlet density caps per delivery zone and regulate merchant registration thresholds per pincode.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F0F9FF', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
              Integrated with Restaurants & Location
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

