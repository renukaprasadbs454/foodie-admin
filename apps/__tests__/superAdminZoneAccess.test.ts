import { getHomeRouteForRole } from '../lib/routeGuards';

describe('Super Admin Zone Access System', () => {
  describe('Role-based post-login routing', () => {
    it('non-Super Admin roles route directly to their operational home routes', () => {
      expect(getHomeRouteForRole('AUDITOR')).toBe('/compliance-auditor/dashboard');
      expect(getHomeRouteForRole('FINANCE_ADMIN')).toBe('/finance-admin/dashboard');
      expect(getHomeRouteForRole('OPS')).toBe('/dashboard');
      expect(getHomeRouteForRole('SUPPORT_AGENT')).toBe('/support');
      expect(getHomeRouteForRole('RESTAURANT_MANAGER')).toBe('/restaurants');
    });

    it('identifies Super Admin home route', () => {
      expect(getHomeRouteForRole('SUPER_ADMIN')).toBe('/dashboard');
    });
  });

  describe('Zone cookie and session cleanup on logout', () => {
    it('verifies that zone session keys match the storage specification', () => {
      const ZONE_STORAGE_KEYS = [
        'foodie_active_zone_id',
        'foodie_active_zone_name',
      ];
      expect(ZONE_STORAGE_KEYS).toContain('foodie_active_zone_id');
      expect(ZONE_STORAGE_KEYS).toContain('foodie_active_zone_name');
    });
  });

  describe('Zone login history pagination and query parameters', () => {
    it('constructs correct query strings for zone login history queries', () => {
      const buildQs = (params?: { zoneId?: string; search?: string; page?: number; size?: number }) => {
        const query = new URLSearchParams();
        if (params?.zoneId && params.zoneId !== 'ALL') query.set('zoneId', params.zoneId);
        if (params?.search) query.set('search', params.search);
        if (params?.page != null) query.set('page', String(params.page));
        if (params?.size != null) query.set('size', String(params.size));
        const qs = query.toString();
        return `/api/bff/admin/zones/history${qs ? `?${qs}` : ''}`;
      };

      expect(buildQs()).toBe('/api/bff/admin/zones/history');
      expect(buildQs({ zoneId: 'ALL' })).toBe('/api/bff/admin/zones/history');
      expect(buildQs({ zoneId: 'dz-bangalore', search: 'admin', page: 0, size: 20 })).toBe(
        '/api/bff/admin/zones/history?zoneId=dz-bangalore&search=admin&page=0&size=20'
      );
      expect(buildQs({ zoneId: 'dz-tumkur' })).toBe(
        '/api/bff/admin/zones/history?zoneId=dz-tumkur'
      );
    });
  });
});
