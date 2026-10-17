import { GET as bffGet, POST as bffPost, DELETE as bffDelete } from '../app/api/bff/[...path]/route';
import { GET as rolesGet } from '../app/api/auth/roles/route';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Zone Deletion Cascades & City Metrics Verification', () => {
  jest.setTimeout(30000);
  const globalAny = global as unknown as Record<string, unknown>;

  beforeEach(() => {
    delete globalAny.ADMIN_DYNAMIC_ZONES;
    delete globalAny.ADMIN_USERS_STORE;
    delete globalAny.ADMIN_DELETED_ZONES;
  });

  it('Issue 1: Deleting a zone updates the city active zones count dynamically', async () => {
    // 1. Create a zone in Tumakuru
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'foodie_admin_role=SUPER_ADMIN',
      },
      body: JSON.stringify({
        zoneName: 'Tumakuru Smart City Zone',
        cityName: 'Tumakuru',
        latitude: 13.3379,
        longitude: 77.1173,
        radiusKm: 12.0,
      }),
    });
    const createRes = await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));
    expect(createRes.status).toBe(200);
    const createdZone = (await createRes.json()).data;
    expect(createdZone.id).toBeDefined();

    // 2. Fetch cities: Tumakuru should have at least 1 active zone
    const citiesReq1 = new Request('http://localhost:3000/api/bff/admin/location/cities', {
      method: 'GET',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const citiesRes1 = await bffGet(citiesReq1, makeCtx(['admin', 'location', 'cities']));
    expect(citiesRes1.status).toBe(200);
    const cities1 = (await citiesRes1.json()).data;
    const tumkurCity1 = cities1.find((c: any) => c.cityName.toLowerCase().includes('tum'));
    expect(tumkurCity1).toBeDefined();
    const countBeforeDelete = tumkurCity1.activeZonesCount;
    expect(countBeforeDelete).toBeGreaterThanOrEqual(1);

    // 3. Delete that zone permanently
    const deleteReq = new Request(`http://localhost:3000/api/bff/admin/location/zones/${createdZone.id}`, {
      method: 'DELETE',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const deleteRes = await bffDelete(deleteReq, makeCtx(['admin', 'location', 'zones', createdZone.id]));
    expect(deleteRes.status).toBe(200);

    // 4. Fetch cities again: activeZonesCount must decrease!
    const citiesReq2 = new Request('http://localhost:3000/api/bff/admin/location/cities', {
      method: 'GET',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const citiesRes2 = await bffGet(citiesReq2, makeCtx(['admin', 'location', 'cities']));
    const cities2 = (await citiesRes2.json()).data;
    const tumkurCity2 = cities2.find((c: any) => c.cityName.toLowerCase().includes('tum'));
    expect(tumkurCity2.activeZonesCount).toBeLessThan(countBeforeDelete);
  });

  it('Issue 2: Deleting a zone permanently deletes user credentials created for that zone', async () => {
    // 1. Super Admin provisions a zone and a user for that zone
    const zoneId = 'dz-testing-zone';
    const zoneName = 'Testing Zone';
    const createZoneReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'foodie_admin_role=SUPER_ADMIN',
      },
      body: JSON.stringify({
        id: zoneId,
        zoneName,
        cityName: 'Tumakuru',
      }),
    });
    await bffPost(createZoneReq, makeCtx(['admin', 'location', 'zones']));

    const createUserReq = new Request('http://localhost:3000/api/bff/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'foodie_admin_role=SUPER_ADMIN',
      },
      body: JSON.stringify({
        fullName: 'Testing Zone Lead',
        email: 'testing.lead@foodie.local',
        phone: '+91 99999 11111',
        role: 'OPS',
        assignedZoneId: zoneId,
        assignedZoneName: zoneName,
        password: 'Password@123',
      }),
    });
    const createUserRes = await bffPost(createUserReq, makeCtx(['admin', 'users']));
    expect(createUserRes.status).toBe(201);

    // Verify user is present in users list
    const getUsersReq1 = new Request('http://localhost:3000/api/bff/admin/users', {
      method: 'GET',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const getUsersRes1 = await bffGet(getUsersReq1, makeCtx(['admin', 'users']));
    const users1 = (await getUsersRes1.json()).data;
    expect(users1.some((u: any) => u.email === 'testing.lead@foodie.local')).toBe(true);

    // 2. Delete the zone permanently
    const deleteZoneReq = new Request(`http://localhost:3000/api/bff/admin/location/zones/${zoneId}`, {
      method: 'DELETE',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const deleteZoneRes = await bffDelete(deleteZoneReq, makeCtx(['admin', 'location', 'zones', zoneId]));
    expect(deleteZoneRes.status).toBe(200);

    // 3. User credentials MUST BE DELETED from users list
    const getUsersReq2 = new Request('http://localhost:3000/api/bff/admin/users', {
      method: 'GET',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const getUsersRes2 = await bffGet(getUsersReq2, makeCtx(['admin', 'users']));
    const users2 = (await getUsersRes2.json()).data;
    expect(users2.some((u: any) => u.email === 'testing.lead@foodie.local')).toBe(false);
  });

  it('Issue 3: Login options do NOT show role-based access for the deleted zone', async () => {
    // 1. Create a zone and its admin user
    const zoneId = 'dz-coastal-zone';
    const zoneName = 'Coastal Zone';
    await bffPost(
      new Request('http://localhost:3000/api/bff/admin/location/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'foodie_admin_role=SUPER_ADMIN' },
        body: JSON.stringify({ id: zoneId, zoneName, cityName: 'Mangalore' }),
      }),
      makeCtx(['admin', 'location', 'zones'])
    );

    await bffPost(
      new Request('http://localhost:3000/api/bff/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'foodie_admin_role=SUPER_ADMIN' },
        body: JSON.stringify({
          fullName: 'Coastal Ops Admin',
          email: 'coastal.admin@foodie.local',
          phone: '+91 99999 22222',
          role: 'OPS',
          assignedZoneId: zoneId,
          assignedZoneName: zoneName,
          password: 'Password@123',
        }),
      }),
      makeCtx(['admin', 'users'])
    );

    // Check roles before deletion: must include Coastal Zone Admin
    const rolesRes1 = await rolesGet();
    const roles1 = (await rolesRes1.json()).data;
    expect(roles1.some((r: any) => r.label === 'Coastal Zone Admin' || r.zoneId === zoneId)).toBe(true);

    // 2. Delete that zone
    await bffDelete(
      new Request(`http://localhost:3000/api/bff/admin/location/zones/${zoneId}`, {
        method: 'DELETE',
        headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
      }),
      makeCtx(['admin', 'location', 'zones', zoneId])
    );

    // 3. Query roles again: Coastal Zone Admin must NOT appear in the login dropdown
    const rolesRes2 = await rolesGet();
    const roles2 = (await rolesRes2.json()).data;
    expect(roles2.some((r: any) => r.label === 'Coastal Zone Admin' || r.zoneId === zoneId)).toBe(false);

    // Query BFF auth/admin-roles route as well:
    const bffRolesRes = await bffGet(
      new Request('http://localhost:3000/api/bff/auth/admin-roles', { method: 'GET' }),
      makeCtx(['auth', 'admin-roles'])
    );
    const bffRoles = (await bffRolesRes.json()).data;
    expect(bffRoles.some((r: any) => r.label === 'Coastal Zone Admin' || r.zoneId === zoneId)).toBe(false);
  });

  it('Issue 4: City active merchants count is not 0 and accurately displays outlets', async () => {
    const citiesReq = new Request('http://localhost:3000/api/bff/admin/location/cities', {
      method: 'GET',
      headers: { Cookie: 'foodie_admin_role=SUPER_ADMIN' },
    });
    const citiesRes = await bffGet(citiesReq, makeCtx(['admin', 'location', 'cities']));
    expect(citiesRes.status).toBe(200);
    const cities = (await citiesRes.json()).data;

    expect(cities.length).toBeGreaterThan(0);
    for (const city of cities) {
      // Must not display 0 Outlets
      expect(city.activeMerchantsCount).toBeGreaterThan(0);
    }

    const tumkurCity = cities.find((c: any) => c.cityName.toLowerCase().includes('tum'));
    if (tumkurCity) {
      expect(tumkurCity.activeMerchantsCount).toBeGreaterThanOrEqual(10);
    }
  });
});
