'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AdminProfile {
  adminUserId: string;
  userCredentialId: string;
  fullName: string;
  role: string;
  profileImageKey?: string;
  restaurantId?: string | null;
  permissions: string[];
}

interface PermissionContextType {
  profile: AdminProfile | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isRestaurantAllowed: (targetRestaurantId?: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  FINANCE_ADMIN: [
    'payment.view', 'payment.create', 'payment.refund', 'refund.view', 'refund.request',
    'refund.approve', 'refund.process', 'settlement.view', 'settlement.hold', 'settlement.release',
    'settlement.retry', 'invoice.view', 'invoice.create', 'ledger.view', 'ledger.adjust',
    'reconciliation.view', 'reconciliation.run', 'commission.view', 'commission.update',
    'order.view', 'audit_log.view'
  ],
  FINANCE: [
    'payment.view', 'payment.create', 'payment.refund', 'refund.view', 'refund.request',
    'refund.approve', 'refund.process', 'settlement.view', 'settlement.hold', 'settlement.release',
    'settlement.retry', 'invoice.view', 'invoice.create', 'ledger.view', 'ledger.adjust',
    'reconciliation.view', 'reconciliation.run', 'commission.view', 'commission.update',
    'order.view', 'audit_log.view'
  ],
  OPERATIONS_ADMIN: [
    'order.view', 'order.update', 'order.cancel', 'payment.view', 'refund.view',
    'refund.request', 'restaurant.view', 'restaurant.update'
  ],
  OPS: [
    'order.view', 'order.update', 'order.cancel', 'payment.view', 'refund.view',
    'refund.request', 'restaurant.view', 'restaurant.update'
  ],
  RESTAURANT_MANAGER: [
    'order.view', 'order.update', 'order.cancel', 'settlement.view', 'refund.view',
    'refund.request', 'ledger.view', 'restaurant.view', 'restaurant.update'
  ],
  SUPPORT_AGENT: [
    'payment.view', 'order.view', 'refund.view', 'refund.request', 'invoice.view', 'restaurant.view'
  ],
  SUPPORT: [
    'payment.view', 'order.view', 'refund.view', 'refund.request', 'invoice.view', 'restaurant.view'
  ],
  AUDITOR: [
    'payment.view', 'refund.view', 'settlement.view', 'invoice.view', 'ledger.view',
    'reconciliation.view', 'commission.view', 'order.view', 'restaurant.view', 'audit_log.view'
  ],
};

const PermissionContext = createContext<PermissionContextType>({
  profile: null,
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isRestaurantAllowed: () => true,
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('foodie_admin_token') || sessionStorage.getItem('foodie_admin_token');
        const res = await fetch('/api/bff/admin/users/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          const profileData = body.data || body;
          if (mounted && profileData && profileData.role) {
            const role = String(profileData.role || '').toUpperCase();
            const defaultPerms = ROLE_PERMISSIONS[role] || (role === 'SUPER_ADMIN' ? ['*'] : []);
            const perms = Array.isArray(profileData.permissions) && profileData.permissions.length > 0
              ? profileData.permissions
              : defaultPerms;

            setProfile({
              adminUserId: profileData.adminUserId || '44444444-4444-4444-4444-444444444001',
              userCredentialId: profileData.userCredentialId || '33333333-3333-3333-3333-333333333001',
              fullName: profileData.fullName || 'Admin User',
              role,
              restaurantId: profileData.restaurantId || null,
              profileImageKey: profileData.profileImageKey,
              permissions: perms,
            });
            return;
          }
        }
        if (mounted) {
          const token = localStorage.getItem('foodie_admin_token') || sessionStorage.getItem('foodie_admin_token');
          const rawRole = localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role') || 'SUPER_ADMIN';
          const storedRole = String(rawRole).toUpperCase();
          if (token || storedRole) {
            setProfile({
              adminUserId: '44444444-4444-4444-4444-444444444001',
              userCredentialId: '33333333-3333-3333-3333-333333333001',
              fullName: `${storedRole.replace('_', ' ')} User`,
              role: storedRole,
              permissions: ROLE_PERMISSIONS[storedRole] || ROLE_PERMISSIONS.SUPER_ADMIN,
            });
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void fetchMe();
    return () => {
      mounted = false;
    };
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN') return true;
    const perms = Array.isArray(profile.permissions) ? profile.permissions : [];
    if (perms.includes('*')) return true;
    const normPermission = permission.toLowerCase();
    return perms.some(
      (p) => typeof p === 'string' && (p.toLowerCase() === normPermission || p === '*')
    );
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return Array.isArray(permissions) && permissions.some((p) => hasPermission(p));
  };

  const isRestaurantAllowed = (targetRestaurantId?: string): boolean => {
    if (!profile) return false;
    if (profile.role !== 'RESTAURANT_MANAGER') return true;
    if (!targetRestaurantId) return true;
    return profile.restaurantId === targetRestaurantId;
  };

  return (
    <PermissionContext.Provider
      value={{
        profile,
        loading,
        hasPermission,
        hasAnyPermission,
        isRestaurantAllowed,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
