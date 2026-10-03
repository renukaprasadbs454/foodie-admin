'use client';

import React from 'react';
import Link from 'next/link';

export default function MembersHubPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
          Platform Members & Stakeholder Management
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Centralized management studio for all Foodie platform members: Admin Staff, Customers, Merchants, and Deliverymen.
        </p>
      </div>

      {/* Member Management Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {/* Card 1: Users (Admin & Staff Users) */}
        <Link
          href="/users"
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2196F3' }}>STAFF & ADMIN</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 10px', borderRadius: 9999 }}>
              CORE
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Platform Users & Staff
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Provision administrative staff accounts, assign system roles (Super Admin, Ops, Finance, Support), and edit privileges.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2196F3' }}>
              Provision • Role Privileges • Directory
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>

        {/* Card 2: Customers */}
        <Link
          href="/customers"
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>CONSUMERS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 9999 }}>
              USERS
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Customers Operations
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Manage end-user customer profiles, review lifetime spend (LTV), process support tickets, and manage account blocks.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Directory • Support Desk • Block Controls
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>

        {/* Card 3: Restaurants */}
        <Link
          href="/restaurants"
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>MERCHANTS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: 9999 }}>
              PARTNERS
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Restaurants & Outlets
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Onboard food vendors, approve restaurant applications, set commission rates, and manage outlet statuses.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Onboarding • Commission • Approval
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>

        {/* Card 4: Delivery Partners */}
        <Link
          href="/delivery-partners"
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>LOGISTICS</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: 9999 }}>
              FLEET
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
              Delivery Partners
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              Verify driver identity and KYC documents, approve delivery partners, and track fleet availability.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              KYC Verification • Fleet Status
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>&rarr;</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
