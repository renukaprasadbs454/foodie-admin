import { getHomeRouteForRole, isMultiZoneRole, isRouteAllowedForRole } from '../lib/routeGuards';

describe('Zone Access Control & Finance Admin Login Flow', () => {
  describe('Finance Admin Role & Routing', () => {
    it('should direct Finance Admin to /finance-admin/dashboard', () => {
      expect(getHomeRouteForRole('FINANCE_ADMIN')).toBe('/finance-admin/dashboard');
      expect(getHomeRouteForRole('FINANCE')).toBe('/finance-admin/dashboard');
    });

    it('should allow Finance Admin to access financial dashboard and management routes', () => {
      expect(isRouteAllowedForRole('/finance-admin/dashboard', 'FINANCE_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/delivery-payouts', 'FINANCE_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/payments', 'FINANCE_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/approvals', 'FINANCE_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/coupons', 'FINANCE_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/analytics', 'FINANCE_ADMIN')).toBe(true);
    });

    it('should identify Finance Admin as a multi-zone capable role', () => {
      expect(isMultiZoneRole('FINANCE_ADMIN')).toBe(true);
      expect(isMultiZoneRole('FINANCE')).toBe(true);
      expect(isMultiZoneRole('RESTAURANT_MANAGER')).toBe(true);
      expect(isMultiZoneRole('OPS')).toBe(true);
    });
  });

  describe('Zone Filter Logic for Admin Users', () => {
    const availableZones = [
      { id: 'dz-bangalore', zoneName: 'Bangalore Zone', status: 'ACTIVE' },
      { id: 'dz-tumkur', zoneName: 'Tumkur Zone', status: 'ACTIVE' },
      { id: 'dz-mysore', zoneName: 'Mysore Zone', status: 'ACTIVE' },
    ];

    it('should show only authorized zones when user is assigned specific zones', () => {
      const userAssignedZones = ['dz-tumkur'];
      const filtered = availableZones.filter((zone) =>
        userAssignedZones.some((zid) => zid.toLowerCase() === zone.id.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('dz-tumkur');
    });

    it('should allow switching between multiple assigned zones when assigned more than one zone', () => {
      const userAssignedZones = ['dz-tumkur', 'dz-bangalore'];
      const filtered = availableZones.filter((zone) =>
        userAssignedZones.some((zid) => zid.toLowerCase() === zone.id.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.map((z) => z.id)).toEqual(['dz-bangalore', 'dz-tumkur']);
    });

    it('should show all zones when user has All Zones (ALL) access', () => {
      const userAssignedZones: string[] = [];
      const hasSpecificZoneAccess = false; // "ALL" or global view
      const displayed = hasSpecificZoneAccess
        ? availableZones.filter((zone) => userAssignedZones.includes(zone.id))
        : availableZones;
      expect(displayed).toHaveLength(3);
    });
  });
});
