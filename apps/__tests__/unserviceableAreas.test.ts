import { DASHBOARD_NAV, filterNavForRole, isRouteAllowedForRole } from '../lib/routeGuards';
import {
  inferRequestSource,
  getRequesterDisplayName,
  getRequestedArea,
  UnserviceableRequestDto,
} from '../features/location/types';

describe('Unserviceable Areas Feature', () => {
  describe('Navigation & Placement', () => {
    it('places Unserviceable Areas directly below Location Management in DASHBOARD_NAV', () => {
      const locationIndex = DASHBOARD_NAV.findIndex((item) => item.href === '/location');
      const unserviceableIndex = DASHBOARD_NAV.findIndex((item) => item.href === '/unserviceable-areas');

      expect(locationIndex).toBeGreaterThanOrEqual(0);
      expect(unserviceableIndex).toBe(locationIndex + 1);

      const navItem = DASHBOARD_NAV[unserviceableIndex];
      expect(navItem.label).toBe('Unserviceable Areas Request');
      expect(navItem.href).toBe('/unserviceable-areas');
    });

    it('exposes Unserviceable Areas nav for SUPER_ADMIN, OPS, and ZONE_ADMIN', () => {
      const superAdminNav = filterNavForRole('SUPER_ADMIN').map((i) => i.href);
      expect(superAdminNav).toContain('/unserviceable-areas');

      const opsNav = filterNavForRole('OPS').map((i) => i.href);
      expect(opsNav).toContain('/unserviceable-areas');

      const zoneAdminNav = filterNavForRole('ZONE_ADMIN').map((i) => i.href);
      expect(zoneAdminNav).toContain('/unserviceable-areas');
    });

    it('restricts Unserviceable Areas from isolated roles (SUPPORT, AUDITOR, FINANCE)', () => {
      const supportNav = filterNavForRole('SUPPORT').map((i) => i.href);
      expect(supportNav).not.toContain('/unserviceable-areas');

      const auditorNav = filterNavForRole('AUDITOR').map((i) => i.href);
      expect(auditorNav).not.toContain('/unserviceable-areas');

      const financeNav = filterNavForRole('FINANCE_ADMIN', '/finance-admin/dashboard').map((i) => i.href);
      expect(financeNav).not.toContain('/unserviceable-areas');
    });

    it('enforces route permission via isRouteAllowedForRole', () => {
      expect(isRouteAllowedForRole('/unserviceable-areas', 'SUPER_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'OPS')).toBe(true);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'OPERATIONS_ADMIN')).toBe(true);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'AUDITOR')).toBe(false);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'RESTAURANT_MANAGER')).toBe(false);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'SUPPORT_AGENT')).toBe(false);
      expect(isRouteAllowedForRole('/unserviceable-areas', null)).toBe(false);
    });
  });

  describe('Request Sources & Helpers', () => {
    it('correctly infers customer request source', () => {
      const explicitReq: UnserviceableRequestDto = {
        id: 'req-c1',
        restaurantName: 'Ramesh Store',
        contactPerson: 'Ramesh',
        contactEmail: 'ramesh@example.com',
        contactPhone: '+919876543210',
        address: 'Electronic City Phase 2',
        cityName: 'Bangalore',
        latitude: 12.8399,
        longitude: 77.6770,
        status: 'PENDING',
        createdAt: '2026-10-23T10:00:00Z',
        requestSource: 'CUSTOMER',
      };
      expect(inferRequestSource(explicitReq)).toBe('CUSTOMER');

      const encodedReq: UnserviceableRequestDto = {
        id: 'req-c2',
        restaurantName: '[Customer] Ananya Rao',
        contactPerson: 'Ananya',
        contactEmail: 'ananya@example.com',
        contactPhone: '+919876543211',
        address: 'Harlur Road',
        cityName: 'Bangalore',
        latitude: 12.9081,
        longitude: 77.6601,
        status: 'PENDING',
        createdAt: '2026-10-23T10:00:00Z',
      };
      expect(inferRequestSource(encodedReq)).toBe('CUSTOMER');
      expect(getRequesterDisplayName(encodedReq)).toBe('Ananya Rao');
    });

    it('correctly infers delivery partner request source', () => {
      const partnerReq: UnserviceableRequestDto = {
        id: 'req-dp1',
        restaurantName: '[Delivery Partner] Anand Kumar',
        contactPerson: 'Anand Kumar',
        contactEmail: 'anand@driver.foodie.local',
        contactPhone: '+919876543212',
        address: 'Batawadi Area',
        cityName: 'Tumkur',
        latitude: 13.3400,
        longitude: 77.1000,
        status: 'PENDING',
        createdAt: '2026-10-23T11:00:00Z',
      };
      expect(inferRequestSource(partnerReq)).toBe('DELIVERY_PARTNER');
      expect(getRequesterDisplayName(partnerReq)).toBe('Anand Kumar');
    });

    it('correctly defaults to restaurant request source for standard merchant requests', () => {
      const restReq: UnserviceableRequestDto = {
        id: 'req-r1',
        restaurantName: 'Pavithra Thatte Idli',
        contactPerson: 'Manjunath T',
        contactEmail: 'manju@pavithraidli.com',
        contactPhone: '+919876543213',
        address: 'Kyatsandra Main Road',
        cityName: 'Tumkur',
        latitude: 13.3150,
        longitude: 77.1650,
        status: 'PENDING',
        createdAt: '2026-10-23T12:00:00Z',
      };
      expect(inferRequestSource(restReq)).toBe('RESTAURANT');
      expect(getRequesterDisplayName(restReq)).toBe('Pavithra Thatte Idli');
      expect(getRequestedArea(restReq)).toBe('Kyatsandra Main Road');
    });
  });
});
