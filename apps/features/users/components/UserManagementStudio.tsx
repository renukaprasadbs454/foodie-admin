'use client';

import React, { useState } from 'react';
import type { AdminRole } from 'foodie-shared-web';
import type { AdminUser, UserAccountStatus } from '../types/usersTypes';
import { formatRoleBadge, formatStatusBadge } from '../types/usersTypes';

const INITIAL_USERS: AdminUser[] = [
  {
    id: 'USR-1001',
    fullName: 'Alex Vance',
    email: 'alex.vance@foodie.com',
    phone: '+1 (555) 019-2831',
    role: 'SUPER_ADMIN',
    accountStatus: 'ACTIVE',
    joinedDate: '2025-01-10',
    lastActive: '2026-08-24 12:30',
    department: 'Executive Operations',
  },
  {
    id: 'USR-1002',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@foodie.com',
    phone: '+1 (555) 234-8901',
    role: 'OPS',
    accountStatus: 'ACTIVE',
    joinedDate: '2025-03-15',
    lastActive: '2026-08-24 11:45',
    department: 'Logistics & Merchant Ops',
  },
  {
    id: 'USR-1003',
    fullName: 'David Miller',
    email: 'david.m@foodie.com',
    phone: '+1 (555) 456-1122',
    role: 'FINANCE',
    accountStatus: 'ACTIVE',
    joinedDate: '2025-06-20',
    lastActive: '2026-08-23 16:10',
    department: 'Corporate Finance & Payouts',
  },
  {
    id: 'USR-1004',
    fullName: 'Rachel Green',
    email: 'rachel.green@foodie.com',
    phone: '+1 (555) 789-3344',
    role: 'SUPPORT',
    accountStatus: 'ACTIVE',
    joinedDate: '2025-09-01',
    lastActive: '2026-08-24 09:15',
    department: 'Customer Escalations Desk',
  },
  {
    id: 'USR-1005',
    fullName: 'Michael Scott',
    email: 'm.scott@foodie.com',
    phone: '+1 (555) 998-7766',
    role: 'OPS',
    accountStatus: 'SUSPENDED',
    joinedDate: '2026-02-14',
    lastActive: '2026-07-30 14:00',
    department: 'Regional Dispatch',
  },
];

export function UserManagementStudio() {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('OPS');
  const [newDept, setNewDept] = useState('');

  const [selectedUserForStatus, setSelectedUserForStatus] = useState<AdminUser | null>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<AdminRole>('OPS');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPhone) return;

    const newUser: AdminUser = {
      id: `USR-${1000 + users.length + 1}`,
      fullName: newFullName,
      email: newEmail,
      phone: newPhone,
      role: newRole,
      accountStatus: 'ACTIVE',
      joinedDate: new Date().toISOString().split('T')[0],
      lastActive: 'Just Provisioned',
      department: newDept || 'Platform Administration',
    };

    setUsers((prev) => [newUser, ...prev]);
    showToast(`Successfully provisioned admin user: ${newFullName} (${newRole})`);

    // Reset form
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewRole('OPS');
    setNewDept('');
    setIsCreateModalOpen(false);
  };

  const handleToggleStatus = (id: string, currentStatus: UserAccountStatus) => {
    const nextStatus: UserAccountStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, accountStatus: nextStatus } : u)));
    showToast(`Updated user account ${id} status to ${nextStatus}`);
    setSelectedUserForStatus(null);
  };

  const handleUpdateRole = () => {
    if (!selectedUserForRole) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: targetRole } : u))
    );
    showToast(`Updated ${selectedUserForRole.fullName}'s role to ${targetRole}`);
    setSelectedUserForRole(null);
  };

  const totalUsers = users.length;
  const activeAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length;
  const opsTeam = users.filter((u) => u.role === 'OPS').length;
  const supportFinance = users.filter((u) => u.role === 'SUPPORT' || u.role === 'FINANCE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Alert */}
      {toastMsg ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{toastMsg}</span>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Security Directory Updated</span>
        </div>
      ) : null}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Members & Admin User Directory
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Provision, assign roles, manage system privileges, and monitor security status for platform staff.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          + Provision New Admin User
        </button>
      </div>

      {/* Executive Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Staff Members</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 6 }}>{totalUsers}</div>
          <div style={{ fontSize: 13, color: '#22C55E', fontWeight: 500, marginTop: 4 }}>Active Administrative Accounts</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Super Admins</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 6 }}>{activeAdmins}</div>
          <div style={{ fontSize: 13, color: '#2196F3', fontWeight: 500, marginTop: 4 }}>Full Root System Privileges</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operations Managers</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 6 }}>{opsTeam}</div>
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginTop: 4 }}>Dispatch & Merchant Ops</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Finance & Support</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginTop: 6 }}>{supportFinance}</div>
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginTop: 4 }}>Payouts & Support Desk</div>
        </div>
      </div>

      {/* Directory Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search users by name, email, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                minWidth: 260,
                flex: 1,
                color: '#111827',
                backgroundColor: '#FFFFFF',
              }}
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">Role: All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="OPS">Operations</option>
              <option value="FINANCE">Finance</option>
              <option value="SUPPORT">Support Desk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">Status: All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>

          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
            Showing <strong style={{ color: '#111827' }}>{filteredUsers.length}</strong> of {totalUsers} staff members
          </div>
        </div>

        {/* Directory Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Member</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Info</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role Privilege</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Active</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#6B7280', fontWeight: 500 }}>
                    No administrative users match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleBadge = formatRoleBadge(user.role);
                  const statusBadge = formatStatusBadge(user.accountStatus);

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{user.fullName}</div>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#111827', fontWeight: 500 }}>{user.email}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{user.phone}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.color,
                            border: `1px solid ${roleBadge.border}`,
                          }}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#6B7280', fontWeight: 500 }}>
                        {user.department}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6B7280' }}>
                        {user.lastActive}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForRole(user);
                              setTargetRole(user.role);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid #E5E7EB',
                              backgroundColor: '#FFFFFF',
                              color: '#2196F3',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Edit Role
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedUserForStatus(user)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid transparent',
                              backgroundColor: user.accountStatus === 'ACTIVE' ? '#FEE2E2' : '#DCFCE7',
                              color: user.accountStatus === 'ACTIVE' ? '#EF4444' : '#15803D',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {user.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                          </button>
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

      {/* PROVISION USER MODAL */}
      {isCreateModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <form
            onSubmit={handleCreateUser}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Provision New Administrative User
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Work Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. s.jenkins@foodie.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Mobile Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +1 (555) 234-5678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  System Role Privilege *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="OPS">Operations (OPS)</option>
                  <option value="FINANCE">Finance (FINANCE)</option>
                  <option value="SUPPORT">Support (SUPPORT)</option>
                  <option value="SUPER_ADMIN">Super Admin (SUPER_ADMIN)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatch & Logistics"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                }}
              >
                Provision User
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* EDIT ROLE MODAL */}
      {selectedUserForRole ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Update Role Privilege
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              Modify system access role for <strong style={{ color: '#111827' }}>{selectedUserForRole.fullName}</strong> ({selectedUserForRole.email}).
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Select Target Role Privilege
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as AdminRole)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="SUPER_ADMIN">Super Admin (Full Control)</option>
                <option value="OPS">Operations (Manage Merchants & Dispatch)</option>
                <option value="FINANCE">Finance (Payments & Refunds)</option>
                <option value="SUPPORT">Support Desk (Tickets Only)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                }}
              >
                Save Role Privilege
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SUSPEND / RE-ACTIVATE MODAL */}
      {selectedUserForStatus ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                {selectedUserForStatus.accountStatus === 'ACTIVE' ? 'Suspend User Account' : 'Reactivate User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserForStatus(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Are you sure you want to {selectedUserForStatus.accountStatus === 'ACTIVE' ? 'suspend' : 'reactivate'}{' '}
              administrative access for <strong style={{ color: '#111827' }}>{selectedUserForStatus.fullName}</strong> ({selectedUserForStatus.email})?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedUserForStatus(null)}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedUserForStatus.id, selectedUserForStatus.accountStatus)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: selectedUserForStatus.accountStatus === 'ACTIVE' ? '#EF4444' : '#22C55E',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                }}
              >
                Confirm {selectedUserForStatus.accountStatus === 'ACTIVE' ? 'Suspension' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
