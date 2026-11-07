import { GET as bffGet, POST as bffPost, PATCH as bffPatch } from '../app/api/bff/[...path]/route';
import { filterNavForRole, getHomeRouteForRole, isRouteAllowedForRole } from '../lib/routeGuards';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Feature: Zone-Based Access Control for Restaurant Manager', () => {
  jest.setTimeout(30000);

  const managerUserId = 'USR-3995';
  const managerToken = `demo-admin-token-${managerUserId}`;
  const superAdminToken = 'demo-admin-token-USR-1001';

  beforeEach(() => {
    // Reset global admin users store if needed
    const globalAny = global as any;
    if (globalAny.ADMIN_USERS_STORE) {
      const rm = globalAny.ADMIN_USERS_STORE.find(
        (u: any) => u.id === managerUserId || u.role === 'RESTAURANT_MANAGER'
      );
      if (rm) {
        rm.assignedZoneIds = [];
        rm.assignedZoneId = null;
        rm.assignedZoneName = null;
      }
    }
  });

  describe('1. Super Admin Zone Assignment for Restaurant Manager', () => {
    it('allows Super Admin to assign multiple zones to Restaurant Manager via PATCH /admin/users/:userId/zones', async () => {
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
          cookie: 'foodie_user_role=SUPER_ADMIN',
        },
        body: JSON.stringify({
          assignedZoneIds: ['dz-bangalore', 'dz-tumkur'],
        }),
      });

      const res = await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.assignedZoneIds).toEqual(['dz-bangalore', 'dz-tumkur']);
      expect(json.data.assignedZoneId).toBe('dz-bangalore');
    });

    it('allows Super Admin to remove or update zone assignments', async () => {
      // First assign two zones
      const patchReq1 = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          assignedZoneIds: ['dz-kunigal', 'dz-hassan'],
        }),
      });
      await bffPatch(patchReq1, makeCtx(['admin', 'users', managerUserId, 'zones']));

      // Now update to single zone
      const patchReq2 = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          assignedZoneIds: ['dz-kunigal'],
        }),
      });
      const res2 = await bffPatch(patchReq2, makeCtx(['admin', 'users', managerUserId, 'zones']));
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.data.assignedZoneIds).toEqual(['dz-kunigal']);
      expect(json2.data.assignedZoneId).toBe('dz-kunigal');

      // Now clear all assignments
      const patchReq3 = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          assignedZoneIds: [],
        }),
      });
      const res3 = await bffPatch(patchReq3, makeCtx(['admin', 'users', managerUserId, 'zones']));
      const json3 = await res3.json();
      expect(json3.success).toBe(true);
      expect(json3.data.assignedZoneIds).toEqual([]);
      expect(json3.data.assignedZoneId).toBeNull();
    });
  });

  describe('2. Dynamic Zone Listing with ACTIVE and INACTIVE Statuses', () => {
    it('displays ALL registered zones with assigned as ACTIVE and unassigned as INACTIVE', async () => {
      const globalAny = global as any;
      if (!globalAny.ADMIN_DYNAMIC_ZONES) globalAny.ADMIN_DYNAMIC_ZONES = [];
      globalAny.ADMIN_DYNAMIC_ZONES.push(
        { id: 'dz-kunigal', zoneName: 'Kunigal', cityName: 'Kunigal', status: 'ACTIVE' },
        { id: 'dz-hassan', zoneName: 'Hassan', cityName: 'Hassan', status: 'ACTIVE' }
      );

      // Assign dz-bangalore only to Restaurant Manager
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      // Restaurant Manager calls GET /admin/zones/available
      const getReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}`,
        },
      });

      const res = await bffGet(getReq, makeCtx(['admin', 'zones', 'available']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(4);

      // Verify dz-bangalore is ACTIVE and selectable
      const blrZone = json.data.find((z: any) => z.id === 'dz-bangalore');
      expect(blrZone).toBeDefined();
      expect(blrZone.status).toBe('ACTIVE');
      expect(blrZone.assigned).toBe(true);
      expect(blrZone.selectable).toBe(true);

      // Verify unassigned zone dz-tumkur is INACTIVE and disabled
      const tmkZone = json.data.find((z: any) => z.id === 'dz-tumkur');
      expect(tmkZone).toBeDefined();
      expect(tmkZone.status).toBe('INACTIVE');
      expect(tmkZone.assigned).toBe(false);
      expect(tmkZone.selectable).toBe(false);

      // Verify unassigned zones (e.g., dz-kunigal, dz-hassan) are INACTIVE and disabled
      const kunigalZone = json.data.find((z: any) => z.id.toLowerCase().includes('kunigal'));
      if (kunigalZone) {
        expect(kunigalZone.status).toBe('INACTIVE');
        expect(kunigalZone.assigned).toBe(false);
        expect(kunigalZone.selectable).toBe(false);
      }

      const hassanZone = json.data.find((z: any) => z.id.toLowerCase().includes('hassan'));
      if (hassanZone) {
        expect(hassanZone.status).toBe('INACTIVE');
        expect(hassanZone.assigned).toBe(false);
        expect(hassanZone.selectable).toBe(false);
      }
    });

    it('displays ALL zones as INACTIVE when no zones are assigned to Restaurant Manager', async () => {
      // Clear zone assignments
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: [] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      const getReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          cookie: 'foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=%5B%5D',
        },
      });

      const res = await bffGet(getReq, makeCtx(['admin', 'zones', 'available']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);

      // Every single zone must be INACTIVE
      json.data.forEach((z: any) => {
        expect(z.status).toBe('INACTIVE');
        expect(z.assigned).toBe(false);
        expect(z.selectable).toBe(false);
      });
    });

    it('newly registered zones dynamically appear as INACTIVE until assigned', async () => {
      // Assign dz-bangalore only
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      // Add a dynamic zone in memory
      const globalAny = global as any;
      if (!globalAny.ADMIN_DYNAMIC_ZONES) globalAny.ADMIN_DYNAMIC_ZONES = [];
      const testZoneId = `dz-test-new-${Date.now()}`;
      globalAny.ADMIN_DYNAMIC_ZONES.push({
        id: testZoneId,
        zoneName: 'New Test Zone',
        cityName: 'Test City',
        status: 'ACTIVE',
      });

      const getReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}`,
        },
      });

      const res = await bffGet(getReq, makeCtx(['admin', 'zones', 'available']));
      const json = await res.json();
      const newlyAdded = json.data.find((z: any) => z.id === testZoneId);
      expect(newlyAdded).toBeDefined();
      expect(newlyAdded.status).toBe('INACTIVE');
      expect(newlyAdded.assigned).toBe(false);
      expect(newlyAdded.selectable).toBe(false);
    });
  });

  describe('3. Zone Selection & Switching Validation', () => {
    it('allows Restaurant Manager to select an assigned ACTIVE zone with HTTP 200 and cookie binding', async () => {
      // Assign dz-bangalore
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore', 'dz-tumkur'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      const selectReq = new Request('http://localhost:3000/api/bff/admin/zones/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore', 'dz-tumkur']))}`,
        },
        body: JSON.stringify({ zoneId: 'dz-tumkur' }),
      });

      const res = await bffPost(selectReq, makeCtx(['admin', 'zones', 'select']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.zoneId).toBe('dz-tumkur');

      // Check cookie was set
      const cookieHeader = res.headers.get('set-cookie') || '';
      expect(cookieHeader).toContain('foodie_active_zone_id=dz-tumkur');
    });

    it('blocks Restaurant Manager from selecting an unassigned INACTIVE zone with HTTP 403 Forbidden', async () => {
      // Assign dz-bangalore only
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      // Attempt to select dz-hassan (unassigned)
      const selectReq = new Request('http://localhost:3000/api/bff/admin/zones/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}`,
        },
        body: JSON.stringify({ zoneId: 'dz-hassan' }),
      });

      const res = await bffPost(selectReq, makeCtx(['admin', 'zones', 'select']));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('not assigned to your account');
    });
  });

  describe('4. Backend Security and Cross-Zone Access Control', () => {
    it('blocks Restaurant Manager from accessing unassigned zones via X-Active-Zone-Id header with HTTP 403', async () => {
      // Assign dz-bangalore only
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      // Request restaurants specifying unassigned zone 'dz-tumkur'
      const req = new Request('http://localhost:3000/api/bff/admin/restaurants?zoneId=dz-tumkur', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          'X-Active-Zone-Id': 'dz-tumkur',
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}`,
        },
      });

      const res = await bffGet(req, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('blocks Restaurant Manager from accessing global view (ALL) with HTTP 403', async () => {
      // Assign dz-bangalore
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      const req = new Request('http://localhost:3000/api/bff/admin/restaurants', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          'X-Active-Zone-Id': 'ALL',
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}`,
        },
      });

      const res = await bffGet(req, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('allows Restaurant Manager to access assigned Bangalore Zone and successfully fetch restaurants', async () => {
      // Assign dz-bangalore
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: ['dz-bangalore'] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      const req = new Request('http://localhost:3000/api/bff/admin/restaurants?zoneId=dz-bangalore', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          'X-Active-Zone-Id': 'dz-bangalore',
          cookie: `foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=${encodeURIComponent(JSON.stringify(['dz-bangalore']))}; foodie_active_zone_id=dz-bangalore`,
        },
      });

      const res = await bffGet(req, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('blocks operational data requests with HTTP 403 when Restaurant Manager has NO assigned zones', async () => {
      // Clear all assignments
      const patchReq = new Request(`http://localhost:3000/api/bff/admin/users/${managerUserId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ assignedZoneIds: [] }),
      });
      await bffPatch(patchReq, makeCtx(['admin', 'users', managerUserId, 'zones']));

      const req = new Request('http://localhost:3000/api/bff/admin/restaurants', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          cookie: 'foodie_user_role=RESTAURANT_MANAGER; foodie_user_assigned_zones=%5B%5D',
        },
      });

      const res = await bffGet(req, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('No operating zones are currently assigned');
    });
  });

  describe('5. Super Admin Global Access Preservation', () => {
    it('ensures Super Admin retains full access to ALL zones and can select any zone or ALL without 403', async () => {
      // Super admin fetches zones
      const availableReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          cookie: 'foodie_user_role=SUPER_ADMIN',
        },
      });

      const res = await bffGet(availableReq, makeCtx(['admin', 'zones', 'available']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // All zones for super admin must be active
      json.data.forEach((z: any) => {
        expect(z.status).toBe('ACTIVE');
        expect(z.assigned).toBe(true);
        expect(z.selectable).toBe(true);
      });

      // Super admin can select any zone
      const selectReq = new Request('http://localhost:3000/api/bff/admin/zones/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
          cookie: 'foodie_user_role=SUPER_ADMIN',
        },
        body: JSON.stringify({ zoneId: 'dz-tumkur' }),
      });

      const selectRes = await bffPost(selectReq, makeCtx(['admin', 'zones', 'select']));
      expect(selectRes.status).toBe(200);
    });
  });

  describe('6. Restaurant Manager Active Role and Navigation Isolation', () => {
    it('only displays Restaurants in navigation menu and excludes all other modules', () => {
      const navItems = filterNavForRole('RESTAURANT_MANAGER');
      expect(navItems).toHaveLength(1);
      expect(navItems[0]).toEqual({
        href: '/restaurants',
        label: 'Restaurants',
        category: 'BUSINESS MANAGERS',
        icon: '',
      });

      // Verify other navigation items are not exposed
      const hrefs = navItems.map((n) => n.href);
      expect(hrefs).not.toContain('/');
      expect(hrefs).not.toContain('/dashboard');
      expect(hrefs).not.toContain('/analytics');
      expect(hrefs).not.toContain('/support');
      expect(hrefs).not.toContain('/customers');
      expect(hrefs).not.toContain('/delivery-partners');
      expect(hrefs).not.toContain('/location');
      expect(hrefs).not.toContain('/unserviceable-areas');
      expect(hrefs).not.toContain('/orders');
      expect(hrefs).not.toContain('/coupons');
      expect(hrefs).not.toContain('/payments');
      expect(hrefs).not.toContain('/notifications');
      expect(hrefs).not.toContain('/reviews');
      expect(hrefs).not.toContain('/settings');
    });

    it('returns /restaurants as the primary home route for RESTAURANT_MANAGER', () => {
      expect(getHomeRouteForRole('RESTAURANT_MANAGER')).toBe('/restaurants');
    });

    it('allows access strictly to restaurant routes and blocks non-restaurant routes', () => {
      expect(isRouteAllowedForRole('/restaurants', 'RESTAURANT_MANAGER')).toBe(true);
      expect(isRouteAllowedForRole('/restaurant-admin', 'RESTAURANT_MANAGER')).toBe(true);
      expect(isRouteAllowedForRole('/users', 'RESTAURANT_MANAGER')).toBe(false);
      expect(isRouteAllowedForRole('/location', 'RESTAURANT_MANAGER')).toBe(false);
      expect(isRouteAllowedForRole('/delivery-partners', 'RESTAURANT_MANAGER')).toBe(false);
      expect(isRouteAllowedForRole('/unserviceable-areas', 'RESTAURANT_MANAGER')).toBe(false);
    });

    it('returns Restaurant Manager role and identity from GET admin/users/me', async () => {
      const meReq = new Request('http://localhost:3000/api/bff/admin/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${managerToken}`,
          cookie: 'foodie_user_role=RESTAURANT_MANAGER',
        },
      });

      const res = await bffGet(meReq, makeCtx(['admin', 'users', 'me']));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.role).toBe('RESTAURANT_MANAGER');
      expect(json.data.fullName).toBe('Restaurant Manager');
      expect(json.data.email).toBe('manager@foodie.local');
    });
  });
});
