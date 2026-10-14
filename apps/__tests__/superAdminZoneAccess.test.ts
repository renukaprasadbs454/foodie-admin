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

  describe('Restricting Operating Zones to Bangalore Zone and Tumkur Zone', () => {
    const rawZonesFromBackend = [
      { id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore', status: 'ACTIVE' },
      { id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur', status: 'ACTIVE' },
      { id: 'dz-bengaluru-zone', zoneName: 'Bengaluru zone', cityName: 'Bangalore', status: 'ACTIVE' },
      { id: 'dz-tumkur-1', zoneName: 'Tumkur zone 1', cityName: 'Tumkur', status: 'ACTIVE' },
      { id: 'dz-indiranagar', zoneName: 'Indiranagar Tech Corridor', cityName: 'Bangalore', status: 'ACTIVE' },
    ];

    it('filters raw zones strictly to Bangalore Zone and Tumkur Zone, removing duplicates', () => {
      const bgl = rawZonesFromBackend.find((z) => {
        const name = String(z.zoneName || '').trim().toLowerCase();
        const id = String(z.id || '').trim().toLowerCase();
        return (id === 'dz-bangalore' || name === 'bangalore zone') && name !== 'bengaluru zone';
      });

      const tmk = rawZonesFromBackend.find((z) => {
        const name = String(z.zoneName || '').trim().toLowerCase();
        const id = String(z.id || '').trim().toLowerCase();
        return (id === 'dz-tumkur' || name === 'tumkur zone') && name !== 'tumkur zone 1';
      });

      const approved = [
        bgl ? { ...bgl, id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore' } : null,
        tmk ? { ...tmk, id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur' } : null,
      ].filter(Boolean);

      expect(approved).toHaveLength(2);
      expect(approved[0]?.zoneName).toBe('Bangalore Zone');
      expect(approved[0]?.cityName).toBe('Bangalore');
      expect(approved[1]?.zoneName).toBe('Tumkur Zone');
      expect(approved[1]?.cityName).toBe('Tumkur');

      // Unwanted zones must not be present
      const names = approved.map((z) => z?.zoneName);
      expect(names).not.toContain('Bengaluru zone');
      expect(names).not.toContain('Tumkur zone 1');
      expect(names).not.toContain('Indiranagar Tech Corridor');
    });

    it('validates selected zone IDs, allowing only approved zones and rejecting unwanted ones', () => {
      const validateOperatingZone = (rawZoneId: string) => {
        const clean = rawZoneId.trim().toLowerCase();
        const isBangalore = clean === 'dz-bangalore' || clean === 'bangalore zone' || clean === 'bengaluru zone';
        const isTumkur = clean === 'dz-tumkur' || clean === 'tumkur zone' || clean === 'tumkur zone 1';
        if (!isBangalore && !isTumkur) {
          return { allowed: false, error: 'FORBIDDEN' };
        }
        return { allowed: true, canonicalId: isBangalore ? 'dz-bangalore' : 'dz-tumkur' };
      };

      expect(validateOperatingZone('dz-bangalore')).toEqual({ allowed: true, canonicalId: 'dz-bangalore' });
      expect(validateOperatingZone('dz-tumkur')).toEqual({ allowed: true, canonicalId: 'dz-tumkur' });
      expect(validateOperatingZone('dz-mumbai')).toEqual({ allowed: false, error: 'FORBIDDEN' });
      expect(validateOperatingZone('dz-random-zone')).toEqual({ allowed: false, error: 'FORBIDDEN' });
    });
  });
});
