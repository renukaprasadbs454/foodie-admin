'use client';

import React, { useState } from 'react';
import { HasPermission } from '@/components/HasPermission';

export interface SystemRole {
  id: string;
  name: string;
  label: string;
  description: string;
  status: 'ACTIVE' | 'DISABLED';
  userCount: number;
  permissionCount: number;
  createdAt: string;
  isSystem: boolean;
}

export interface PermissionMatrixCell {
  resource: string;
  action: string;
  roles: Record<string, boolean>; // e.g. { FINANCE_ADMIN: true, OPERATIONS_ADMIN: false }
}

export interface TemporaryPermission {
  id: string;
  userEmail: string;
  roleName: string;
  resource: string;
  action: string;
  grantedBy: string;
  startDate: string;
  expiryDate: string;
  reason: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface PermissionAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  roleName: string;
  actionType: 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED' | 'ROLE_CREATED' | 'STATUS_CHANGED';
  resource: string;
  action: string;
  previousValue: string;
  newValue: string;
  reason: string;
}

type RbacTab = 'ROLES' | 'MATRIX' | 'EFFECTIVE' | 'TEMPORARY' | 'HISTORY';

// 9 Resource Modules
const RESOURCE_MODULES = [
  { id: 'USERS', label: 'Users', desc: 'Admin staff accounts, roles & permissions' },
  { id: 'RESTAURANTS', label: 'Restaurants', desc: 'Vendor onboarding, menus, commission & outlets' },
  { id: 'ORDERS', label: 'Orders', desc: 'Order lifecycle, cancellations, status & reports' },
  { id: 'FINANCE', label: 'Finance', desc: 'Payments, settlements, payouts, invoices & refunds' },
  { id: 'OPERATIONS', label: 'Operations', desc: 'Delivery partners, dispatch fleet & regional rules' },
  { id: 'DARKSTORE', label: 'Darkstore', desc: 'Quick-commerce inventory, picking, packing & dispatch' },
  { id: 'SUPPORT', label: 'Support Desk', desc: 'Customer tickets, complaints & live tracking' },
  { id: 'COMPLIANCE', label: 'Compliance', desc: 'Audit logs, business records & compliance reports' },
  { id: 'SYSTEM', label: 'System', desc: 'Roles, global settings & system audit trail' },
];

// Standard CRUD & Business Actions
const STANDARD_ACTIONS = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
  'REJECT',
  'CANCEL',
  'REFUND',
  'ASSIGN',
  'EXPORT',
  'MANAGE',
];

const INITIAL_ROLES: SystemRole[] = [
  {
    id: '11111111-1111-1111-1111-111111111001',
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full root platform control across all modules & settings',
    status: 'ACTIVE',
    userCount: 2,
    permissionCount: 45,
    createdAt: '2025-01-01',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111005',
    name: 'FINANCE_ADMIN',
    label: 'Finance Admin',
    description: 'Financial transactions, payments, settlements, invoices & refunds',
    status: 'ACTIVE',
    userCount: 4,
    permissionCount: 24,
    createdAt: '2025-01-10',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111006',
    name: 'OPERATIONS_ADMIN',
    label: 'Operations Admin',
    description: 'Logistics, delivery partners, restaurants, location zones & orders',
    status: 'ACTIVE',
    userCount: 6,
    permissionCount: 18,
    createdAt: '2025-01-15',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111007',
    name: 'RESTAURANT_MANAGER',
    label: 'Restaurant Manager',
    description: 'Single outlet management, menus, kitchen orders & reviews',
    status: 'ACTIVE',
    userCount: 15,
    permissionCount: 9,
    createdAt: '2025-02-01',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111008',
    name: 'SUPPORT_AGENT',
    label: 'Support Agent',
    description: 'Customer ticket resolution, order issues, complaints & live tracker',
    status: 'ACTIVE',
    userCount: 8,
    permissionCount: 6,
    createdAt: '2025-02-10',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111009',
    name: 'AUDITOR',
    label: 'Compliance Auditor',
    description: 'Read-only access to audit logs, compliance records & reports',
    status: 'ACTIVE',
    userCount: 3,
    permissionCount: 10,
    createdAt: '2025-03-01',
    isSystem: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111010',
    name: 'DARKSTORE_ADMIN',
    label: 'Darkstore Admin',
    description: 'Quick-commerce darkstore picking, packing, inventory & dispatch',
    status: 'ACTIVE',
    userCount: 5,
    permissionCount: 12,
    createdAt: '2025-04-15',
    isSystem: true,
  },
];

// Seed Matrix Mapping
const INITIAL_MATRIX_STATE: Record<string, Record<string, boolean>> = {
  // Format: 'RESOURCE:ACTION' -> { ROLE_NAME: boolean }
  'USERS:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'USERS:MANAGE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'RESTAURANTS:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: true, SUPPORT_AGENT: true, AUDITOR: true, DARKSTORE_ADMIN: false },
  'RESTAURANTS:EDIT': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: true, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'RESTAURANTS:APPROVE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'ORDERS:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: true, SUPPORT_AGENT: true, AUDITOR: true, DARKSTORE_ADMIN: true },
  'ORDERS:CANCEL': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: true, SUPPORT_AGENT: true, AUDITOR: false, DARKSTORE_ADMIN: true },
  'ORDERS:REFUND': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'FINANCE:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: true, DARKSTORE_ADMIN: false },
  'FINANCE:APPROVE': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'OPERATIONS:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: true, DARKSTORE_ADMIN: false },
  'OPERATIONS:MANAGE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
  'DARKSTORE:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: true },
  'DARKSTORE:MANAGE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: true },
  'SUPPORT:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: true, RESTAURANT_MANAGER: false, SUPPORT_AGENT: true, AUDITOR: false, DARKSTORE_ADMIN: false },
  'SUPPORT:MANAGE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: true, AUDITOR: false, DARKSTORE_ADMIN: false },
  'COMPLIANCE:VIEW': { SUPER_ADMIN: true, FINANCE_ADMIN: true, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: true, DARKSTORE_ADMIN: false },
  'SYSTEM:MANAGE': { SUPER_ADMIN: true, FINANCE_ADMIN: false, OPERATIONS_ADMIN: false, RESTAURANT_MANAGER: false, SUPPORT_AGENT: false, AUDITOR: false, DARKSTORE_ADMIN: false },
};

const SAMPLE_USERS = [
  { email: 'admin@foodie.local', name: 'Super Admin', role: 'SUPER_ADMIN', scope: 'Global / Root' },
  { email: 'Financeadmin@foodie.local', name: 'Finance Admin', role: 'FINANCE_ADMIN', scope: 'Corporate Financials' },
  { email: 'opsadmin@foodie.local', name: 'Operations Admin', role: 'OPERATIONS_ADMIN', scope: 'Regional Logistics' },
  { email: 'manager@foodie.local', name: 'Restaurant Manager', role: 'RESTAURANT_MANAGER', scope: 'Restaurant ID: b7c2a110 (Royal Biryani)' },
  { email: 'support@foodie.local', name: 'Support Agent', role: 'SUPPORT_AGENT', scope: 'Customer Desk' },
  { email: 'auditor@foodie.local', name: 'Compliance Auditor', role: 'AUDITOR', scope: 'Read-only Audit Log' },
  { email: 'darkstore@foodie.local', name: 'Darkstore Admin', role: 'DARKSTORE_ADMIN', scope: 'Darkstore ID: ds-blr-01' },
];

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState<RbacTab>('ROLES');

  // Roles State
  const [roles, setRoles] = useState<SystemRole[]>(INITIAL_ROLES);
  const [isCreateRoleModal, setIsCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Matrix State
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, boolean>>>(INITIAL_MATRIX_STATE);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');

  // Effective Permissions State
  const [selectedUserEmail, setSelectedUserEmail] = useState('Financeadmin@foodie.local');

  // Temporary Permissions State
  const [tempPermissions, setTempPermissions] = useState<TemporaryPermission[]>([
    {
      id: 'tp-201',
      userEmail: 'Financeadmin@foodie.local',
      roleName: 'FINANCE_ADMIN',
      resource: 'OPERATIONS',
      action: 'EXPORT',
      grantedBy: 'admin@foodie.local',
      startDate: '2026-08-20',
      expiryDate: '2026-08-30',
      reason: 'Q3 Operations Audit & Financial Reconciliation',
      status: 'ACTIVE',
    },
  ]);
  const [isGrantTempModal, setIsGrantTempModal] = useState(false);
  const [grantUserEmail, setGrantUserEmail] = useState('Financeadmin@foodie.local');
  const [grantModule, setGrantModule] = useState('OPERATIONS');
  const [grantAction, setGrantAction] = useState('EXPORT');
  const [grantExpiry, setGrantExpiry] = useState('2026-08-30');
  const [grantReason, setGrantReason] = useState('');

  // Audit History Log State
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([
    {
      id: 'hist-101',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      actor: 'Super Admin (admin@foodie.local)',
      roleName: 'FINANCE_ADMIN',
      actionType: 'PERMISSION_GRANTED',
      resource: 'OPERATIONS',
      action: 'EXPORT',
      previousValue: 'DENIED',
      newValue: 'ALLOWED',
      reason: 'Temporary Q3 reporting grant',
    },
    {
      id: 'hist-102',
      timestamp: '2026-08-26 16:45',
      actor: 'Super Admin (admin@foodie.local)',
      roleName: 'DARKSTORE_ADMIN',
      actionType: 'PERMISSION_GRANTED',
      resource: 'DARKSTORE',
      action: 'DISPATCH',
      previousValue: 'DENIED',
      newValue: 'ALLOWED',
      reason: 'Enable rider gate dispatch power',
    },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Toggle Matrix Cell Checkbox
  const handleToggleMatrixCell = (resource: string, action: string, roleName: string) => {
    if (roleName === 'SUPER_ADMIN') {
      showToast('SUPER_ADMIN maintains immutable root permissions across all modules.');
      return;
    }

    const key = `${resource}:${action}`;
    setMatrixState((prev) => {
      const currentCell = prev[key] || {};
      const currentVal = !!currentCell[roleName];
      const newVal = !currentVal;

      // Audit Log Record
      const newLog: PermissionAuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actor: 'Super Admin (admin@foodie.local)',
        roleName,
        actionType: newVal ? 'PERMISSION_GRANTED' : 'PERMISSION_REVOKED',
        resource,
        action,
        previousValue: currentVal ? 'ALLOWED' : 'DENIED',
        newValue: newVal ? 'ALLOWED' : 'DENIED',
        reason: `Super Admin manually ${newVal ? 'granted' : 'revoked'} ${resource}:${action}`,
      };
      setAuditLogs((logs) => [newLog, ...logs]);

      return {
        ...prev,
        [key]: {
          ...currentCell,
          [roleName]: newVal,
        },
      };
    });

    showToast(`Updated permission ${resource}:${action} for ${roleName}!`);
  };

  // Create Custom Role
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const formattedName = newRoleName.toUpperCase().replace(/\s+/g, '_');
    const newRole: SystemRole = {
      id: `role-${Date.now()}`,
      name: formattedName,
      label: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom administrative role',
      status: 'ACTIVE',
      userCount: 0,
      permissionCount: 5,
      createdAt: new Date().toISOString().split('T')[0],
      isSystem: false,
    };

    setRoles((prev) => [...prev, newRole]);
    setIsCreateRoleModal(false);
    setNewRoleName('');
    setNewRoleDesc('');
    showToast(`Custom role "${newRole.label}" created successfully!`);
  };

  // Toggle Role Status (Active / Disabled)
  const handleToggleRoleStatus = (roleId: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          const nextStatus = r.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
          showToast(`Role ${r.label} is now ${nextStatus}!`);
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  // Grant Temporary Permission
  const handleGrantTempPermission = (e: React.FormEvent) => {
    e.preventDefault();
    const userObj = SAMPLE_USERS.find((u) => u.email === grantUserEmail);
    const newTemp: TemporaryPermission = {
      id: `tp-${Date.now()}`,
      userEmail: grantUserEmail,
      roleName: userObj?.role || 'FINANCE_ADMIN',
      resource: grantModule,
      action: grantAction,
      grantedBy: 'admin@foodie.local',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: grantExpiry,
      reason: grantReason || 'Temporary administrative authorization',
      status: 'ACTIVE',
    };

    setTempPermissions((prev) => [newTemp, ...prev]);
    setIsGrantTempModal(false);
    setGrantReason('');
    showToast(`Granted temporary permission ${grantModule}:${grantAction} to ${grantUserEmail} until ${grantExpiry}!`);
  };

  const selectedUserObj = SAMPLE_USERS.find((u) => u.email === selectedUserEmail) || SAMPLE_USERS[0];

  return (
    <HasPermission
      permission="role.manage"
      fallback={
        <div style={{ padding: 24, color: '#EF4444', fontWeight: 600 }}>
          403 Forbidden — Only SUPER_ADMIN may access Role & Permission Management.
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        {/* Toast Alert */}
        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              backgroundColor: '#111827',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1px solid #374151',
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              Role & Permission Management
            </h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              Enterprise multi-role authorization console: Manage roles, edit permission matrices, view effective permissions & audit security logs
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsGrantTempModal(true)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Grant Temp Permission
            </button>
            <button
              type="button"
              onClick={() => setIsCreateRoleModal(true)}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              + Create Custom Role
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            backgroundColor: '#FFFFFF',
            padding: 6,
            borderRadius: 14,
            border: '1px solid #E5E7EB',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'ROLES', label: `System Roles (${roles.length})` },
            { id: 'MATRIX', label: 'Interactive Permission Matrix' },
            { id: 'EFFECTIVE', label: 'Effective Permissions Viewer' },
            { id: 'TEMPORARY', label: `Temporary Grants (${tempPermissions.length})` },
            { id: 'HISTORY', label: `Security Audit History (${auditLogs.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as RbacTab)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: isActive ? '#E3F2FD' : 'transparent',
                  color: isActive ? '#2196F3' : '#6B7280',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: ROLES DIRECTORY */}
        {activeTab === 'ROLES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {roles.map((role) => (
                <div
                  key={role.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 24,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                        {role.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: role.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                          color: role.status === 'ACTIVE' ? '#15803D' : '#DC2626',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {role.status}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 16 }}>
                      {role.description}
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, color: '#4B5563' }}>
                      <span>{role.userCount} Assigned Users</span>
                      <span>{role.permissionCount} Permissions</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>Created: {role.createdAt}</span>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleRoleStatus(role.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: role.status === 'ACTIVE' ? '1px solid #FECACA' : '1px solid #BBF7D0',
                          backgroundColor: role.status === 'ACTIVE' ? '#FEF2F2' : '#F0FDF4',
                          color: role.status === 'ACTIVE' ? '#DC2626' : '#16A34A',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE PERMISSION MATRIX */}
        {activeTab === 'MATRIX' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Interactive Role-Permission Matrix
                </h3>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  Check/uncheck boxes below to grant or revoke specific resource actions across system roles in real time.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={selectedModuleFilter}
                  onChange={(e) => setSelectedModuleFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', backgroundColor: '#FFFFFF' }}
                >
                  <option value="ALL">Module Filter: All Modules</option>
                  {RESOURCE_MODULES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Filter permissions..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                    <th style={{ padding: '12px 16px', minWidth: 200, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resource Module & Action</th>
                    {roles.map((r) => (
                      <th key={r.id} style={{ padding: '12px 12px', textAlign: 'center', minWidth: 110 }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{r.label}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{r.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCE_MODULES.filter((m) => selectedModuleFilter === 'ALL' || m.id === selectedModuleFilter).map((mod) => (
                    <React.Fragment key={mod.id}>
                      {/* Module Section Header */}
                      <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
                        <td colSpan={roles.length + 1} style={{ padding: '10px 16px', fontWeight: 700, color: '#111827', fontSize: 12 }}>
                          {mod.label} — <span style={{ fontWeight: 400, color: '#6B7280' }}>{mod.desc}</span>
                        </td>
                      </tr>

                      {/* Actions for this module */}
                      {STANDARD_ACTIONS.filter((act) => {
                        if (!matrixSearch.trim()) return true;
                        return `${mod.id}:${act}`.toLowerCase().includes(matrixSearch.toLowerCase());
                      }).map((action) => {
                        const cellKey = `${mod.id}:${action}`;
                        const cellState = matrixState[cellKey] || {};

                        return (
                          <tr key={cellKey} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: '#111827' }}>
                              <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{mod.id}</span> • {action}
                            </td>

                            {roles.map((r) => {
                              const isChecked = r.name === 'SUPER_ADMIN' ? true : !!cellState[r.name];

                              return (
                                <td key={r.id} style={{ padding: '10px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={r.name === 'SUPER_ADMIN'}
                                    onChange={() => handleToggleMatrixCell(mod.id, action, r.name)}
                                    style={{ width: 16, height: 16, cursor: r.name === 'SUPER_ADMIN' ? 'not-allowed' : 'pointer', accentColor: '#2196F3' }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EFFECTIVE PERMISSIONS VIEWER */}
        {activeTab === 'EFFECTIVE' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Effective Permissions Breakdown
                </h3>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  Inspect calculated effective access privileges (Role-based, Direct, Temporary & Resource Scope) for any admin account.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginRight: 8 }}>
                  Select Admin Account:
                </label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF' }}
                >
                  {SAMPLE_USERS.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected User Overview Card */}
            <div style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  {selectedUserObj.name} ({selectedUserObj.email})
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Role: <strong style={{ color: '#111827' }}>{selectedUserObj.role}</strong> | Assigned Scope: <strong style={{ color: '#111827' }}>{selectedUserObj.scope}</strong>
                </div>
              </div>

              <span style={{ padding: '4px 12px', borderRadius: 20, backgroundColor: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 600 }}>
                Effective Access Calculated
              </span>
            </div>

            {/* Effective Permissions Modules Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {RESOURCE_MODULES.map((mod) => (
                <div key={mod.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                    {mod.label}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {STANDARD_ACTIONS.slice(0, 4).map((action) => {
                      const key = `${mod.id}:${action}`;
                      const roleAllowed = selectedUserObj.role === 'SUPER_ADMIN' || !!matrixState[key]?.[selectedUserObj.role];

                      return (
                        <div
                          key={action}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            padding: '6px 10px',
                            borderRadius: 6,
                            backgroundColor: roleAllowed ? '#F0FDF4' : '#FEF2F2',
                            color: roleAllowed ? '#15803D' : '#DC2626',
                            fontWeight: 500,
                          }}
                        >
                          <span>{action}</span>
                          <span style={{ fontWeight: 600 }}>{roleAllowed ? 'Allowed' : 'Denied'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TEMPORARY PERMISSIONS */}
        {activeTab === 'TEMPORARY' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Temporary Permission Grants with Auto-Expiry
                </h3>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  Issue time-bounded administrative authorizations for specific reporting, audit, or emergency override needs.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGrantTempModal(true)}
                style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
              >
                + Grant Temporary Access
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient Account</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module & Action</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Granted By</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid Date Range</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tempPermissions.map((tp) => (
                    <tr key={tp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        {tp.userEmail} ({tp.roleName})
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2196F3' }}>
                        {tp.resource}:{tp.action}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{tp.grantedBy}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>
                        {tp.startDate} → <strong>{tp.expiryDate}</strong>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{tp.reason}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 4 }}>
                          {tp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT HISTORY */}
        {activeTab === 'HISTORY' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Security Audit Trail & Permission Change History
              </h3>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                Complete immutable log of all privilege modifications, role creations, and security status updates.
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actor</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Role</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Type</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permission</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous → New</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace' }}>{log.timestamp}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{log.actor}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{log.roleName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: log.actionType.includes('GRANTED') ? '#DCFCE7' : '#FEE2E2', color: log.actionType.includes('GRANTED') ? '#15803D' : '#DC2626', padding: '2px 6px', borderRadius: 4 }}>
                          {log.actionType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#2196F3' }}>
                        {log.resource}:{log.action}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {log.previousValue} → <strong>{log.newValue}</strong>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: CREATE CUSTOM ROLE */}
        {isCreateRoleModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <form onSubmit={handleCreateRole} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 440, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Create Custom Role
                </h3>
                <button type="button" onClick={() => setIsCreateRoleModal(false)} style={{ border: 'none', background: 'none', fontSize: 18, color: '#6B7280', cursor: 'pointer' }}>×</button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REGIONAL_INVENTORY_AUDITOR"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe role responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setIsCreateRoleModal(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Create Role</button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: GRANT TEMPORARY PERMISSION */}
        {isGrantTempModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <form onSubmit={handleGrantTempPermission} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 480, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Grant Temporary Permission
                </h3>
                <button type="button" onClick={() => setIsGrantTempModal(false)} style={{ border: 'none', background: 'none', fontSize: 18, color: '#6B7280', cursor: 'pointer' }}>×</button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Select Admin Account *</label>
                <select
                  value={grantUserEmail}
                  onChange={(e) => setGrantUserEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#111827', backgroundColor: '#FFFFFF' }}
                >
                  {SAMPLE_USERS.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Resource Module *</label>
                  <select
                    value={grantModule}
                    onChange={(e) => setGrantModule(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                  >
                    {RESOURCE_MODULES.map((m) => (
                      <option key={m.id} value={m.id}>{m.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Action *</label>
                  <select
                    value={grantAction}
                    onChange={(e) => setGrantAction(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                  >
                    {STANDARD_ACTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={grantExpiry}
                  onChange={(e) => setGrantExpiry(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Business Reason / Justification</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Regional Audit Override"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setIsGrantTempModal(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Issue Temporary Access</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </HasPermission>
  );
}
