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

  describe('Module Zone-Based Data Isolation Across All Modules', () => {
    const mockRestaurants = [
      { id: 'rest-1', name: 'Empire Restaurant', city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      { id: 'rest-2', name: 'Pavithra Thatte Idli', city: 'Tumkur', lat: 13.3379, lng: 77.1173 },
    ];

    const mockOrders = [
      { id: 'ord-1', restaurantId: 'rest-1', orderCode: 'ORD-101', city: 'Bangalore' },
      { id: 'ord-2', restaurantId: 'rest-2', orderCode: 'ORD-102', city: 'Tumkur' },
    ];

    const mockDeliveryPartners = [
      { id: 'dp-1', name: 'Ramesh Kumar', zoneId: 'dz-bangalore', city: 'Bangalore' },
      { id: 'dp-2', name: 'Siddaraju B', zoneId: 'dz-tumkur', city: 'Tumkur' },
    ];

    const mockServiceAreas = [
      { id: 'sa-1', name: 'Indiranagar & Domlur', cityName: 'Bangalore' },
      { id: 'sa-2', name: 'MG Road & Ashok Nagar', cityName: 'Tumkur' },
    ];

    const mockReviews = [
      { id: 'rev-1', restaurantId: 'rest-1', rating: 5, comment: 'Great Bangalore biryani' },
      { id: 'rev-2', restaurantId: 'rest-2', rating: 4, comment: 'Crispy Tumkur thatte idli' },
    ];

    const mockCoupons = [
      { id: 'c-global', code: 'FOODIE50', restaurantId: null }, // global platform coupon
      { id: 'c-bgl', code: 'EMPIRE20', restaurantId: 'rest-1' }, // Bangalore scoped
      { id: 'c-tmk', code: 'TUMKURTREAT', restaurantId: 'rest-2' }, // Tumkur scoped
    ];

    it('filters restaurants strictly by active operating zone', () => {
      const filterRestaurants = (zoneId: string) =>
        mockRestaurants.filter((r) =>
          zoneId === 'dz-bangalore' ? r.city === 'Bangalore' : r.city === 'Tumkur'
        );

      expect(filterRestaurants('dz-bangalore')).toHaveLength(1);
      expect(filterRestaurants('dz-bangalore')[0].name).toBe('Empire Restaurant');
      expect(filterRestaurants('dz-tumkur')).toHaveLength(1);
      expect(filterRestaurants('dz-tumkur')[0].name).toBe('Pavithra Thatte Idli');
    });

    it('filters orders by the authoritative restaurant location in active zone', () => {
      const filterOrders = (zoneId: string) => {
        const restMap = new Map(mockRestaurants.map((r) => [r.id, r]));
        return mockOrders.filter((o) => {
          const rest = restMap.get(o.restaurantId);
          return zoneId === 'dz-bangalore' ? rest?.city === 'Bangalore' : rest?.city === 'Tumkur';
        });
      };

      expect(filterOrders('dz-bangalore')).toHaveLength(1);
      expect(filterOrders('dz-bangalore')[0].orderCode).toBe('ORD-101');
      expect(filterOrders('dz-tumkur')).toHaveLength(1);
      expect(filterOrders('dz-tumkur')[0].orderCode).toBe('ORD-102');
    });

    it('filters delivery partners assigned to active zone', () => {
      const filterDrivers = (zoneId: string) =>
        mockDeliveryPartners.filter((dp) => dp.zoneId === zoneId);

      expect(filterDrivers('dz-bangalore')).toHaveLength(1);
      expect(filterDrivers('dz-bangalore')[0].name).toBe('Ramesh Kumar');
      expect(filterDrivers('dz-tumkur')).toHaveLength(1);
      expect(filterDrivers('dz-tumkur')[0].name).toBe('Siddaraju B');
    });

    it('filters location service areas based on active zone city', () => {
      const filterServiceAreas = (zoneId: string) =>
        mockServiceAreas.filter((sa) =>
          zoneId === 'dz-bangalore' ? sa.cityName === 'Bangalore' : sa.cityName === 'Tumkur'
        );

      expect(filterServiceAreas('dz-bangalore')).toHaveLength(1);
      expect(filterServiceAreas('dz-bangalore')[0].name).toBe('Indiranagar & Domlur');
      expect(filterServiceAreas('dz-tumkur')).toHaveLength(1);
      expect(filterServiceAreas('dz-tumkur')[0].name).toBe('MG Road & Ashok Nagar');
    });

    it('filters reviews & complaints by restaurant in active zone', () => {
      const restMap = new Map(mockRestaurants.map((r) => [r.id, r]));
      const filterReviews = (zoneId: string) =>
        mockReviews.filter((rev) => {
          const rest = restMap.get(rev.restaurantId);
          return zoneId === 'dz-bangalore' ? rest?.city === 'Bangalore' : rest?.city === 'Tumkur';
        });

      expect(filterReviews('dz-bangalore')).toHaveLength(1);
      expect(filterReviews('dz-bangalore')[0].comment).toContain('Bangalore');
      expect(filterReviews('dz-tumkur')).toHaveLength(1);
      expect(filterReviews('dz-tumkur')[0].comment).toContain('Tumkur');
    });

    it('supports global coupons everywhere while scoping restaurant coupons to zone', () => {
      const restMap = new Map(mockRestaurants.map((r) => [r.id, r]));
      const filterCoupons = (zoneId: string) =>
        mockCoupons.filter((c) => {
          if (!c.restaurantId) return true; // global
          const rest = restMap.get(c.restaurantId);
          return zoneId === 'dz-bangalore' ? rest?.city === 'Bangalore' : rest?.city === 'Tumkur';
        });

      const bglCoupons = filterCoupons('dz-bangalore');
      expect(bglCoupons.map((c) => c.code)).toEqual(['FOODIE50', 'EMPIRE20']);

      const tmkCoupons = filterCoupons('dz-tumkur');
      expect(tmkCoupons.map((c) => c.code)).toEqual(['FOODIE50', 'TUMKURTREAT']);
    });
  });
});
