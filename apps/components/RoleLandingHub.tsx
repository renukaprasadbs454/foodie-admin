'use client';

import React from 'react';
import Link from 'next/link';
import { usePermissions } from '@/context/PermissionContext';
import { useAppSelector } from '@/store/hooks';
import { selectAdminRole } from '@/features/auth/authSlice';

export function RoleLandingHub() {
  const { profile } = usePermissions();
  const reduxRole = useAppSelector(selectAdminRole);

  const activeRole = profile?.role || reduxRole;
  if (!activeRole) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ------------------ ROLE SPECIFIC HOME SECTIONS ------------------ */}

      {/* 1. SUPER_ADMIN LANDING SECTION */}
      {(activeRole === 'SUPER_ADMIN' || activeRole === 'SUPER_ADMIN') && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Super Admin Control & Role Management Center
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Full system administration, user role assignment, permission configuration, and high-risk action overrides.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/roles"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                Manage Roles & Permissions →
              </Link>
              <Link
                href="/users"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Provision Admin Users
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, paddingTop: 8 }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>SYSTEM ROLES</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>6 Configured</div>
              <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Super, Finance, Ops, Manager, Support, Auditor</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>GRANULAR PERMISSIONS</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>28+ Enforced</div>
              <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Strict backend security & SpEL guards</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>HIGH-RISK APPROVALS</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>2-Step Workflow</div>
              <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Settlement release & ledger adjustments</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>AUDIT TELEMETRY</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0369A1' }}>Append-Only</div>
              <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Immutable compliance logging</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FINANCE_ADMIN LANDING SECTION */}
      {(activeRole === 'FINANCE_ADMIN' || activeRole === 'FINANCE') && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Finance & Payments Administration Hub
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Manage payment settlements, merchant payouts, refund processing, commission rates, and financial reconciliation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/payments"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                Settlements & Payouts →
              </Link>
              <Link
                href="/approvals"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Pending Approvals 
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>ESCROW SETTLEMENTS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>₹ 14,850.00</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Pending Release</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>COMMISSION REVENUE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>15% Standard</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Configurable Rules</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>REFUND DISPATCH</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>Razorpay Sync</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Approved Requests Only</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. OPERATIONS_ADMIN LANDING SECTION */}
      {(activeRole === 'OPERATIONS_ADMIN' || activeRole === 'OPS') && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Operations, Location & Logistics Console
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Operate city polygon zones, driver assignments, live order pipeline override, and merchant onboarding.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/location"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                Location Management 
              </Link>
              <Link
                href="/delivery-partners"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Delivery Partners 
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>ACTIVE DRIVERS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>28 Online</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>GPS Tracked</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>OPERATING ZONES</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>2 Active</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Indiranagar & Koramangala</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>RESTAURANTS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>42 Active</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Approve & Suspend Enabled</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RESTAURANT_MANAGER LANDING SECTION */}
      {activeRole === 'RESTAURANT_MANAGER' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Restaurant Manager Portal (Scoped to Your Outlet)
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Manage live orders, menu item availability, settlement statements, and customer reviews.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/orders"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                View Kitchen Orders 
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>KITCHEN ORDERS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>8 Active</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>Preparing & Ready</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>TODAY&apos;S NET EARNINGS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>₹ 4,820.00</div>
              <div style={{ fontSize: 11, color: '#0284C7' }}>After Platform Commission</div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUPPORT_AGENT LANDING SECTION */}
      {(activeRole === 'SUPPORT_AGENT' || activeRole === 'SUPPORT') && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Customer Support & Order Resolution Console
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Lookup customer orders, view payment status, and initiate refund requests for manager approval.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/orders"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                Customer Orders 
              </Link>
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: 13, color: '#0369A1' }}>
            <strong>Support Agent Safety Scope:</strong> Direct settlement release, ledger adjustments, and commission rule updates are disabled. Refund requests require 2-step Finance approval.
          </div>
        </div>
      )}

      {/* 6. AUDITOR LANDING SECTION */}
      {activeRole === 'AUDITOR' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            border: '1px solid #BAE6FD',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Auditor Read-Only Compliance Console
              </h2>
              <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0 0' }}>
                Read-only access to audit logs, financial telemetry, settlement ledgers, and system mutation records.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/audit-log"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                }}
              >
                View Audit Log 
              </Link>
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 10, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: 13, color: '#0369A1' }}>
            <strong>Read-Only Compliance Mode:</strong> Mutation buttons, release controls, and rule editing actions are strictly hidden and disabled on the backend.
          </div>
        </div>
      )}
    </div>
  );
}
