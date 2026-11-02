import {
  normalizeRoleToDropdownValue,
  getRoleDisplayName,
  formatRoleBadge,
  type AdminUser,
} from '../features/users/types/usersTypes';

describe('Edit Role Dropdown Display and Role Normalization', () => {
  describe('1. Role Normalization to Dropdown Values', () => {
    it('correctly maps Operations variations to OPS', () => {
      expect(normalizeRoleToDropdownValue('OPS')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('OPERATIONS')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('OPERATIONS_ADMIN')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('ROLE_OPS')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('ROLE_OPERATIONS_ADMIN')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('operations_admin')).toBe('OPS');
      expect(normalizeRoleToDropdownValue('dispatch_manager')).toBe('OPS');
    });

    it('correctly maps Finance variations to FINANCE', () => {
      expect(normalizeRoleToDropdownValue('FINANCE')).toBe('FINANCE');
      expect(normalizeRoleToDropdownValue('FINANCE_ADMIN')).toBe('FINANCE');
      expect(normalizeRoleToDropdownValue('ROLE_FINANCE')).toBe('FINANCE');
      expect(normalizeRoleToDropdownValue('ROLE_FINANCE_ADMIN')).toBe('FINANCE');
      expect(normalizeRoleToDropdownValue('finance_admin')).toBe('FINANCE');
      expect(normalizeRoleToDropdownValue('corporate_finance')).toBe('FINANCE');
    });

    it('correctly maps Support Desk variations to SUPPORT', () => {
      expect(normalizeRoleToDropdownValue('SUPPORT')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('SUPPORT_DESK')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('SUPPORT_AGENT')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('ROLE_SUPPORT')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('ROLE_SUPPORT_DESK')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('ROLE_SUPPORT_AGENT')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('support_desk')).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('ticket_support')).toBe('SUPPORT');
    });

    it('correctly maps Super Admin genuine roles to SUPER_ADMIN', () => {
      expect(normalizeRoleToDropdownValue('SUPER_ADMIN')).toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('ROLE_SUPER_ADMIN')).toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('SUPERADMIN')).toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('super_admin')).toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('ROOT')).toBe('SUPER_ADMIN');
    });

    it('NEVER defaults to SUPER_ADMIN for missing, unmapped, or null roles', () => {
      expect(normalizeRoleToDropdownValue(null)).not.toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue(undefined)).not.toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('')).not.toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('   ')).not.toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('UNKNOWN_ROLE')).not.toBe('SUPER_ADMIN');
      expect(normalizeRoleToDropdownValue('AUDITOR')).not.toBe('SUPER_ADMIN');

      // Safe default is non-elevated SUPPORT
      expect(normalizeRoleToDropdownValue(null)).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue(undefined)).toBe('SUPPORT');
      expect(normalizeRoleToDropdownValue('')).toBe('SUPPORT');
    });
  });

  describe('2. Dropdown Display Names and Human-Friendly Labels', () => {
    it('returns exact dropdown option labels for each role', () => {
      expect(getRoleDisplayName('SUPER_ADMIN')).toBe('Super Admin (Full Control)');
      expect(getRoleDisplayName('OPS')).toBe('Operations (Manage Merchants & Dispatch)');
      expect(getRoleDisplayName('OPERATIONS_ADMIN')).toBe('Operations (Manage Merchants & Dispatch)');
      expect(getRoleDisplayName('FINANCE')).toBe('Finance (Payments & Refunds)');
      expect(getRoleDisplayName('FINANCE_ADMIN')).toBe('Finance (Payments & Refunds)');
      expect(getRoleDisplayName('SUPPORT')).toBe('Support Desk (Tickets Only)');
      expect(getRoleDisplayName('SUPPORT_AGENT')).toBe('Support Desk (Tickets Only)');
      expect(getRoleDisplayName('SUPPORT_DESK')).toBe('Support Desk (Tickets Only)');
    });
  });

  describe('3. Role Badges in Users Directory Table', () => {
    it('formats badges accurately for all role variations', () => {
      const opsBadge = formatRoleBadge('OPERATIONS_ADMIN');
      expect(opsBadge.label).toBe('OPERATIONS');
      expect(opsBadge.color).toBe('#047857');

      const financeBadge = formatRoleBadge('FINANCE_ADMIN');
      expect(financeBadge.label).toBe('FINANCE');
      expect(financeBadge.color).toBe('#B45309');

      const supportAgentBadge = formatRoleBadge('SUPPORT_AGENT');
      expect(supportAgentBadge.label).toBe('SUPPORT DESK');
      expect(supportAgentBadge.color).toBe('#1D4ED8');

      const supportDeskBadge = formatRoleBadge('SUPPORT_DESK');
      expect(supportDeskBadge.label).toBe('SUPPORT DESK');
      expect(supportDeskBadge.color).toBe('#1D4ED8');

      const superAdminBadge = formatRoleBadge('SUPER_ADMIN');
      expect(superAdminBadge.label).toBe('SUPER ADMIN');
      expect(superAdminBadge.color).toBe('#7C3AED');
    });
  });

  describe('4. Simulated End-to-End Edit Role Workflow', () => {
    it('preserves the user actual saved role and reloads it on reopening', () => {
      // User whose role was previously saved as Finance
      const mockUser: AdminUser = {
        id: 'USR-1003',
        fullName: 'Finance Admin',
        email: 'finance@foodie.local',
        phone: '+91 9999999995',
        role: 'FINANCE_ADMIN' as any,
        accountStatus: 'ACTIVE',
        joinedDate: '2025-06-20',
        lastActive: '1 hour ago',
        department: 'Corporate Finance & Payouts',
      };

      // Step 1: Open Edit Role
      // Must map FINANCE_ADMIN -> FINANCE
      const initialSelectedRole = normalizeRoleToDropdownValue(mockUser.role);
      expect(initialSelectedRole).toBe('FINANCE');
      expect(initialSelectedRole).not.toBe('SUPER_ADMIN');

      // Step 2: Super Admin changes dropdown to Support Desk
      const selectedDropdownValue = 'SUPPORT';
      const roleToSave = normalizeRoleToDropdownValue(selectedDropdownValue);
      expect(roleToSave).toBe('SUPPORT');

      // Step 3: Save Privilege (Simulated persistence)
      const updatedUser: AdminUser = {
        ...mockUser,
        role: roleToSave,
      };

      // Step 4: Reopen Edit Role for the same user
      const reopenedSelectedRole = normalizeRoleToDropdownValue(updatedUser.role);
      expect(reopenedSelectedRole).toBe('SUPPORT');
      expect(reopenedSelectedRole).not.toBe('SUPER_ADMIN');
      expect(getRoleDisplayName(reopenedSelectedRole)).toBe('Support Desk (Tickets Only)');
    });

    it('works if user was previously saved as Operations Admin', () => {
      const mockUser: AdminUser = {
        id: 'USR-1002',
        fullName: 'Operations Admin',
        email: 'ops@foodie.local',
        phone: '+91 9999999996',
        role: 'OPERATIONS_ADMIN' as any,
        accountStatus: 'ACTIVE',
        joinedDate: '2025-03-15',
        lastActive: '12 mins ago',
        department: 'Logistics & Merchant Ops',
      };

      // When opening Edit Role, dropdown MUST select Operations (OPS), never SUPER_ADMIN
      const initialSelectedRole = normalizeRoleToDropdownValue(mockUser.role);
      expect(initialSelectedRole).toBe('OPS');
      expect(initialSelectedRole).not.toBe('SUPER_ADMIN');
      expect(getRoleDisplayName(initialSelectedRole)).toBe('Operations (Manage Merchants & Dispatch)');
    });
  });
});

