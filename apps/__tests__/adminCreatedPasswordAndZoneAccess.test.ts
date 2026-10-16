import { hashPassword, verifyPassword, isStrongPassword } from '../lib/adminSecurity';
import { POST as loginPost } from '../app/api/auth/login/route';
import { GET as bffGet, POST as bffPost, PATCH as bffPatch } from '../app/api/bff/[...path]/route';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Task: Admin-Created Password and Zone-Based User Access', () => {
  jest.setTimeout(25000);
  const globalAny = global as unknown as Record<string, unknown>;

  beforeEach(() => {
    // Reset global store before each test
    delete globalAny.ADMIN_USERS_STORE;
  });

  describe('1 & 7. Password Security & Validation', () => {
    it('validates password strength rules', () => {
      expect(isStrongPassword('ValidPass@123')).toBe(true);
      expect(isStrongPassword('Secure#2026')).toBe(true);

      // Too short
      expect(isStrongPassword('Pass@1')).toBe(false);
      // Missing uppercase
      expect(isStrongPassword('lowercase@123')).toBe(false);
      // Missing lowercase
      expect(isStrongPassword('UPPERCASE@123')).toBe(false);
      // Missing number or symbol
      expect(isStrongPassword('OnlyLettersHere')).toBe(false);
    });

    it('hashes passwords securely using salted PBKDF2 without exposing plaintext', () => {
      const plaintext = 'AdminPass#99';
      const hash1 = hashPassword(plaintext);
      const hash2 = hashPassword(plaintext);

      // Must be prefixed with pbkdf2 and contain salt
      expect(hash1.startsWith('pbkdf2:')).toBe(true);
      // Two hashes of same password must differ due to unique salts
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toContain(plaintext);

      // Verifies correct password
      expect(verifyPassword(plaintext, hash1)).toBe(true);
      expect(verifyPassword('WrongPass#99', hash1)).toBe(false);
    });
  });

  describe('2 & 3. Provisioning User with Admin-Created Password & Assigned Zone', () => {
    it('rejects user provisioning when password is missing or weak', async () => {
      const weakReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Ops User',
          email: 'testops@foodie.local',
          phone: '+91 98000 11111',
          role: 'OPS',
          password: 'weak',
        }),
      });

      const res = await bffPost(weakReq, makeCtx(['admin', 'users']));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('provisions user with password and assigned zone, hiding password in responses', async () => {
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Tumkur Operations Lead',
          email: 'tumkur.ops@foodie.local',
          phone: '+91 98000 22222',
          role: 'OPS',
          department: 'Zone Logistics',
          assignedZoneId: 'dz-tumkur',
          assignedZoneName: 'Tumkur Zone',
          password: 'TumkurPass@2026',
        }),
      });

      const res = await bffPost(createReq, makeCtx(['admin', 'users']));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('tumkur.ops@foodie.local');
      expect(body.data.assignedZoneId).toBe('dz-tumkur');
      expect(body.data.assignedZoneName).toBe('Tumkur Zone');
      // Passwords must NEVER be exposed in API responses
      expect(body.data.password).toBeUndefined();
      expect(body.data.passwordHash).toBeUndefined();

      // Ensure directory GET also strips password hashes
      const listReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'GET',
      });
      const listRes = await bffGet(listReq, makeCtx(['admin', 'users']));
      const listBody = await listRes.json();
      const createdInList = listBody.data.find((u: any) => u.email === 'tumkur.ops@foodie.local');
      expect(createdInList).toBeDefined();
      expect(createdInList.password).toBeUndefined();
      expect(createdInList.passwordHash).toBeUndefined();
    });
  });

  describe('3 & 4. Login with Admin-Created Password & Zone Isolation', () => {
    it('authenticates user with admin-created password and binds zone cookies', async () => {
      // Provision user first
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bangalore Field Ops',
          email: 'blr.ops@foodie.local',
          phone: '+91 98000 33333',
          role: 'OPS',
          assignedZoneId: 'dz-bangalore',
          assignedZoneName: 'Bangalore Zone',
          password: 'BangalorePass@123',
        }),
      });
      await bffPost(createReq, makeCtx(['admin', 'users']));

      // Attempt login with valid password
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'blr.ops@foodie.local',
          password: 'BangalorePass@123',
        }),
      });

      const loginRes = await loginPost(loginReq);
      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      expect(loginBody.success).toBe(true);
      expect(loginBody.data.role).toBe('OPS');
      expect(loginBody.data.assignedZoneId).toBe('dz-bangalore');
      expect(loginBody.data.assignedZoneName).toBe('Bangalore Zone');

      // Verify zone cookie headers were set
      const cookies = loginRes.headers.get('set-cookie') || '';
      expect(cookies).toContain('foodie_user_assigned_zone=dz-bangalore');
      expect(cookies).toContain('foodie_active_zone_id=dz-bangalore');
    });

    it('rejects login with wrong password', async () => {
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Audit Lead',
          email: 'audit.lead@foodie.local',
          phone: '+91 98000 44444',
          role: 'AUDITOR',
          password: 'SecurePass@2026',
        }),
      });
      await bffPost(createReq, makeCtx(['admin', 'users']));

      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'audit.lead@foodie.local',
          password: 'WrongPassword@123',
        }),
      });

      const loginRes = await loginPost(loginReq);
      expect(loginRes.status).toBe(401);
      const loginBody = await loginRes.json();
      expect(loginBody.success).toBe(false);
      expect(loginBody.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects suspended accounts with 403 Forbidden', async () => {
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Suspended Ops',
          email: 'suspended.ops@foodie.local',
          phone: '+91 98000 55555',
          role: 'OPS',
          password: 'ValidPassword@123',
        }),
      });
      const createdRes = await bffPost(createReq, makeCtx(['admin', 'users']));
      const createdUser = (await createdRes.json()).data;

      // Suspend user
      const usersStore = globalAny.ADMIN_USERS_STORE as any[];
      const user = usersStore.find((u) => u.id === createdUser.id);
      user.accountStatus = 'SUSPENDED';

      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'suspended.ops@foodie.local',
          password: 'ValidPassword@123',
        }),
      });

      const loginRes = await loginPost(loginReq);
      expect(loginRes.status).toBe(403);
      const loginBody = await loginRes.json();
      expect(loginBody.error.code).toBe('FORBIDDEN');
    });
  });

  describe('4, 5 & 6. Zone Data Isolation and Backend Security', () => {
    it('restricts available operating zones to assigned zone for non-super-admins', async () => {
      const req = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          cookie: 'foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur',
        },
      });

      const res = await bffGet(req, makeCtx(['admin', 'zones', 'available']));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe('dz-tumkur');
      expect(body.data[0].zoneName).toBe('Tumkur Zone');
    });

    it('rejects foreign zone selection for non-super-admin with 403 Forbidden', async () => {
      const selectForeignReq = new Request('http://localhost:3000/api/bff/admin/zones/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur',
        },
        body: JSON.stringify({ zoneId: 'dz-bangalore' }),
      });

      const res = await bffPost(selectForeignReq, makeCtx(['admin', 'zones', 'select']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('allows Super Admin full access to all operating zones', async () => {
      const availableReq = new Request('http://localhost:3000/api/bff/admin/zones/available', {
        method: 'GET',
        headers: {
          cookie: 'foodie_user_role=SUPER_ADMIN',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
      });

      const res = await bffGet(availableReq, makeCtx(['admin', 'zones', 'available']));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data.map((z: any) => z.id)).toEqual(['dz-bangalore', 'dz-tumkur']);

      // Super Admin can switch to any zone
      const selectReq = new Request('http://localhost:3000/api/bff/admin/zones/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'foodie_user_role=SUPER_ADMIN',
          authorization: 'Bearer demo-admin-super_admin-token',
        },
        body: JSON.stringify({ zoneId: 'dz-tumkur' }),
      });

      const selectRes = await bffPost(selectReq, makeCtx(['admin', 'zones', 'select']));
      expect(selectRes.status).toBe(200);
      const selectBody = await selectRes.json();
      expect(selectBody.data.zoneId).toBe('dz-tumkur');
    });

    it('prevents cross-zone mutation requests from unauthorized non-super-admins', async () => {
      const crossZoneMutateReq = new Request('http://localhost:3000/api/bff/admin/restaurants?zoneId=dz-bangalore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Active-Zone-Id': 'dz-bangalore',
          cookie: 'foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur',
        },
        body: JSON.stringify({ name: 'Foreign Zone Restaurant' }),
      });

      const res = await bffPost(crossZoneMutateReq, makeCtx(['admin', 'restaurants']));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('8. Prevention of Duplicate Admin User Provisioning and Directory Uniqueness', () => {
    it('does not create duplicate accounts when the same email is provisioned multiple times', async () => {
      const email = 'blr.admin@foodie.local';

      // 1. First provisioning
      const req1 = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bangalore Zone Manager',
          email,
          phone: '+91 98888 12345',
          role: 'OPS',
          department: 'Regional Operations',
          assignedZoneId: 'dz-bangalore',
          assignedZoneName: 'Bangalore Zone',
          password: 'BlrSecure@2026',
        }),
      });
      const res1 = await bffPost(req1, makeCtx(['admin', 'users']));
      expect(res1.status === 200 || res1.status === 201).toBe(true);
      const body1 = await res1.json();
      const initialId = body1.data.id;

      // 2. Second provisioning with same email (case variation)
      const req2 = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bangalore Zone Manager Updated',
          email: 'BLR.ADMIN@FOODIE.LOCAL',
          phone: '+91 98888 54321',
          role: 'OPS',
          department: 'Regional Operations',
          assignedZoneId: 'dz-bangalore',
          assignedZoneName: 'Bangalore Zone',
          password: 'BlrSecure@2026',
        }),
      });
      const res2 = await bffPost(req2, makeCtx(['admin', 'users']));
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.data.id).toBe(initialId); // Preserves stable unique ID

      // 3. Query directory list to confirm no duplicate entries
      const listReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'GET',
      });
      const listRes = await bffGet(listReq, makeCtx(['admin', 'users']));
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      const matching = listBody.data.filter((u: any) => u.email.toLowerCase() === email.toLowerCase());
      expect(matching.length).toBe(1);
    });

    it('rejects provisioning when email is missing or empty', async () => {
      const emptyEmailReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'No Email User',
          phone: '+91 98888 12345',
          password: 'ValidPassword@123',
        }),
      });
      const res = await bffPost(emptyEmailReq, makeCtx(['admin', 'users']));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('9. Password Column & Secure Password Reset Functionality', () => {
    it('allows Super Admin to securely reset an admin user password and authenticate with the new password', async () => {
      // 1. Provision a zone admin
      const email = 'reset.test@foodie.local';
      const createReq = new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Reset Target User',
          email,
          phone: '+91 98888 77777',
          role: 'OPS',
          department: 'Field Operations',
          assignedZoneId: 'dz-bangalore',
          assignedZoneName: 'Bangalore Zone',
          password: 'InitialPass@123',
        }),
      });
      const createRes = await bffPost(createReq, makeCtx(['admin', 'users']));
      expect(createRes.status).toBe(201);
      const user = (await createRes.json()).data;
      const userId = user.id;

      // 2. Reset password via PATCH endpoint
      const newPassword = 'NewSecretPassword@2026';
      const resetReq = new Request(`http://localhost:3000/api/bff/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      const resetRes = await bffPatch(resetReq, makeCtx(['admin', 'users', userId, 'password']));
      expect(resetRes.status).toBe(200);
      const resetBody = await resetRes.json();
      expect(resetBody.success).toBe(true);
      // Ensure password or hash is NEVER exposed in the response
      expect(resetBody.data.password).toBeUndefined();
      expect(resetBody.data.passwordHash).toBeUndefined();

      // 3. Verify old password fails
      const failLoginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'InitialPass@123',
        }),
      });
      const failLoginRes = await loginPost(failLoginReq);
      expect(failLoginRes.status).toBe(401);

      // 4. Verify new password succeeds
      const successLoginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: newPassword,
        }),
      });
      const successLoginRes = await loginPost(successLoginReq);
      expect(successLoginRes.status).toBe(200);
      const loginBody = await successLoginRes.json();
      expect(loginBody.success).toBe(true);
      expect(loginBody.data.email).toBe(email);
    });

    it('rejects password reset when the new password is weak or missing', async () => {
      const resetReq = new Request(`http://localhost:3000/api/bff/admin/users/USR-1001/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'short',
        }),
      });
      const resetRes = await bffPatch(resetReq, makeCtx(['admin', 'users', 'USR-1001', 'password']));
      expect(resetRes.status).toBe(400);
      const resetBody = await resetRes.json();
      expect(resetBody.success).toBe(false);
      expect(resetBody.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 404 when resetting password for a non-existent admin user', async () => {
      const resetReq = new Request(`http://localhost:3000/api/bff/admin/users/USR-NONEXISTENT/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'ValidPassword@123',
        }),
      });
      const resetRes = await bffPatch(resetReq, makeCtx(['admin', 'users', 'USR-NONEXISTENT', 'password']));
      expect(resetRes.status).toBe(404);
      const resetBody = await resetRes.json();
      expect(resetBody.success).toBe(false);
      expect(resetBody.error.code).toBe('NOT_FOUND');
    });
  });
});
