import { DASHBOARD_NAV, filterNavForRole, isRouteAllowedForRole } from '../lib/routeGuards';
import {
  inferRequestSource,
  getRequesterDisplayName,
  getRequestedArea,
  getSubmittedDocumentsList,
  formatDocumentName,
  getNormalizedDocuments,
  resolveDocumentUrl,
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

    it('correctly parses submitted documents from array or string and formats names', () => {
      const reqWithArray: UnserviceableRequestDto = {
        id: 'req-docs1',
        restaurantName: 'Cafe Coffee Day',
        contactPerson: 'Arun',
        contactEmail: 'arun@ccd.com',
        contactPhone: '+919999999999',
        address: 'MG Road',
        cityName: 'Bangalore',
        latitude: 12.9716,
        longitude: 77.5946,
        status: 'PENDING',
        createdAt: '2026-10-23T12:00:00Z',
        submittedDocuments: ['FSSAI_CERTIFICATE', 'PAN_CARD', 'GST_CERTIFICATE'],
      };
      expect(getSubmittedDocumentsList(reqWithArray)).toEqual(['FSSAI_CERTIFICATE', 'PAN_CARD', 'GST_CERTIFICATE']);
      expect(formatDocumentName('FSSAI_CERTIFICATE')).toBe('Fssai Certificate');
      expect(formatDocumentName('pan_card')).toBe('Pan Card');

      const reqWithString: UnserviceableRequestDto = {
        ...reqWithArray,
        submittedDocuments: 'DRIVING_LICENSE, VEHICLE_RC, AADHAAR_CARD',
      };
      expect(getSubmittedDocumentsList(reqWithString)).toEqual(['DRIVING_LICENSE', 'VEHICLE_RC', 'AADHAAR_CARD']);

      const reqEmpty: UnserviceableRequestDto = {
        ...reqWithArray,
        submittedDocuments: undefined,
      };
      expect(getSubmittedDocumentsList(reqEmpty)).toEqual([]);
    });

    it('correctly normalizes document details and resolves URLs for preview modal', () => {
      const reqWithDetails: UnserviceableRequestDto = {
        id: 'req-norm1',
        restaurantName: 'Empire Restaurant',
        contactPerson: 'Shakeel',
        contactEmail: 'shakeel@empire.com',
        contactPhone: '+919876543219',
        address: 'Indiranagar',
        cityName: 'Bangalore',
        latitude: 12.9784,
        longitude: 77.6408,
        status: 'PENDING',
        createdAt: '2026-10-23T12:00:00Z',
        documentDetails: [
          {
            documentId: 'doc-1',
            docType: 'FSSAI_CERTIFICATE',
            name: 'FSSAI License',
            fileUrl: '/api/v1/storage/restaurants/r1/documents/fssai.pdf',
          },
        ],
      };

      const normalized = getNormalizedDocuments(reqWithDetails);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].docType).toBe('FSSAI_CERTIFICATE');
      expect(normalized[0].fileUrl).toBe('/api/bff/storage/restaurants/r1/documents/fssai.pdf');

      expect(resolveDocumentUrl('https://example.com/doc.pdf')).toBe('https://example.com/doc.pdf');
      expect(resolveDocumentUrl('/api/v1/storage/path/to/file.jpg')).toBe('/api/bff/storage/path/to/file.jpg');
      expect(resolveDocumentUrl('restaurants/123/file.png')).toBe('/api/bff/storage/restaurants/123/file.png');
    });
  });

  describe('Details Modal Helpers & Data Integrity', () => {
    it('safely handles complete and missing contact information for Customer Information section', () => {
      const fullReq: UnserviceableRequestDto = {
        id: '101',
        restaurantName: '[Customer] Priya Sharma',
        contactPerson: 'Priya Sharma',
        contactEmail: 'priya@example.com',
        contactPhone: '+919871457639',
        address: 'Sri Banashankari Layout, Yelahanka taluku',
        cityName: 'Bangalore',
        latitude: 13.175496,
        longitude: 77.559425,
        status: 'PENDING',
        createdAt: '2026-10-31T09:00:00Z',
      };

      expect(getRequesterDisplayName(fullReq)).toBe('Priya Sharma');
      expect(inferRequestSource(fullReq)).toBe('CUSTOMER');
      expect(getRequestedArea(fullReq)).toBe('Sri Banashankari Layout, Yelahanka taluku');

      const sparseReq = {
        id: '102',
        address: '',
        status: 'PENDING',
      } as unknown as UnserviceableRequestDto;

      expect(getRequesterDisplayName(sparseReq)).toBe('Unknown Requester');
      expect(getRequestedArea(sparseReq)).toBe('Unspecified Live Location');
    });

    it('formats coordinates and Google Maps link correctly for Location & Geospatial section', () => {
      const lat = 13.17549644323565;
      const lng = 77.55942519885193;
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      expect(mapsUrl).toBe('https://www.google.com/maps?q=13.17549644323565,77.55942519885193');
    });

    it('formats request reference with #REQ- prefix', () => {
      const formatRef = (id: string | number) => `#REQ-${id}`;
      expect(formatRef('10')).toBe('#REQ-10');
      expect(formatRef(42)).toBe('#REQ-42');
    });
  });
});
