import { POST as bffPost, GET as bffGet, PATCH as bffPatch, DELETE as bffDelete } from '../app/api/bff/[...path]/route';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Super Admin Multi-Zone Creation & Delivery Multi-Zones Display', () => {
  jest.setTimeout(30000);
  const globalAny = global as unknown as Record<string, unknown>;

  const superAdminHeaders = {
    cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN; foodie_active_zone_id=ALL;',
    authorization: 'Bearer demo-admin-super_admin-token',
    'Content-Type': 'application/json',
  };

  const tumkurAdminHeaders = {
    cookie: 'foodie_access_token=demo-admin-ops-token; foodie_user_role=OPS; foodie_user_assigned_zone=dz-tumkur; foodie_active_zone_id=dz-tumkur;',
    authorization: 'Bearer demo-admin-ops-token',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    delete globalAny.ADMIN_DYNAMIC_ZONES;
  });

  it('1. GET /api/bff/admin/location/zones returns canonical Bangalore and Tumkur zones', async () => {
    const req = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const res = await bffGet(req, makeCtx(['admin', 'location', 'zones']));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const ids = body.data.map((z: any) => z.id.toLowerCase());
    expect(ids).toContain('dz-bangalore');
    expect(ids).toContain('dz-tumkur');
  });

  it('2. Super Admin can create a new delivery multi-zone via POST /api/bff/admin/location/zones', async () => {
    const newZonePayload = {
      zoneName: 'Mysore Heritage Zone',
      cityName: 'Mysuru',
      latitude: 12.2958,
      longitude: 76.6394,
      radiusKm: 12.0,
      polygonCoordinates: '12.2958,76.6394 | 12.3100,76.6500 | 12.2800,76.6200',
      activeDrivers: 15,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      restaurantEnabled: true,
      deliveryPartnerEnabled: true,
      customerOrderingEnabled: true,
    };

    const req = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify(newZonePayload),
    });

    const res = await bffPost(req, makeCtx(['admin', 'location', 'zones']));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.zoneName).toBe('Mysore Heritage Zone');
    expect(body.data.cityName).toBe('Mysuru');
    expect(body.data.id).toMatch(/^dz-mysore-heritage-zone/);
  });

  it('3. Newly created zone is immediately listed in GET /api/bff/admin/location/zones for Super Admin', async () => {
    // 1. Create Hubli Zone
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        zoneName: 'Hubli Industrial Zone',
        cityName: 'Hubballi',
        latitude: 15.3647,
        longitude: 75.1240,
        radiusKm: 15.0,
        status: 'ACTIVE',
      }),
    });
    await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));

    // 2. Fetch all zones
    const getReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const res = await bffGet(getReq, makeCtx(['admin', 'location', 'zones']));
    expect(res.status).toBe(200);

    const body = await res.json();
    const zoneNames = body.data.map((z: any) => z.zoneName);
    expect(zoneNames).toContain('Bangalore Zone');
    expect(zoneNames).toContain('Tumkur Zone');
    expect(zoneNames).toContain('Hubli Industrial Zone');
  });

  it('4. Non-Super Admin (Zone Admin) only sees their assigned zone in Delivery Multi-Zones', async () => {
    // Super Admin creates a new zone
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        zoneName: 'Mangalore Coastal Zone',
        cityName: 'Mangalore',
        status: 'ACTIVE',
      }),
    });
    await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));

    // Tumkur Zone Admin fetches location zones
    const getReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'GET',
      headers: tumkurAdminHeaders,
    });
    const res = await bffGet(getReq, makeCtx(['admin', 'location', 'zones']));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe('dz-tumkur');
    expect(body.data[0].zoneName).toBe('Tumkur Zone');
  });

  it('5. Super Admin can update 3-way switches and status for a zone', async () => {
    // 1. Create a zone
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        id: 'dz-belgaum',
        zoneName: 'Belgaum Zone',
        cityName: 'Belgaum',
        status: 'ACTIVE',
        restaurantEnabled: true,
      }),
    });
    await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));

    // 2. Toggle switches
    const patchTogglesReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-belgaum/toggles?restaurantEnabled=false&deliveryPartnerEnabled=true', {
      method: 'PATCH',
      headers: superAdminHeaders,
    });
    const toggleRes = await bffPatch(patchTogglesReq, makeCtx(['admin', 'location', 'zones', 'dz-belgaum', 'toggles']));
    expect(toggleRes.status).toBe(200);
    const toggleBody = await toggleRes.json();
    expect(toggleBody.data.restaurantEnabled).toBe(false);

    // 3. Update status to INACTIVE
    const patchStatusReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-belgaum/status?status=INACTIVE', {
      method: 'PATCH',
      headers: superAdminHeaders,
    });
    const statusRes = await bffPatch(patchStatusReq, makeCtx(['admin', 'location', 'zones', 'dz-belgaum', 'status']));
    expect(statusRes.status).toBe(200);
  });

  it('6. Super Admin can delete a zone and it is removed from the delivery multi-zones list', async () => {
    // 1. Create zone to delete
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        id: 'dz-temporary-zone',
        zoneName: 'Temporary Test Zone',
        status: 'ACTIVE',
      }),
    });
    await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));

    // 2. Delete zone
    const delReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-temporary-zone', {
      method: 'DELETE',
      headers: superAdminHeaders,
    });
    const delRes = await bffDelete(delReq, makeCtx(['admin', 'location', 'zones', 'dz-temporary-zone']));
    expect(delRes.status).toBe(200);

    // 3. Verify it is no longer listed
    const getReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const getRes = await bffGet(getReq, makeCtx(['admin', 'location', 'zones']));
    const body = await getRes.json();
    const ids = body.data.map((z: any) => z.id);
    expect(ids).not.toContain('dz-temporary-zone');
  });

  it('7. Non-Super Admin cannot create or delete zones', async () => {
    // Attempt create
    const createReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'POST',
      headers: tumkurAdminHeaders,
      body: JSON.stringify({
        zoneName: 'Unauthorized Zone',
      }),
    });
    const createRes = await bffPost(createReq, makeCtx(['admin', 'location', 'zones']));
    expect(createRes.status).toBe(403);

    // Attempt delete
    const delReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-tumkur', {
      method: 'DELETE',
      headers: tumkurAdminHeaders,
    });
    const delRes = await bffDelete(delReq, makeCtx(['admin', 'location', 'zones', 'dz-tumkur']));
    expect(delRes.status).toBe(403);
  });
});
