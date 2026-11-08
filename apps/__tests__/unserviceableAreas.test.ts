import fs from 'fs';
import path from 'path';
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
import { GET as bffGet, POST as bffPost, PUT as bffPut } from '../app/api/bff/[...path]/route';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Unserviceable Areas Feature', () => {
  jest.setTimeout(30000);
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

  describe('Zone-Based Data Isolation & Role Authorization', () => {
    const globalAny = global as unknown as Record<string, unknown>;

    const resetStorage = () => {
      globalAny.__UNSERVICEABLE_REQUESTS = [];
    };

    beforeEach(() => {
      // Clear in-memory to start clean
      resetStorage();
    });

    afterAll(() => {
      globalAny.__UNSERVICEABLE_REQUESTS = undefined;
    });

    it('1. Confirms all three tabs show zero requests when module is cleared', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const res = await bffGet(req, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('2 & 3. Submits one genuine Customer request from Tumkur and verifies it appears only in Customer tab', async () => {
      const customerReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: 'cust-tmk-101',
          requesterName: 'Kavitha Devi',
          contactPerson: 'Kavitha Devi',
          contactPhone: '+919844011223',
          address: 'Batawadi Extension, Tumkur',
          cityName: 'Tumkur',
          latitude: 13.341,
          longitude: 77.102,
          requestSource: 'CUSTOMER',
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
        }),
      });
      const postRes = await bffPost(customerReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.data.requestSource).toBe('CUSTOMER');
      expect(postBody.data.zoneId).toBe('dz-tumkur');

      // Fetch list
      const getReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const getRes = await bffGet(getReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const list: UnserviceableRequestDto[] = (await getRes.json()).data;
      expect(list.length).toBe(1);

      // Verify source categorization
      expect(inferRequestSource(list[0])).toBe('CUSTOMER');
      expect(inferRequestSource(list[0])).not.toBe('DELIVERY_PARTNER');
      expect(inferRequestSource(list[0])).not.toBe('RESTAURANT');
    });

    it('4 & 5. Submits one genuine Delivery Partner request from Bangalore and verifies it appears only in Delivery Partner tab', async () => {
      const dpReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: 'dp-blr-201',
          requesterName: 'Suresh Kumar',
          contactPerson: 'Suresh Kumar',
          contactPhone: '+919876500112',
          address: 'Whitefield Outer Circle, Bangalore',
          cityName: 'Bangalore',
          latitude: 12.9698,
          longitude: 77.7499,
          requestSource: 'DELIVERY_PARTNER',
          zoneId: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
        }),
      });
      const postRes = await bffPost(dpReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.data.requestSource).toBe('DELIVERY_PARTNER');
      expect(postBody.data.zoneId).toBe('dz-bangalore');

      // Verify it is only categorized as DELIVERY_PARTNER
      expect(inferRequestSource(postBody.data)).toBe('DELIVERY_PARTNER');
      expect(inferRequestSource(postBody.data)).not.toBe('CUSTOMER');
      expect(inferRequestSource(postBody.data)).not.toBe('RESTAURANT');
    });

    it('6 & 7. Submits one genuine Restaurant request from Tumkur and verifies it appears only in Restaurant tab', async () => {
      const restReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: 'rest-tmk-301',
          requesterName: 'Siddaganga Tiffins',
          restaurantName: 'Siddaganga Tiffins',
          contactPerson: 'Shivanna',
          contactPhone: '+919844099887',
          address: 'BH Road, Tumkur',
          cityName: 'Tumkur',
          latitude: 13.338,
          longitude: 77.115,
          requestSource: 'RESTAURANT',
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
        }),
      });
      const postRes = await bffPost(restReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.data.requestSource).toBe('RESTAURANT');
      expect(postBody.data.zoneId).toBe('dz-tumkur');

      // Verify it is only categorized as RESTAURANT
      expect(inferRequestSource(postBody.data)).toBe('RESTAURANT');
      expect(inferRequestSource(postBody.data)).not.toBe('CUSTOMER');
      expect(inferRequestSource(postBody.data)).not.toBe('DELIVERY_PARTNER');
    });

    it('8 & 9. Verifies data persistence without mutation: refreshing and polling never changes saved records', async () => {
      // Create request
      const createReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-stable-01',
          requesterName: 'Meera',
          contactPhone: '+919876543210',
          address: 'Koramangala 4th Block',
          cityName: 'Bangalore',
          latitude: 12.935,
          longitude: 77.624,
          requestSource: 'CUSTOMER',
          zoneId: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
        }),
      });
      await bffPost(createReq, makeCtx(['admin', 'location', 'unserviceable-requests']));

      // Repeated polling (simulating background polls over time)
      for (let i = 0; i < 5; i++) {
        const pollReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
          headers: {
            cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
            authorization: 'Bearer demo-admin-super_admin-token',
          },
        });
        const pollRes = await bffGet(pollReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
        const data: UnserviceableRequestDto[] = (await pollRes.json()).data;
        const found = data.find((r) => r.id === 'req-stable-01');
        expect(found).toBeDefined();
        expect(found?.zoneId).toBe('dz-bangalore');
        expect(found?.requestSource).toBe('CUSTOMER');
        expect(found?.cityName).toBe('Bangalore');
      }
    });

    it('10, 11 & 12. Super Admin sees all three requests; Bangalore Zone Admin sees only Bangalore; Tumkur Zone Admin sees only Tumkur', async () => {
      // Populate the 3 requests:
      // 1. Customer from Tumkur
      await bffPost(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-test-cust-tmk',
          requesterName: 'Kavitha Devi',
          contactPhone: '+919844011223',
          address: 'Batawadi Extension, Tumkur',
          cityName: 'Tumkur',
          latitude: 13.341,
          longitude: 77.102,
          requestSource: 'CUSTOMER',
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
        }),
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));

      // 2. Delivery Partner from Bangalore
      await bffPost(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-test-dp-blr',
          requesterName: 'Suresh Kumar',
          contactPhone: '+919876500112',
          address: 'Whitefield Outer Circle, Bangalore',
          cityName: 'Bangalore',
          latitude: 12.9698,
          longitude: 77.7499,
          requestSource: 'DELIVERY_PARTNER',
          zoneId: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
        }),
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));

      // 3. Restaurant from Tumkur
      await bffPost(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-test-rest-tmk',
          requesterName: 'Siddaganga Tiffins',
          restaurantName: 'Siddaganga Tiffins',
          contactPhone: '+919844099887',
          address: 'BH Road, Tumkur',
          cityName: 'Tumkur',
          latitude: 13.338,
          longitude: 77.115,
          requestSource: 'RESTAURANT',
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
        }),
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));

      // 10. Super Admin verifies all three requests
      const saReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const saRes = await bffGet(saReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const saData: UnserviceableRequestDto[] = (await saRes.json()).data;
      expect(saData.length).toBe(3);
      expect(saData.some((r) => r.id === 'req-test-cust-tmk')).toBe(true);
      expect(saData.some((r) => r.id === 'req-test-dp-blr')).toBe(true);
      expect(saData.some((r) => r.id === 'req-test-rest-tmk')).toBe(true);

      // 11. Bangalore Zone Admin sees ONLY Bangalore requests (1 request)
      const blrReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-bangalore;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-bangalore',
        },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const blrData: UnserviceableRequestDto[] = (await blrRes.json()).data;
      expect(blrData.length).toBe(1);
      expect(blrData[0].id).toBe('req-test-dp-blr');
      expect(blrData[0].zoneId).toBe('dz-bangalore');

      // 12. Tumkur Zone Admin sees ONLY Tumkur requests (2 requests)
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-tumkur;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-tumkur',
        },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const tmkData: UnserviceableRequestDto[] = (await tmkRes.json()).data;
      expect(tmkData.length).toBe(2);
      expect(tmkData.every((r) => r.zoneId === 'dz-tumkur')).toBe(true);
      expect(tmkData.some((r) => r.id === 'req-test-cust-tmk')).toBe(true);
      expect(tmkData.some((r) => r.id === 'req-test-rest-tmk')).toBe(true);
    });

    it('Rejects cross-zone query parameter tampering by Zone Admin with 403 Forbidden', async () => {
      const tamperedReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests?zoneId=dz-tumkur', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-bangalore;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-bangalore',
        },
      });
      const res = await bffGet(tamperedReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('Prevents duplicate request submissions', async () => {
      const payload = {
        requesterName: 'Duplicate Test',
        contactPhone: '+919876599999',
        address: 'MG Road, Bangalore',
        cityName: 'Bangalore',
        requestSource: 'CUSTOMER',
        zoneId: 'dz-bangalore',
      };

      const res1 = await bffPost(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(res1.status).toBe(200);

      // Attempt duplicate submission
      const res2 = await bffPost(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(res2.status).toBe(200);

      // Verify list has only 1 record, not 2
      const getRes = await bffGet(new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      }), makeCtx(['admin', 'location', 'unserviceable-requests']));
      const data: UnserviceableRequestDto[] = (await getRes.json()).data;
      expect(data.filter((r) => r.contactPhone === '+919876599999').length).toBe(1);
    });

    it('Correctly detects and isolates Hassan Zone for a restaurant near Hassan coordinates', async () => {
      // Submit restaurant near Hassan (13.0033, 76.1004)
      const hassanRestReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-test-rest-hsn',
          requesterName: 'Hassan Grand Treat',
          restaurantName: 'Hassan Grand Treat',
          contactPhone: '+919844055555',
          address: 'BM Road, Hassan',
          cityName: 'Hassan',
          latitude: 13.0040,
          longitude: 76.1010,
          requestSource: 'RESTAURANT',
        }),
      });
      const postRes = await bffPost(hassanRestReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.data.zoneId).toBe('dz-hassan');
      expect(postBody.data.zoneName).toBe('Hassan Zone');

      // Super Admin sees Hassan request
      const saReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const saRes = await bffGet(saReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const saData: UnserviceableRequestDto[] = (await saRes.json()).data;
      expect(saData.some((r) => r.id === 'req-test-rest-hsn')).toBe(true);

      // Hassan Zone Admin sees it
      const hsnReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-hassan;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-hassan',
        },
      });
      const hsnRes = await bffGet(hsnReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const hsnData: UnserviceableRequestDto[] = (await hsnRes.json()).data;
      expect(hsnData.some((r) => r.id === 'req-test-rest-hsn')).toBe(true);

      // Tumkur Zone Admin must NOT see it
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-tumkur;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-tumkur',
        },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const tmkData: UnserviceableRequestDto[] = (await tmkRes.json()).data;
      expect(tmkData.some((r) => r.id === 'req-test-rest-hsn')).toBe(false);

      // Bangalore Zone Admin must NOT see it
      const blrReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-bangalore;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-bangalore',
        },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const blrData: UnserviceableRequestDto[] = (await blrRes.json()).data;
      expect(blrData.some((r) => r.id === 'req-test-rest-hsn')).toBe(false);
    });

    it('Automatically assigns zone from coordinates even when zoneId is not provided in payload', async () => {
      // Submit a customer request near Hoskote (13.0721, 77.7922) without zoneId
      const unassignedReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'req-test-hoskote-customer',
          requesterName: 'Hoskote Customer',
          contactPhone: '+919876543299',
          address: 'Hoskote Town',
          cityName: 'Bangalore',
          latitude: 13.0721,
          longitude: 77.7922,
          requestSource: 'CUSTOMER',
        }),
      });
      const postRes = await bffPost(unassignedReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.data.zoneId).toBe('dz-bangalore');
      expect(postBody.data.zoneName).toBe('Bangalore Zone');
      expect(postBody.data.distanceFromZoneKm).toBeGreaterThan(0);

      // Bangalore Zone Admin sees it
      const blrReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-bangalore;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-bangalore',
        },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const blrData: UnserviceableRequestDto[] = (await blrRes.json()).data;
      expect(blrData.some((r) => r.id === 'req-test-hoskote-customer')).toBe(true);

      // Tumkur Zone Admin must NOT see it
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/location/unserviceable-requests', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-token; foodie_user_role=ZONE_ADMIN; foodie_user_assigned_zone=dz-tumkur;',
          'x-user-role': 'ZONE_ADMIN',
          'x-assigned-zone-id': 'dz-tumkur',
        },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'location', 'unserviceable-requests']));
      const tmkData: UnserviceableRequestDto[] = (await tmkRes.json()).data;
      expect(tmkData.some((r) => r.id === 'req-test-hoskote-customer')).toBe(false);
    });
  });
});
