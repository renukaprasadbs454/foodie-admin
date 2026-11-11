'use client';

import React, { useState } from 'react';
import type { AdminRole } from 'foodie-shared-web';
import type { AdminUser, UserAccountStatus, DropdownAdminRole, UserLoginDevice } from '../types/usersTypes';
import { formatRoleBadge, formatStatusBadge, normalizeRoleToDropdownValue, getRoleDisplayName } from '../types/usersTypes';

import {
  useGetAdminUsersQuery,
  useLazyGetAdminUserByIdQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserRoleMutation,
  useUpdateAdminUserZonesMutation,
  useUpdateAdminUserStatusMutation,
  useUpdateAdminUserPasswordMutation,
  useDeleteAdminUserMutation,
  useLazyGetUserLoginDevicesQuery,
  useLogoutAllUserDevicesMutation,
} from '@/api/endpoints/usersApi';
import {
  useGetZoneLoginHistoryQuery,
  useGetAvailableZonesQuery,
} from '@/api/endpoints/zoneApi';
import { useAppSelector } from '@/store/hooks';
import { selectAdminRole } from '@/features/auth/authSlice';
import { RmZoneMultiSelectDropdown } from './RmZoneMultiSelectDropdown';

const DEFAULT_ZONE_ADMIN_PASSWORDS: Record<string, string> = {
  'blr.admin@foodie.local': 'BlrSecure@2026',
  'tmk.admin@foodie.local': 'TmkSecure@2026',
  'mysuru.admin@foodie.local': 'MysuruPass@2026',
};

export function UserManagementStudio() {
  const role = useAppSelector(selectAdminRole);
  const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null;
  const assignedZone = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_user_assigned_zone') || sessionStorage.getItem('foodie_user_assigned_zone') || (typeof document !== 'undefined' ? document.cookie.match(/foodie_user_assigned_zone=([^;]+)/)?.[1] : null))
    : null;
  const hasAssignedZone = Boolean(assignedZone && assignedZone !== 'ALL');
  const isSuperAdmin = !hasAssignedZone && Boolean((role && role.toUpperCase() === 'SUPER_ADMIN') || (storedRole && storedRole.toUpperCase() === 'SUPER_ADMIN'));

  const { data: rawUsers = [], isLoading, isError, refetch } = useGetAdminUsersQuery(undefined, { skip: !isSuperAdmin });
  const [fetchUserById, { isFetching: isFetchingUserDetails }] = useLazyGetAdminUserByIdQuery();
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [createAdminUser] = useCreateAdminUserMutation();
  const [updateAdminUserRole] = useUpdateAdminUserRoleMutation();
  const [updateAdminUserZones] = useUpdateAdminUserZonesMutation();
  const [openZoneDropdownUserId, setOpenZoneDropdownUserId] = useState<string | null>(null);
  const rmZoneDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutsideRmZone(event: MouseEvent) {
      if (rmZoneDropdownRef.current && !rmZoneDropdownRef.current.contains(event.target as Node)) {
        setOpenZoneDropdownUserId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideRmZone);
    return () => document.removeEventListener('mousedown', handleClickOutsideRmZone);
  }, []);
  const [updateAdminUserStatus] = useUpdateAdminUserStatusMutation();
  const [updateAdminUserPassword] = useUpdateAdminUserPasswordMutation();
  const [deleteAdminUser] = useDeleteAdminUserMutation();
  const [selectedUserForDevices, setSelectedUserForDevices] = useState<AdminUser | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'MOBILE' | 'DESKTOP'>('ALL');
  const [fetchDevices, { data: activeUserDevices = [], isFetching: isFetchingDevices }] = useLazyGetUserLoginDevicesQuery();
  const [logoutAllDevicesMutation, { isLoading: isLoggingOutDevices }] = useLogoutAllUserDevicesMutation();
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [deviceTabFilter, setDeviceTabFilter] = useState<'ALL' | 'ACTIVE' | 'DESKTOP' | 'MOBILE'>('ALL');

  React.useEffect(() => {
    if (selectedUserForDevices) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedUserForDevices(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedUserForDevices]);

  const [adminPasswords, setAdminPasswords] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('foodie_admin_passwords');
        if (stored) {
          return { ...DEFAULT_ZONE_ADMIN_PASSWORDS, ...JSON.parse(stored) };
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_ZONE_ADMIN_PASSWORDS;
  });

  const saveAdminPassword = (email: string, pass: string) => {
    const key = email.toLowerCase().trim();
    setAdminPasswords((prev) => {
      const next = { ...prev, [key]: pass };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('foodie_admin_passwords', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<string>>(new Set());
  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const handleCopyPassword = (userId: string, pass: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pass);
      setCopiedUserId(userId);
      showToast('Password copied to clipboard');
      setTimeout(() => setCopiedUserId(null), 2000);
    }
  };

  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<AdminUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPasswordInput, setShowResetPasswordInput] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const isResetPasswordLengthValid = resetPasswordInput.length >= 8;
  const hasResetUpperCase = /[A-Z]/.test(resetPasswordInput);
  const hasResetLowerCase = /[a-z]/.test(resetPasswordInput);
  const hasResetNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(resetPasswordInput);
  const isResetPasswordValid = isResetPasswordLengthValid && hasResetUpperCase && hasResetLowerCase && hasResetNumberOrSymbol;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordReset) return;
    if (!isResetPasswordValid) {
      showToast('Password must be at least 8 characters and include uppercase, lowercase, and a number or symbol.');
      return;
    }

    setIsResettingPassword(true);
    try {
      await updateAdminUserPassword({
        userId: selectedUserForPasswordReset.id,
        email: selectedUserForPasswordReset.email,
        password: resetPasswordInput,
      }).unwrap();

      saveAdminPassword(selectedUserForPasswordReset.email, resetPasswordInput);
      showToast(`Password successfully updated for ${selectedUserForPasswordReset.fullName}`);
      setSelectedUserForPasswordReset(null);
      setResetPasswordInput('');
      setShowResetPasswordInput(false);
      refetch();
    } catch {
      showToast(`Failed to reset password for ${selectedUserForPasswordReset.fullName}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (normalizeRoleToDropdownValue(user.role) === 'SUPER_ADMIN') {
      showToast('Super Admin accounts cannot be deleted.');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to permanently delete administrator "${user.fullName}" (${user.email})? This action cannot be undone and will permanently wipe their credentials from the database.`)) {
      return;
    }
    try {
      await deleteAdminUser(user.id).unwrap();
      showToast(`Administrator "${user.fullName}" and credentials permanently deleted.`);
      void refetch();
    } catch (err: any) {
      showToast(err?.data?.message || `Failed to delete administrator "${user.fullName}".`);
    }
  };

  const users: AdminUser[] = React.useMemo(() => {
    const seen = new Set<string>();
    const deduplicated: AdminUser[] = [];
    for (const u of rawUsers) {
      if (!u) continue;
      const key = (u.email || u.id || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        deduplicated.push(u);
      }
    }
    return deduplicated;
  }, [rawUsers]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'STAFF' | 'ZONE_HISTORY'>('STAFF');

  // Zone Login History State
  const [historySearch, setHistorySearch] = useState('');
  const [historyZoneFilter, setHistoryZoneFilter] = useState('ALL');
  const [historyPage, setHistoryPage] = useState(0);
  const historyPageSize = 10;

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useGetZoneLoginHistoryQuery({
    zoneId: historyZoneFilter,
    search: historySearch,
    page: historyPage,
    size: historyPageSize,
  });

  const { data: availableZones = [] } = useGetAvailableZonesQuery();

  const handleToggleRmZone = async (targetUser: AdminUser, zoneId: string) => {
    const currentList = Array.isArray(targetUser.assignedZoneIds)
      ? [...targetUser.assignedZoneIds]
      : (targetUser.assignedZoneId ? [targetUser.assignedZoneId] : []);

    const exists = currentList.some((id) => id.toLowerCase() === zoneId.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = currentList.filter((id) => id.toLowerCase() !== zoneId.toLowerCase());
    } else {
      nextList = [...currentList, zoneId];
    }

    try {
      await updateAdminUserZones({
        userId: targetUser.id,
        assignedZoneIds: nextList,
      }).unwrap();
      showToast(`Updated assigned zones for ${targetUser.fullName}`);
      await refetch();
    } catch (err: any) {
      showToast(err?.data?.error?.message || 'Failed to update assigned zones');
    }
  };

  const formatLoginTimestamp = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatLastUsedDate = (isoString?: string | null): string => {
    if (!isoString) return 'Never logged';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      let hours = d.getHours();
      const minutes = pad(d.getMinutes());
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeStr = `${pad(hours)}:${minutes} ${ampm}`;

      if (isToday) {
        return `Today ${timeStr}`;
      }
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      return `${day}-${month}-${year} ${timeStr}`;
    } catch {
      return String(isoString || 'Never logged');
    }
  };

  const formatRelativeTime = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      return formatLastUsedDate(isoString);
    } catch {
      return String(isoString || '—');
    }
  };

  const isDeviceActiveNow = (device: {
    isOnline?: boolean;
    is_online?: boolean;
    isCurrentActive?: boolean;
    lastActiveAt?: string;
    last_active_at?: string;
  }): boolean => {
    if (device.isOnline === true || device.is_online === true || device.isCurrentActive === true) {
      return true;
    }
    const lastActive = device.lastActiveAt || device.last_active_at;
    if (!lastActive) return false;
    try {
      const diff = Date.now() - new Date(lastActive).getTime();
      return diff >= 0 && diff < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('OPS');
  const [newDept, setNewDept] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newAssignedZoneId, setNewAssignedZoneId] = useState('ALL');

  // Password validation criteria
  const isPasswordLengthValid = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = isPasswordLengthValid && hasUpperCase && hasLowerCase && hasNumberOrSymbol;

  const [selectedUserForStatus, setSelectedUserForStatus] = useState<AdminUser | null>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<DropdownAdminRole>('OPS');

  const handleOpenEditRole = async (user: AdminUser) => {
    const latestUser = users.find((u) => u.id === user.id) || user;
    const initialRole = normalizeRoleToDropdownValue(latestUser.role);
    setSelectedUserForRole(latestUser);
    setTargetRole(initialRole);

    try {
      const freshUser = await fetchUserById(latestUser.id).unwrap();
      if (freshUser && freshUser.role) {
        const freshRole = normalizeRoleToDropdownValue(freshUser.role);
        setTargetRole(freshRole);
        setSelectedUserForRole((prev) => (prev && prev.id === latestUser.id ? { ...prev, ...freshUser } : prev));
      }
    } catch {
      // Retain initial mapped role
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.assignedZoneName && u.assignedZoneName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.assignedZoneId && u.assignedZoneId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || normalizeRoleToDropdownValue(u.role) === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter;

    const matchesDevice = (() => {
      if (deviceFilter === 'ALL') return true;
      const userDevs = u.devices || [];
      if (deviceFilter === 'MOBILE') {
        if (userDevs.length > 0) {
          return userDevs.some((d) => {
            const devType = ((d as any).deviceType || (d as any).device_type || '').toLowerCase();
            if (devType === 'mobile') return true;
            const str = ((d.deviceName || '') + ' ' + (d.os || '')).toLowerCase();
            return str.includes('phone') || str.includes('mobile') || str.includes('ios') || str.includes('android');
          });
        }
        const roleStr = String(u.role).toUpperCase();
        return roleStr.includes('RESTAURANT') || roleStr.includes('OPS');
      }
      if (deviceFilter === 'DESKTOP') {
        if (userDevs.length > 0) {
          return userDevs.some((d) => {
            const devType = ((d as any).deviceType || (d as any).device_type || '').toLowerCase();
            if (devType === 'desktop') return true;
            const str = ((d.deviceName || '') + ' ' + (d.os || '')).toLowerCase();
            return str.includes('windows') || str.includes('mac') || str.includes('pc') || str.includes('desktop') || str.includes('linux');
          });
        }
        return true;
      }
      return true;
    })();

    return matchesSearch && matchesRole && matchesStatus && matchesDevice;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPhone) return;

    if (!isPasswordValid) {
      showToast('Password must be at least 8 characters and include uppercase, lowercase, and a number or symbol.');
      return;
    }

    const assignedZoneObj = availableZones.find((z) => z.id === newAssignedZoneId);
    const assignedZoneName = newAssignedZoneId === 'ALL'
      ? 'All Zones'
      : (assignedZoneObj?.zoneName || (newAssignedZoneId === 'dz-bangalore' ? 'Bangalore Zone' : (newAssignedZoneId === 'dz-tumkur' ? 'Tumkur Zone' : newAssignedZoneId)));

    const assignedZoneIds = newAssignedZoneId === 'ALL' ? [] : [newAssignedZoneId];

    try {
      await createAdminUser({
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        department: newDept || 'Platform Administration',
        password: newPassword,
        assignedZoneId: newAssignedZoneId === 'ALL' ? undefined : newAssignedZoneId,
        assignedZoneName,
        assignedZoneIds,
      }).unwrap();

      saveAdminPassword(newEmail, newPassword);

      showToast(`Successfully provisioned admin user: ${newFullName} (${newRole})`);

      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('OPS');
      setNewDept('');
      setNewPassword('');
      setShowPassword(false);
      setNewAssignedZoneId('ALL');
      setIsCreateModalOpen(false);
      refetch();
    } catch {
      showToast(`Failed to provision admin user.`);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: UserAccountStatus) => {
    const nextStatus: UserAccountStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateAdminUserStatus({ userId: id, status: nextStatus }).unwrap();
      showToast(`Updated user account ${id} status to ${nextStatus}`);
      setSelectedUserForStatus(null);
      refetch();
    } catch {
      showToast(`Failed to update user status for ${id}`);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserForRole) return;
    const finalRoleToSave = normalizeRoleToDropdownValue(targetRole || selectedUserForRole.role);
    setIsUpdatingRole(true);
    try {
      await updateAdminUserRole({ userId: selectedUserForRole.id, role: finalRoleToSave }).unwrap();
      showToast(`Updated ${selectedUserForRole.fullName}'s role to ${getRoleDisplayName(finalRoleToSave)}`);
      setSelectedUserForRole(null);
      await refetch();
    } catch {
      showToast(`Failed to update role for ${selectedUserForRole.fullName}`);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const totalUsers = users.length;
  const activeAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length;
  const opsTeam = users.filter((u) => u.role === 'OPS').length;
  const supportFinance = users.filter((u) => u.role === 'SUPPORT' || u.role === 'FINANCE').length;


  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: 520, width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 36, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            Super Admin Access Only
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 24px' }}>
            Managing administrative credentials, provisioning new accounts, and modifying role-based access privileges is restricted strictly to Super Administrators.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: '#14532D',
              color: '#FFFFFF',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(20, 83, 45, 0.25)',
            }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

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

        {activeTab === 'STAFF' && (
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
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E5E7EB', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveTab('STAFF')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: activeTab === 'STAFF' ? '2.5px solid #2196F3' : '2.5px solid transparent',
            backgroundColor: activeTab === 'STAFF' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'STAFF' ? '#1D4ED8' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Admin Staff Accounts ({totalUsers})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ZONE_HISTORY')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: activeTab === 'ZONE_HISTORY' ? '2.5px solid #2196F3' : '2.5px solid transparent',
            backgroundColor: activeTab === 'ZONE_HISTORY' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'ZONE_HISTORY' ? '#1D4ED8' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          Super Admin Zone Login History
          {historyData?.pagination?.totalElements != null && (
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 12 }}>
              {historyData.pagination.totalElements}
            </span>
          )}
        </button>
      </div>

      {/* STAFF TAB CONTENT */}
      {activeTab === 'STAFF' && (
        <>
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

            {isSuperAdmin && (
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value as 'ALL' | 'MOBILE' | 'DESKTOP')}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">Device: All Devices</option>
                <option value="MOBILE">Mobile Devices Only</option>
                <option value="DESKTOP">Desktop Devices Only</option>
              </select>
            )}
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
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Zone</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Active</th>
                {isSuperAdmin && (
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login Devices</th>
                )}
                <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '36px', color: '#2196F3', fontWeight: 600 }}>
                    Loading administrative user directory from backend...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '36px', color: '#EF4444', fontWeight: 600 }}>
                    Failed to fetch user directory from backend.
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '36px', color: '#6B7280', fontWeight: 500 }}>
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

                      <td style={{ padding: '14px 16px' }}>
                        {(() => {
                          const emailKey = (user.email || '').toLowerCase().trim();
                          const adminPassword = adminPasswords[emailKey] || adminPasswords[user.id];
                          const isRevealed = revealedPasswordIds.has(user.id);
                          const isCopied = copiedUserId === user.id;

                          if (adminPassword) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 8px',
                                    borderRadius: 8,
                                    backgroundColor: '#F3F4F6',
                                    border: '1px solid #E5E7EB',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    fontSize: 12,
                                    color: '#1F2937',
                                  }}
                                >
                                  <span style={{ letterSpacing: isRevealed ? 'normal' : '0.15em', fontWeight: 600 }}>
                                    {isRevealed ? adminPassword : '••••••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordReveal(user.id)}
                                    title={isRevealed ? 'Hide password' : 'Show password'}
                                    aria-label={isRevealed ? 'Hide password' : 'Show password'}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 2,
                                      color: '#6B7280',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {isRevealed ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(user.id, adminPassword)}
                                    title="Copy password"
                                    aria-label="Copy password"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 2,
                                      color: isCopied ? '#10B981' : '#6B7280',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {isCopied ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserForPasswordReset(user);
                                    setResetPasswordInput('');
                                  }}
                                  title="Reset Password"
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#FFFFFF',
                                    color: '#6B7280',
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reset
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForPasswordReset(user);
                                setResetPasswordInput('');
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 8,
                                border: '1px dashed #9CA3AF',
                                backgroundColor: '#F9FAFB',
                                color: '#4B5563',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Reset Password
                            </button>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '14px 16px', position: 'relative' }}>
                        {user.role === 'SUPER_ADMIN' ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: 6,
                              backgroundColor: '#F3F4F6',
                              color: '#4B5563',
                              border: '1px solid #E5E7EB',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            🌐 All Zones (Global Access)
                          </span>
                        ) : (
                          <RmZoneMultiSelectDropdown
                            user={user}
                            availableZones={availableZones}
                            onUpdateAssignedZones={async (userId, next) => {
                              try {
                                await updateAdminUserZones({ userId, assignedZoneIds: next }).unwrap();
                                showToast('Updated assigned zones for ' + user.fullName);
                                await refetch();
                              } catch (err: any) {
                                showToast(err?.data?.error?.message || 'Failed to update assigned zones');
                              }
                            }}
                          />
                        )}
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

                      {isSuperAdmin && (
                        <td style={{ padding: '14px 16px' }}>
                          {(() => {
                            const rawCount = user.device_count ?? user.loginDevicesCount ?? user.devices?.length ?? 0;
                            const isOnline = Boolean(
                              user.is_online ||
                              (user.activeDevicesCount != null && user.activeDevicesCount > 0) ||
                              (user.last_active_at && (Date.now() - new Date(user.last_active_at).getTime() < 5 * 60 * 1000)) ||
                              (user.devices && user.devices.some((d) => d.isCurrentActive || isDeviceActiveNow(d)))
                            );
                            const lastUsedDate = user.last_used || user.last_active_at || (user.devices && user.devices[0]?.lastActiveAt);

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForDevices(user);
                                  fetchDevices(user.id);
                                }}
                                title="Click to view logged in devices"
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: 4,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #E5E7EB',
                                  backgroundColor: '#F9FAFB',
                                  color: '#1F2937',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease',
                                  minWidth: 150,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                                  e.currentTarget.style.borderColor = '#BFDBFE';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                }}
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                  </svg>
                                  <span>{rawCount === 1 ? '1 Device' : `${rawCount} Devices`}</span>
                                  {isOnline && (
                                    <span
                                      title="Active now"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: '#10B981',
                                        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                                        display: 'inline-block',
                                      }}
                                    />
                                  )}
                                </div>

                                <div style={{ fontSize: 11, color: isOnline ? '#059669' : '#6B7280', fontWeight: isOnline ? 600 : 400 }}>
                                  {rawCount === 0 || !lastUsedDate
                                    ? 'Never logged'
                                    : isOnline
                                    ? 'Active now'
                                    : `Last used: ${formatLastUsedDate(lastUsedDate)}`}
                                </div>
                              </button>
                            );
                          })()}
                        </td>
                      )}

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRole(user)}
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

                          {normalizeRoleToDropdownValue(user.role) !== 'SUPER_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              title="Permanently Delete User"
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          )}
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
        </>
      )}

      {/* ZONE LOGIN HISTORY TAB CONTENT */}
      {activeTab === 'ZONE_HISTORY' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          {/* Summary Audit Banner */}
          <div
            style={{
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369A1' }}>
                  Verified Zone Login & Access Audit History
                </div>
                <div style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
                  Real-time database records tracking authenticated Super Admin logins and server-validated operating zone selections.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetchHistory()}
              disabled={isHistoryFetching}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                border: '1px solid #BAE6FD',
                color: '#0284C7',
                fontSize: 12,
                fontWeight: 600,
                cursor: isHistoryFetching ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: isHistoryFetching ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {isHistoryFetching ? 'Refreshing...' : 'Refresh Records'}
            </button>
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by admin name, email, or zone..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(0);
                }}
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
                value={historyZoneFilter}
                onChange={(e) => {
                  setHistoryZoneFilter(e.target.value);
                  setHistoryPage(0);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="ALL">Zone: All Zones</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneName}
                  </option>
                ))}
              </select>

              {(historySearch || historyZoneFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryZoneFilter('ALL');
                    setHistoryPage(0);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    color: '#6B7280',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
              Total Verified Records: <strong style={{ color: '#111827' }}>{historyData?.pagination?.totalElements ?? 0}</strong>
            </div>
          </div>

          {/* Login History Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Admin / Login Name
                  </th>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Admin Email
                  </th>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role
                  </th>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selected Zone
                  </th>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Login Date & Time
                  </th>
                  <th style={{ padding: '12px 16px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Session Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#2196F3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Loading zone login records from database...</div>
                    </td>
                  </tr>
                ) : !historyData?.items || historyData.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📍</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>No Zone Login Records Found</div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        No zone login activity matches the active filter or search criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  historyData.items.map((record) => (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Admin / Login Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {record.adminName ? record.adminName.slice(0, 2).toUpperCase() : 'SA'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              {record.adminName || 'Super Admin'}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                              {record.adminUserId ? record.adminUserId.slice(0, 8) + '...' : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px', color: '#374151', fontWeight: 500 }}>
                        {record.adminEmail}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#E3F2FD',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {record.role || 'SUPER_ADMIN'}
                        </span>
                      </td>

                      {/* Selected Zone */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #DBEAFE',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {record.zoneName || record.zoneId}
                        </span>
                      </td>

                      {/* Login Date & Time */}
                      <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: 12, fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{formatLoginTimestamp(record.loginTime)}</span>
                        </div>
                      </td>

                      {/* Session Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: record.sessionStatus === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6',
                            color: record.sessionStatus === 'ACTIVE' ? '#166534' : '#4B5563',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: record.sessionStatus === 'ACTIVE' ? '#22C55E' : '#9CA3AF',
                            }}
                          />
                          {record.sessionStatus || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid #F3F4F6',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Page <strong style={{ color: '#111827' }}>{(historyData?.pagination?.page ?? 0) + 1}</strong> of{' '}
              <strong style={{ color: '#111827' }}>{Math.max(1, historyData?.pagination?.totalPages ?? 1)}</strong>{' '}
              ({historyData?.pagination?.totalElements ?? 0} total records)
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={historyPage <= 0 || isHistoryFetching}
                onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: historyPage <= 0 ? '#F9FAFB' : '#FFFFFF',
                  color: historyPage <= 0 ? '#9CA3AF' : '#111827',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: historyPage <= 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  historyPage + 1 >= (historyData?.pagination?.totalPages || 1) || isHistoryFetching
                }
                onClick={() => setHistoryPage((p) => p + 1)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor:
                    historyPage + 1 >= (historyData?.pagination?.totalPages || 1)
                      ? '#F9FAFB'
                      : '#FFFFFF',
                  color:
                    historyPage + 1 >= (historyData?.pagination?.totalPages || 1)
                      ? '#9CA3AF'
                      : '#111827',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor:
                    historyPage + 1 >= (historyData?.pagination?.totalPages || 1)
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="FINANCE">Finance Admin (FINANCE)</option>
                  <option value="RESTAURANT_MANAGER">Restaurant Manager (RESTAURANT)</option>
                  <option value="AUDITOR">Compliance Auditor (AUDITOR)</option>
                  <option value="SUPPORT">Support Agent (SUPPORT)</option>
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

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Assigned Operating Zone *
              </label>
              <select
                value={newAssignedZoneId}
                onChange={(e) => setNewAssignedZoneId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#111827', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="ALL">All Zones (Global Super Admin)</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneName} ({z.cityName || 'Active Zone'})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                {newAssignedZoneId === 'ALL'
                  ? 'User will retain global access across all operating zones.'
                  : 'User will be strictly isolated to viewing and operating in this assigned zone.'}
              </span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Admin-Created Password *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create user password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${newPassword && !isPasswordValid ? '#F87171' : '#E5E7EB'}`,
                    fontSize: 13,
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Real-time Password Strength Feedback */}
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: isPasswordLengthValid ? '#DCFCE7' : '#F3F4F6',
                  color: isPasswordLengthValid ? '#15803D' : '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {isPasswordLengthValid ? '✓' : '○'} 8+ Chars
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: hasUpperCase ? '#DCFCE7' : '#F3F4F6',
                  color: hasUpperCase ? '#15803D' : '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {hasUpperCase ? '✓' : '○'} Uppercase
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: hasLowerCase ? '#DCFCE7' : '#F3F4F6',
                  color: hasLowerCase ? '#15803D' : '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {hasLowerCase ? '✓' : '○'} Lowercase
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: hasNumberOrSymbol ? '#DCFCE7' : '#F3F4F6',
                  color: hasNumberOrSymbol ? '#15803D' : '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {hasNumberOrSymbol ? '✓' : '○'} Number/Symbol
                </span>
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
                value={normalizeRoleToDropdownValue(targetRole || selectedUserForRole.role)}
                onChange={(e) => setTargetRole(normalizeRoleToDropdownValue(e.target.value))}
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
                disabled={isUpdatingRole}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isUpdatingRole ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingRole ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                }}
              >
                {isUpdatingRole ? 'Saving...' : 'Save Role Privilege'}
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

      {/* SECURE PASSWORD RESET MODAL */}
      {selectedUserForPasswordReset ? (
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
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Reset Admin Password
                  </h3>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                    Provision a new secure password for this administrative account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForPasswordReset(null);
                  setResetPasswordInput('');
                  setShowResetPasswordInput(false);
                }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Target Account Info */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>Account:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{selectedUserForPasswordReset.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>Email:</span>
                <span style={{ fontWeight: 500, color: '#111827' }}>{selectedUserForPasswordReset.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Assigned Zone:</span>
                <span style={{ fontWeight: 600, color: selectedUserForPasswordReset.assignedZoneId ? '#1D4ED8' : '#374151' }}>
                  {selectedUserForPasswordReset.assignedZoneName || selectedUserForPasswordReset.assignedZoneId || 'All Zones (Global)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  New Password *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showResetPasswordInput ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 8 characters)"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${resetPasswordInput && !isResetPasswordValid ? '#F87171' : '#E5E7EB'}`,
                      fontSize: 13,
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordInput(!showResetPasswordInput)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B7280',
                    }}
                    title={showResetPasswordInput ? 'Hide password' : 'Show password'}
                  >
                    {showResetPasswordInput ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Real-time Password Strength Feedback */}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: isResetPasswordLengthValid ? '#DCFCE7' : '#F3F4F6',
                    color: isResetPasswordLengthValid ? '#15803D' : '#6B7280',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {isResetPasswordLengthValid ? '✓' : '○'} 8+ Chars
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: hasResetUpperCase ? '#DCFCE7' : '#F3F4F6',
                    color: hasResetUpperCase ? '#15803D' : '#6B7280',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {hasResetUpperCase ? '✓' : '○'} Uppercase
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: hasResetLowerCase ? '#DCFCE7' : '#F3F4F6',
                    color: hasResetLowerCase ? '#15803D' : '#6B7280',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {hasResetLowerCase ? '✓' : '○'} Lowercase
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: hasResetNumberOrSymbol ? '#DCFCE7' : '#F3F4F6',
                    color: hasResetNumberOrSymbol ? '#15803D' : '#6B7280',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {hasResetNumberOrSymbol ? '✓' : '○'} Number / Symbol
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForPasswordReset(null);
                    setResetPasswordInput('');
                    setShowResetPasswordInput(false);
                  }}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isResetPasswordValid || isResettingPassword}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: isResetPasswordValid && !isResettingPassword
                      ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)'
                      : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isResetPasswordValid && !isResettingPassword ? 'pointer' : 'not-allowed',
                    boxShadow: isResetPasswordValid ? '0 4px 14px rgba(33, 150, 243, 0.25)' : 'none',
                  }}
                >
                  {isResettingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* LOGGED IN DEVICES FULL SCREEN VIEW */}
      {selectedUserForDevices && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#F8FAFC',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Full Screen Header Bar */}
          <header
            style={{
              padding: '14px 28px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              zIndex: 10,
            }}
          >
            {/* Left: Back button + User details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.borderColor = '#94A3B8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Users</span>
              </button>

              <div style={{ width: 1, height: 32, backgroundColor: '#E2E8F0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1D4ED8',
                  }}
                >
                  {(selectedUserForDevices.fullName || 'U').slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Logged In Devices
                    </h1>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: 6,
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                      }}
                    >
                      {selectedUserForDevices.fullName}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: formatRoleBadge(selectedUserForDevices.role).bg,
                        color: formatRoleBadge(selectedUserForDevices.role).color,
                        border: `1px solid ${formatRoleBadge(selectedUserForDevices.role).border}`,
                      }}
                    >
                      {formatRoleBadge(selectedUserForDevices.role).label}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    <span>{selectedUserForDevices.email}</span>
                    <span style={{ margin: '0 6px' }}>•</span>
                    <span>ID: {selectedUserForDevices.id}</span>
                    {selectedUserForDevices.department && (
                      <>
                        <span style={{ margin: '0 6px' }}>•</span>
                        <span>{selectedUserForDevices.department}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => fetchDevices(selectedUserForDevices.id)}
                title="Refresh device security audit history"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Refresh</span>
              </button>

              <button
                type="button"
                disabled={isLoggingOutDevices}
                onClick={async () => {
                  if (typeof window !== 'undefined' && !window.confirm(`Log out all active devices for ${selectedUserForDevices.fullName}?`)) {
                    return;
                  }
                  try {
                    await logoutAllDevicesMutation(selectedUserForDevices.id).unwrap();
                    showToast(`All active devices logged out for ${selectedUserForDevices.fullName}`);
                    await fetchDevices(selectedUserForDevices.id);
                    void refetch();
                  } catch {
                    showToast(`Failed to logout all devices.`);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #FCA5A5',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLoggingOutDevices ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{isLoggingOutDevices ? 'Logging Out...' : 'Logout All Devices'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                aria-label="Close full screen view"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: 22,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.color = '#DC2626';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                &times;
              </button>
            </div>
          </header>

            {/* Scrollable Full Screen Content Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {(() => {
                const rawDevicesList: UserLoginDevice[] = (activeUserDevices && activeUserDevices.length > 0)
                  ? activeUserDevices
                  : (selectedUserForDevices.devices || []);

                const onlineCount = rawDevicesList.filter((d) => isDeviceActiveNow(d)).length;
                const desktopCount = rawDevicesList.filter((d) => {
                  const dt = ((d as any).deviceType || (d as any).device_type || '').toLowerCase();
                  if (dt === 'desktop') return true;
                  const str = ((d.deviceName || '') + ' ' + (d.os || '')).toLowerCase();
                  return str.includes('windows') || str.includes('mac') || str.includes('pc') || str.includes('desktop') || str.includes('linux');
                }).length;
                const mobileCount = Math.max(0, rawDevicesList.length - desktopCount);

                const mostRecentTime = rawDevicesList.length > 0
                  ? (rawDevicesList[0].lastActiveAt || (rawDevicesList[0] as any).last_active_at || rawDevicesList[0].loginAt || (rawDevicesList[0] as any).last_login_at)
                  : null;

                const filteredDevicesList = rawDevicesList.filter((device) => {
                  const isOnline = isDeviceActiveNow(device);
                  const devName = device.deviceName || (device as any).device_name || 'Windows PC';
                  const devOs = device.os || 'Windows 11';
                  const isMobile = (devName + ' ' + devOs).toLowerCase().includes('phone') ||
                    (devName + ' ' + devOs).toLowerCase().includes('mobile') ||
                    (devName + ' ' + devOs).toLowerCase().includes('ios') ||
                    (devName + ' ' + devOs).toLowerCase().includes('android');

                  if (deviceTabFilter === 'ACTIVE' && !isOnline) return false;
                  if (deviceTabFilter === 'MOBILE' && !isMobile) return false;
                  if (deviceTabFilter === 'DESKTOP' && isMobile) return false;

                  if (deviceSearchQuery.trim()) {
                    const q = deviceSearchQuery.toLowerCase().trim();
                    const hay = [
                      devName,
                      device.browser,
                      devOs,
                      device.ipAddress,
                      (device as any).ip_address,
                      device.location,
                    ].filter(Boolean).join(' ').toLowerCase();
                    if (!hay.includes(q)) return false;
                  }
                  return true;
                });

                return (
                  <>
                    {/* 4 Summary Metric Cards */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 16,
                      }}
                    >
                      {/* Total Devices Tracked */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '18px 20px',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Registered Devices
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span>{rawDevicesList.length}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8' }}>/ 10 max</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                          Historical sessions recorded
                        </div>
                      </div>

                      {/* Active Sessions Online */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '18px 20px',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Active Sessions Online
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: onlineCount > 0 ? '#16A34A' : '#64748B', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: onlineCount > 0 ? '#22C55E' : '#94A3B8',
                              boxShadow: onlineCount > 0 ? '0 0 0 4px rgba(34, 197, 94, 0.2)' : 'none',
                            }}
                          />
                          <span>{onlineCount}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                          {onlineCount > 0 ? 'Currently transmitting heartbeat' : 'No active connections'}
                        </div>
                      </div>

                      {/* Device Breakdown */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '18px 20px',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Device Breakdown
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                            {desktopCount} Desktop
                          </span>
                          <span style={{ color: '#CBD5E1' }}>•</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                            {mobileCount} Mobile
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                          Form factors detected
                        </div>
                      </div>

                      {/* Latest Activity */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '18px 20px',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Latest Activity
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mostRecentTime ? formatRelativeTime(mostRecentTime) : 'Never'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }} title={formatLastUsedDate(mostRecentTime)}>
                          {mostRecentTime ? formatLastUsedDate(mostRecentTime) : 'Awaiting first login'}
                        </div>
                      </div>
                    </div>

                    {/* Filter Tabs & Search Bar */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        padding: '12px 18px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Filter Pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { key: 'ALL' as const, label: 'All Devices', count: rawDevicesList.length },
                          { key: 'ACTIVE' as const, label: 'Active Now', count: onlineCount },
                          { key: 'DESKTOP' as const, label: 'Desktop', count: desktopCount },
                          { key: 'MOBILE' as const, label: 'Mobile', count: mobileCount },
                        ].map((tab) => {
                          const isActive = deviceTabFilter === tab.key;
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setDeviceTabFilter(tab.key)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                                backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                                color: isActive ? '#1D4ED8' : '#64748B',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{tab.label}</span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  backgroundColor: isActive ? '#DBEAFE' : '#F1F5F9',
                                  color: isActive ? '#1E40AF' : '#64748B',
                                }}
                              >
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Search Input */}
                      <div style={{ position: 'relative', minWidth: 260, maxWidth: 360, flex: '1 1 240px' }}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94A3B8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          value={deviceSearchQuery}
                          onChange={(e) => setDeviceSearchQuery(e.target.value)}
                          placeholder="Search device, browser, OS, IP..."
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            color: '#0F172A',
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Full Width Devices Table Card */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        overflow: 'hidden',
                      }}
                    >
                      {isFetchingDevices ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#2563EB', fontWeight: 600, fontSize: 14 }}>
                          Fetching device security audit history...
                        </div>
                      ) : rawDevicesList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 24px', color: '#64748B' }}>
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 12,
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 16px',
                            }}
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                          </div>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 15, marginBottom: 6 }}>
                            No device history yet - will track from next login
                          </div>
                          <div style={{ fontSize: 13, color: '#64748B', maxWidth: 420, margin: '0 auto' }}>
                            Device information will be automatically recorded when this administrator logs in.
                          </div>
                        </div>
                      ) : filteredDevicesList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, marginBottom: 4 }}>
                            No devices match the selected filters
                          </div>
                          <div style={{ fontSize: 13, color: '#94A3B8' }}>
                            Try clearing your search query or switching tabs.
                          </div>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Device & Location
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Browser
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Operating System
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  IP Address
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Last Login
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Last Active
                                </th>
                                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  Session Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDevicesList.map((device, idx) => {
                                const devName = device.deviceName || (device as any).device_name || 'Windows PC';
                                const devOs = device.os || 'Windows 11';
                                const devBrowser = device.browser || 'Chrome';
                                const devIp = device.ipAddress || (device as any).ip_address || '—';
                                const loginTime = device.loginAt || (device as any).last_login_at;
                                const activeTime = device.lastActiveAt || (device as any).last_active_at;
                                const isOnline = isDeviceActiveNow(device);
                                const isMobile = (devName + ' ' + devOs).toLowerCase().includes('phone') ||
                                  (devName + ' ' + devOs).toLowerCase().includes('mobile') ||
                                  (devName + ' ' + devOs).toLowerCase().includes('ios') ||
                                  (devName + ' ' + devOs).toLowerCase().includes('android');

                                return (
                                  <tr
                                    key={device.id || `dev-${idx}`}
                                    style={{
                                      borderBottom: idx < filteredDevicesList.length - 1 ? '1px solid #F1F5F9' : 'none',
                                      backgroundColor: isOnline ? '#F0FDF4' : idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                  >
                                    {/* Device & Location */}
                                    <td style={{ padding: '14px 20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div
                                          style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            backgroundColor: isOnline ? '#DCFCE7' : '#F1F5F9',
                                            color: isOnline ? '#16A34A' : '#64748B',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            border: isOnline ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                          }}
                                        >
                                          {isMobile ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                              <line x1="12" y1="18" x2="12.01" y2="18" />
                                            </svg>
                                          ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                              <line x1="8" y1="21" x2="16" y2="21" />
                                              <line x1="12" y1="17" x2="12" y2="21" />
                                            </svg>
                                          )}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
                                            {devName}
                                          </div>
                                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                            {device.location || 'Unknown Location'}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Browser */}
                                    <td style={{ padding: '14px 20px', color: '#1E293B', fontWeight: 500 }}>
                                      <span
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          backgroundColor: '#F8FAFC',
                                          border: '1px solid #E2E8F0',
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: '#334155',
                                        }}
                                      >
                                        {devBrowser}
                                      </span>
                                    </td>

                                    {/* Operating System */}
                                    <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 500 }}>
                                      {devOs}
                                    </td>

                                    {/* IP Address */}
                                    <td style={{ padding: '14px 20px' }}>
                                      <code
                                        style={{
                                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                          fontSize: 12,
                                          color: '#0F172A',
                                          backgroundColor: '#F1F5F9',
                                          padding: '3px 8px',
                                          borderRadius: 6,
                                          border: '1px solid #E2E8F0',
                                        }}
                                      >
                                        {devIp}
                                      </code>
                                    </td>

                                    {/* Last Login */}
                                    <td style={{ padding: '14px 20px', color: '#475569' }} title={formatLastUsedDate(loginTime)}>
                                      <div style={{ fontWeight: 500, color: '#1E293B' }}>
                                        {formatRelativeTime(loginTime)}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                        {formatLastUsedDate(loginTime)}
                                      </div>
                                    </td>

                                    {/* Last Active */}
                                    <td style={{ padding: '14px 20px' }} title={formatLastUsedDate(activeTime)}>
                                      {isOnline ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                          <span
                                            style={{
                                              width: 7,
                                              height: 7,
                                              borderRadius: '50%',
                                              backgroundColor: '#22C55E',
                                              boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
                                            }}
                                          />
                                          <span style={{ color: '#15803D', fontWeight: 700, fontSize: 12 }}>Active now</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ fontWeight: 500, color: '#475569' }}>
                                            {formatRelativeTime(activeTime)}
                                          </div>
                                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                            {formatLastUsedDate(activeTime)}
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    {/* Session Status */}
                                    <td style={{ padding: '14px 20px' }}>
                                      {isOnline ? (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            padding: '3px 10px',
                                            borderRadius: 9999,
                                            backgroundColor: '#DCFCE7',
                                            color: '#166534',
                                            border: '1px solid #BBF7D0',
                                          }}
                                        >
                                          <span
                                            style={{
                                              width: 6,
                                              height: 6,
                                              borderRadius: '50%',
                                              backgroundColor: '#22C55E',
                                            }}
                                          />
                                          Active Now
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            padding: '3px 10px',
                                            borderRadius: 9999,
                                            backgroundColor: '#F1F5F9',
                                            color: '#64748B',
                                            border: '1px solid #E2E8F0',
                                          }}
                                        >
                                          <span
                                            style={{
                                              width: 6,
                                              height: 6,
                                              borderRadius: '50%',
                                              backgroundColor: '#94A3B8',
                                            }}
                                          />
                                          {device.logoutAt || (device as any).logout_at ? 'Logged Out' : 'Last seen'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Full Screen Footer */}
            <footer
              style={{
                padding: '14px 32px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF',
                fontSize: 12,
                color: '#64748B',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <span>Security Policy: Device activity is automatically captured on login and authenticated requests. Retains up to 10 latest sessions per user.</span>
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Back to Users Directory
              </button>
            </footer>
          </div>
      )}
    </div>
  );
}
