import type { AdminRole } from 'foodie-shared-web';

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED';

export type DropdownAdminRole = 'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'SUPPORT';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  accountStatus: UserAccountStatus;
  joinedDate: string;
  lastActive: string;
  department: string;
  avatarUrl?: string;
  assignedZoneId?: string;
  assignedZoneName?: string;
  assignedZoneIds?: string[];
}

/**
 * Normalizes any role representation (e.g. OPERATIONS_ADMIN, ROLE_OPS, FINANCE_ADMIN,
 * SUPPORT_DESK, SUPPORT_AGENT, etc.) into the canonical dropdown role options:
 * - 'SUPER_ADMIN' (Super Admin (Full Control))
 * - 'OPS' (Operations (Manage Merchants & Dispatch))
 * - 'FINANCE' (Finance (Payments & Refunds))
 * - 'SUPPORT' (Support Desk (Tickets Only))
 *
 * CRITICAL RULE: Never default to Super Admin when the role value is missing,
 * differently formatted, unmapped, or loading.
 */
export function normalizeRoleToDropdownValue(rawRole?: AdminRole | string | null): DropdownAdminRole {
  if (!rawRole || typeof rawRole !== 'string') {
    return 'SUPPORT'; // Safe, non-elevated default
  }

  const clean = rawRole.trim().toUpperCase().replace(/^ROLE_/, '');

  // Only genuinely Super Admin accounts get SUPER_ADMIN
  if (clean === 'SUPER_ADMIN' || clean === 'SUPERADMIN' || clean === 'ROOT') {
    return 'SUPER_ADMIN';
  }

  // Operations: OPS, OPERATIONS, OPERATIONS_ADMIN, DISPATCH, LOGISTICS
  if (
    clean === 'OPS' ||
    clean === 'OPERATIONS' ||
    clean === 'OPERATIONS_ADMIN' ||
    clean.includes('OPERAT') ||
    clean.includes('DISPATCH') ||
    clean.includes('LOGISTICS')
  ) {
    return 'OPS';
  }

  // Finance: FINANCE, FINANCE_ADMIN, PAYMENTS, PAYOUTS
  if (
    clean === 'FINANCE' ||
    clean === 'FINANCE_ADMIN' ||
    clean.includes('FINANCE') ||
    clean.includes('PAYOUT') ||
    clean.includes('PAYMENT')
  ) {
    return 'FINANCE';
  }

  // Support Desk: SUPPORT, SUPPORT_DESK, SUPPORT_AGENT, TICKETS
  if (
    clean === 'SUPPORT' ||
    clean === 'SUPPORT_DESK' ||
    clean === 'SUPPORT_AGENT' ||
    clean.includes('SUPPORT') ||
    clean.includes('DESK') ||
    clean.includes('TICKET')
  ) {
    return 'SUPPORT';
  }

  // Never default to Super Admin for unrecognized roles
  return 'SUPPORT';
}

/**
 * Returns human-friendly display label and description for UI and toasts.
 */
export function getRoleDisplayName(role?: AdminRole | string | null): string {
  const normalized = normalizeRoleToDropdownValue(role);
  switch (normalized) {
    case 'SUPER_ADMIN':
      return 'Super Admin (Full Control)';
    case 'OPS':
      return 'Operations (Manage Merchants & Dispatch)';
    case 'FINANCE':
      return 'Finance (Payments & Refunds)';
    case 'SUPPORT':
      return 'Support Desk (Tickets Only)';
    default:
      return 'Support Desk (Tickets Only)';
  }
}

export function formatRoleBadge(role?: AdminRole | string | null): { label: string; color: string; bg: string; border: string } {
  if (!role) {
    return { label: 'STAFF', color: '#075985', bg: '#F1F5F9', border: '#CBD5E1' };
  }
  const clean = String(role).trim().toUpperCase().replace(/^ROLE_/, '');
  if (clean === 'SUPER_ADMIN' || clean === 'SUPERADMIN' || clean === 'ROOT') {
    return { label: 'SUPER ADMIN', color: '#7C3AED', bg: '#F3E8FF', border: '#D8B4FE' };
  }
  if (clean === 'OPS' || clean === 'OPERATIONS' || clean === 'OPERATIONS_ADMIN' || clean.includes('OPERAT')) {
    return { label: 'OPERATIONS', color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' };
  }
  if (clean === 'FINANCE' || clean === 'FINANCE_ADMIN' || clean.includes('FINANCE')) {
    return { label: 'FINANCE', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
  }
  if (clean === 'SUPPORT' || clean === 'SUPPORT_DESK' || clean === 'SUPPORT_AGENT' || clean.includes('SUPPORT')) {
    return { label: 'SUPPORT DESK', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' };
  }
  return { label: clean, color: '#075985', bg: '#F1F5F9', border: '#CBD5E1' };
}

export function formatStatusBadge(status: UserAccountStatus): { label: string; color: string; bg: string } {
  return status === 'ACTIVE'
    ? { label: '● Active', color: '#166534', bg: '#DCFCE7' }
    : { label: '○ Suspended', color: '#DC2626', bg: '#FEE2E2' };
}
