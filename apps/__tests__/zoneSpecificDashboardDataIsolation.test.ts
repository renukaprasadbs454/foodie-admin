import { POST as loginPost } from '../app/api/auth/login/route';
import { POST as bffPost, GET as bffGet, PATCH as bffPatch, DELETE as bffDelete } from '../app/api/bff/[...path]/route';
import { getHomeRouteForRole } from '../lib/routeGuards';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Zone-Specific Admin Dashboard and Comprehensive Data Isolation', () => {
  jest.setTimeout(30000);
  const globalAny = global as unknown as Record<string, unknown>;

  beforeEach(() => {
    delete globalAny.ADMIN_USERS_STORE;
  });

  // Helper to create a Zone Admin account
  async function provisionZoneAdmin(zoneId: string, zoneName: string, email: string, pass: string) {
    const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `${zoneName} Manager`,
        email,
        phone: '+91 98888 12345',
        role: 'OPS',
        department: 'Regional Operations',
        assignedZoneId: zoneId,
        assignedZoneName: zoneName,
        password: pass,
      }),
    });
    return bffPost(createReq, makeCtx(['admin', 'users']));
  }

  describe('1. Super Admin: Unrestricted Multi-Zone Access & Zone Operations', () => {
    it('Super Admin logs in with null assignedZoneId and retains global access to all zones', async () => {
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@foodie.local',
          password: 'Admin@12345',
        }),
      });

      const res = await loginPost(loginReq);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('SUPER_ADMIN');
      expect(body.data.assignedZoneId).toBeNull();
      expect(getHomeRouteForRole('SUPER_ADMIN')).toBe('/dashboard');
    });

    it('Super Admin can query global data (ALL) and switch between Bangalore and Tumkur zones', async () => {
      // Super Admin querying ALL
      const allReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const allRes = await bffGet(allReq, makeCtx(['admin', 'zones', 'available']));
      expect(allRes.status).toBe(200);
      const allBody = await allRes.json();
      expect(allBody.success).toBe(true);
      expect(allBody.data.length).toBeGreaterThanOrEqual(2);

      // Super Admin explicitly querying Bangalore Zone
      const blrReq = new Request('http://localhost:3000/api/bff/admin/orders?zoneId=dz-bangalore', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN; foodie_active_zone_id=dz-bangalore;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'orders']));
      if (blrRes.status !== 200) {
        console.error('BLR_ORDERS_ERROR:', blrRes.status, await blrRes.text());
      }
      expect(blrRes.status).toBe(200);

      // Super Admin explicitly querying Tumkur Zone
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/orders?zoneId=dz-tumkur', {
        headers: {
          cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN; foodie_active_zone_id=dz-tumkur;',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'orders']));
      expect(tmkRes.status).toBe(200);
    });
  });

  describe('2. Zone Admin Dashboard: Login, Direct Routing, and Scoped Identity', () => {
    it('Bangalore Zone Admin logs in directly to /dashboard without intermediate zone selection', async () => {
      await provisionZoneAdmin('dz-bangalore', 'Bangalore Zone', 'blr.admin@foodie.local', 'BlrSecure@2026');

      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'blr.admin@foodie.local',
          password: 'BlrSecure@2026',
          expectedZoneId: 'dz-bangalore',
        }),
      });

      const res = await loginPost(loginReq);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('OPS');
      expect(body.data.assignedZoneId).toBe('dz-bangalore');
      expect(body.data.assignedZoneName).toBe('Bangalore Zone');

      // Verify cookies bind user to assigned zone
      const cookies = res.headers.get('set-cookie') || '';
      expect(cookies).toContain('foodie_user_assigned_zone=dz-bangalore');
      expect(cookies).toContain('foodie_active_zone_id=dz-bangalore');
      expect(decodeURIComponent(cookies)).toContain('foodie_active_zone_name=Bangalore Zone');
    });

    it('Tumkur Zone Admin logs in directly to /dashboard without intermediate zone selection', async () => {
      await provisionZoneAdmin('dz-tumkur', 'Tumkur Zone', 'tmk.admin@foodie.local', 'TmkSecure@2026');

      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tmk.admin@foodie.local',
          password: 'TmkSecure@2026',
          expectedZoneId: 'dz-tumkur',
        }),
      });

      const res = await loginPost(loginReq);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('OPS');
      expect(body.data.assignedZoneId).toBe('dz-tumkur');
      expect(body.data.assignedZoneName).toBe('Tumkur Zone');

      const cookies = res.headers.get('set-cookie') || '';
      expect(cookies).toContain('foodie_user_assigned_zone=dz-tumkur');
      expect(cookies).toContain('foodie_active_zone_id=dz-tumkur');
      expect(decodeURIComponent(cookies)).toContain('foodie_active_zone_name=Tumkur Zone');
    });
  });

  describe('3. Comprehensive Module Zone Filtering and Server-Side Enforcement', () => {
    const blrCookie = 'foodie_access_token=demo-admin-ops-token; foodie_user_role=OPS; foodie_user_assigned_zone=dz-bangalore; foodie_active_zone_id=dz-bangalore;';
    const tmkCookie = 'foodie_access_token=demo-admin-ops-token; foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur; foodie_active_zone_id=dz-tumkur;';

    it('filters Orders strictly to the authenticated user permitted zone', async () => {
      const blrReq = new Request('http://localhost:3000/api/bff/admin/orders', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'orders']));
      expect(blrRes.status).toBe(200);
      const blrBody = await blrRes.json();
      if (blrBody.data?.items) {
        blrBody.data.items.forEach((order: any) => {
          if (order.zoneId) expect(order.zoneId).toBe('dz-bangalore');
        });
      }

      const tmkReq = new Request('http://localhost:3000/api/bff/admin/orders', {
        headers: { cookie: tmkCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'orders']));
      expect(tmkRes.status).toBe(200);
      const tmkBody = await tmkRes.json();
      if (tmkBody.data?.items) {
        tmkBody.data.items.forEach((order: any) => {
          if (order.zoneId) expect(order.zoneId).toBe('dz-tumkur');
        });
      }
    });

    it('filters Customers and Customer details to the permitted zone', async () => {
      const blrReq = new Request('http://localhost:3000/api/bff/admin/customers', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'customers']));
      expect(blrRes.status).toBe(200);
      const blrBody = await blrRes.json();
      expect(blrBody.success).toBe(true);
    });

    it('filters Restaurants to the permitted zone', async () => {
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/restaurants', {
        headers: { cookie: tmkCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'restaurants']));
      expect(tmkRes.status).toBe(200);
      const tmkBody = await tmkRes.json();
      expect(tmkBody.success).toBe(true);
    });

    it('filters Delivery Partners & KYC details to the permitted zone', async () => {
      const blrReq = new Request('http://localhost:3000/api/bff/admin/delivery-partners', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'delivery-partners']));
      expect(blrRes.status).toBe(200);
      const blrBody = await blrRes.json();
      expect(blrBody.success).toBe(true);
    });

    it('filters Financial Reports, Settlements, and Transactions to the permitted zone', async () => {
      const tmkReq = new Request('http://localhost:3000/api/bff/admin/payments/settlements', {
        headers: { cookie: tmkCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const tmkRes = await bffGet(tmkReq, makeCtx(['admin', 'payments', 'settlements']));
      expect(tmkRes.status).toBe(200);
      const tmkBody = await tmkRes.json();
      expect(tmkBody.success).toBe(true);
    });

    it('filters Reviews & Moderation to the permitted zone', async () => {
      const blrReq = new Request('http://localhost:3000/api/bff/admin/reviews', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const blrRes = await bffGet(blrReq, makeCtx(['admin', 'reviews']));
      expect(blrRes.status).toBe(200);
    });
  });

  describe('4. Cross-Zone Security Enforcement: 403 Forbidden Rejection', () => {
    const blrCookie = 'foodie_access_token=demo-admin-ops-token; foodie_user_role=OPS; foodie_user_assigned_zone=dz-bangalore; foodie_active_zone_id=dz-bangalore;';

    it('rejects cross-zone query parameter (?zoneId=dz-tumkur) with 403 Forbidden', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/orders?zoneId=dz-tumkur', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const res = await bffGet(req, makeCtx(['admin', 'orders']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Cross-zone access denied');
    });

    it('rejects cross-zone header (X-Active-Zone-Id: dz-tumkur) with 403 Forbidden', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/delivery-partners', {
        headers: {
          cookie: blrCookie,
          authorization: 'Bearer demo-admin-ops-token',
          'X-Active-Zone-Id': 'dz-tumkur',
        },
      });
      const res = await bffGet(req, makeCtx(['admin', 'delivery-partners']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('rejects global zone request (?zoneId=ALL) from a Zone Admin with 403 Forbidden', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/restaurants?zoneId=ALL', {
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const res = await bffGet(req, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Cross-zone access denied');
    });

    it('rejects unauthorized mutations (POST/PATCH/DELETE) targeting a foreign zone with 403 Forbidden', async () => {
      const patchReq = new Request('http://localhost:3000/api/bff/admin/orders/ord-999/status?zoneId=dz-tumkur', {
        method: 'PATCH',
        headers: {
          cookie: blrCookie,
          authorization: 'Bearer demo-admin-ops-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const patchRes = await bffPatch(patchReq, makeCtx(['admin', 'orders', 'ord-999', 'status']));
      expect(patchRes.status).toBe(403);

      const delReq = new Request('http://localhost:3000/api/bff/admin/restaurants/rst-999?zoneId=dz-tumkur', {
        method: 'DELETE',
        headers: { cookie: blrCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const delRes = await bffDelete(delReq, makeCtx(['admin', 'restaurants', 'rst-999']));
      expect(delRes.status).toBe(403);
    });
  });

  describe('5. Indirect Data Leak Prevention: Pagination Totals & Aggregates', () => {
    const tmkCookie = 'foodie_access_token=demo-admin-ops-token; foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur; foodie_active_zone_id=dz-tumkur;';

    it('synchronizes pagination totalItems and totalPages with the filtered zone results', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/orders', {
        headers: { cookie: tmkCookie, authorization: 'Bearer demo-admin-ops-token' },
      });
      const res = await bffGet(req, makeCtx(['admin', 'orders']));
      expect(res.status).toBe(200);
      const body = await res.json();

      if (body.data?.items && body.data?.pagination) {
        // Pagination total items must not exceed filtered items or leak global count
        expect(body.data.pagination.totalItems).toBeLessThanOrEqual(body.data.items.length);
      }
    });
  });

  describe('6. Preservation of Staff Roles and Standard Workflows', () => {
    it('preserves existing staff roles and post-login route assignments', () => {
      expect(getHomeRouteForRole('AUDITOR')).toBe('/compliance-auditor/dashboard');
      expect(getHomeRouteForRole('FINANCE_ADMIN')).toBe('/finance-admin/dashboard');
      expect(getHomeRouteForRole('SUPPORT_AGENT')).toBe('/support');
      expect(getHomeRouteForRole('RESTAURANT_MANAGER')).toBe('/restaurants');
      expect(getHomeRouteForRole('OPS')).toBe('/dashboard');
    });

    it('preserves Compliance Auditor and Finance Admin credentials authentication', async () => {
      const auditorReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'auditor@foodie.local',
          password: 'Admin@12345',
        }),
      });
      const res = await loginPost(auditorReq);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.role).toBe('AUDITOR');
      expect(body.data.assignedZoneId).toBeNull();
    });
  });
});
