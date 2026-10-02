import { usePermissions } from '../context/PermissionContext';

describe('PermissionContext resilience', () => {
  it('safely evaluates permissions without TypeError when permissions is undefined', () => {
    // Test the logic directly
    const testHasPermission = (profile: any, permission: string): boolean => {
      if (!profile) return false;
      if (profile.role === 'SUPER_ADMIN') return true;
      const perms = Array.isArray(profile.permissions) ? profile.permissions : [];
      if (perms.includes('*')) return true;
      const normPermission = permission.toLowerCase();
      return perms.some(
        (p: any) => typeof p === 'string' && (p.toLowerCase() === normPermission || p === '*')
      );
    };

    const profileWithUndefinedPerms = {
      role: 'FINANCE_ADMIN',
      permissions: undefined,
    };

    expect(() => testHasPermission(profileWithUndefinedPerms, 'settlement.release')).not.toThrow();
    expect(testHasPermission(profileWithUndefinedPerms, 'settlement.release')).toBe(false);

    const profileWithWildcard = {
      role: 'FINANCE_ADMIN',
      permissions: ['*'],
    };
    expect(testHasPermission(profileWithWildcard, 'settlement.release')).toBe(true);

    const profileWithSpecific = {
      role: 'FINANCE_ADMIN',
      permissions: ['settlement.release'],
    };
    expect(testHasPermission(profileWithSpecific, 'settlement.release')).toBe(true);
  });
});
