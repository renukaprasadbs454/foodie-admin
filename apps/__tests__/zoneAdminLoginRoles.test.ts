import { GET as rolesGet } from '../app/api/auth/roles/route';
import { POST as loginPost } from '../app/api/auth/login/route';
import { POST as bffPost, GET as bffGet } from '../app/api/bff/[...path]/route';
import { hashPassword } from '../lib/adminSecurity';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Task: Dynamic Zone Admin Role Dropdown & Login Authentication', () => {
  jest.setTimeout(25000);
  const globalAny = global as unknown as Record<string, unknown>;

  beforeEach(() => {
    delete globalAny.ADMIN_USERS_STORE;
  });

  describe('1 & 2. Dynamic Roles Endpoint & Format [Zone Name] Admin', () => {
    it('returns dynamically formatted roles containing Super Admin, Bangalore Zone Admin, Tumkur Zone Admin, and system roles', async () => {
      const res = await rolesGet();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const labels = body.data.map((r: any) => r.label);

      // Verify Super Admin is present at index 0
      expect(labels[0]).toBe('Super Admin');

      // Verify dynamic zone admins formatted as "[Zone Name] Admin"
      expect(labels).toContain('Bangalore Zone Admin');
      expect(labels).toContain('Tumkur Zone Admin');

      // Verify existing roles are preserved
      expect(labels).toContain('Compliance Auditor');
      expect(labels).toContain('Finance Admin');
      expect(labels).toContain('Operations Admin');
      expect(labels).toContain('Restaurant Manager');
      expect(labels).toContain('Support Agent');
      expect(labels).toContain('Darkstore Admin');

      // Check option properties
      const blrOpt = body.data.find((r: any) => r.label === 'Bangalore Zone Admin');
      expect(blrOpt).toBeDefined();
      expect(blrOpt.zoneId).toBe('dz-bangalore');
      expect(blrOpt.zoneName).toBe('Bangalore Zone');

      const tmkOpt = body.data.find((r: any) => r.label === 'Tumkur Zone Admin');
      expect(tmkOpt).toBeDefined();
      expect(tmkOpt.zoneId).toBe('dz-tumkur');
      expect(tmkOpt.zoneName).toBe('Tumkur Zone');
    });

    it('automatically includes newly created zone admins without hardcoding or frontend changes', async () => {
      // Super Admin provisions a new zone "Mysuru Zone" with an admin user
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Mysuru Territory Manager',
          email: 'mysuru.admin@foodie.local',
          phone: '+91 98000 66666',
          role: 'OPS',
          department: 'Southern Operations',
          assignedZoneId: 'dz-mysuru',
          assignedZoneName: 'Mysuru Zone',
          password: 'MysuruPass@2026',
        }),
      });

      const createRes = await bffPost(createReq, makeCtx(['admin', 'users']));
      expect(createRes.status).toBe(201);

      // Query roles endpoint again - newly created zone admin must appear automatically!
      const rolesRes = await rolesGet();
      const rolesBody = await rolesRes.json();
      expect(rolesBody.success).toBe(true);

      const labels = rolesBody.data.map((r: any) => r.label);
      expect(labels).toContain('Mysuru Zone Admin');

      const mysuruOpt = rolesBody.data.find((r: any) => r.label === 'Mysuru Zone Admin');
      expect(mysuruOpt).toBeDefined();
      expect(mysuruOpt.zoneId).toBe('dz-mysuru');
      expect(mysuruOpt.zoneName).toBe('Mysuru Zone');
    });
  });

  describe('3 & 4. Authenticating Zone Admin Credentials and Directing to Dashboard', () => {
    it('authenticates Bangalore Zone Admin using assigned credentials and binds zone cookies', async () => {
      // Provision Bangalore Zone Admin
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bangalore Field Ops Lead',
          email: 'blr.ops.lead@foodie.local',
          phone: '+91 98000 77777',
          role: 'OPS',
          assignedZoneId: 'dz-bangalore',
          assignedZoneName: 'Bangalore Zone',
          password: 'BlrLead@2026Pass',
        }),
      });
      await bffPost(createReq, makeCtx(['admin', 'users']));

      // Bangalore Zone Admin selects option and enters credentials
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'blr.ops.lead@foodie.local',
          password: 'BlrLead@2026Pass',
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

      // Verify zone cookie headers are bound
      const cookies = res.headers.get('set-cookie') || '';
      expect(cookies).toContain('foodie_user_assigned_zone=dz-bangalore');
      expect(cookies).toContain('foodie_active_zone_id=dz-bangalore');
    });

    it('rejects cross-zone login spoofing when user tries to sign in as a different zone admin', async () => {
      // Provision Tumkur Zone Admin
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Tumkur Finance Lead',
          email: 'tumkur.fin@foodie.local',
          phone: '+91 98000 88888',
          role: 'FINANCE',
          assignedZoneId: 'dz-tumkur',
          assignedZoneName: 'Tumkur Zone',
          password: 'TumkurPass@2026',
        }),
      });
      await bffPost(createReq, makeCtx(['admin', 'users']));

      // Attempt to sign in as "Bangalore Zone Admin" using Tumkur credentials
      const spoofReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tumkur.fin@foodie.local',
          password: 'TumkurPass@2026',
          expectedZoneId: 'dz-bangalore',
        }),
      });

      const res = await loginPost(spoofReq);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Cross-zone authentication denied');
    });
  });

  describe('5 & 6. Backend Data Isolation & System Roles Preservation', () => {
    it('preserves existing Super Admin login with global access across all zones', async () => {
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
    });

    it('preserves existing standard roles (Finance Admin, Operations Admin, Support Agent)', async () => {
      const financeReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'finance@foodie.local',
          password: 'Admin@12345',
        }),
      });

      const finRes = await loginPost(financeReq);
      expect(finRes.status).toBe(200);
      const finBody = await finRes.json();
      expect(finBody.data.role).toBe('FINANCE_ADMIN');

      const supportReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'support@foodie.local',
          password: 'Admin@12345',
        }),
      });

      const supRes = await loginPost(supportReq);
      expect(supRes.status).toBe(200);
    });
  });
});
