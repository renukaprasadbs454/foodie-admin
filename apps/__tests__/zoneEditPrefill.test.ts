import { POST as bffPost, GET as bffGet, PUT as bffPut } from '../app/api/bff/[...path]/route';

const makeCtx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('Delivery Zone Edit with Full Data Prefill', () => {
  const globalAny = global as unknown as Record<string, unknown>;

  const superAdminHeaders = {
    cookie: 'foodie_access_token=demo-admin-super_admin-token; foodie_user_role=SUPER_ADMIN; foodie_active_zone_id=ALL;',
    authorization: 'Bearer demo-admin-super_admin-token',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    delete globalAny.ADMIN_DYNAMIC_ZONES;
    delete globalAny.ADMIN_DELETED_ZONES;
  });

  it('1. GET /api/bff/admin/location/zones/:id returns full zone data for prefilling', async () => {
    const req = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-bangalore', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const res = await bffGet(req, makeCtx(['admin', 'location', 'zones', 'dz-bangalore']));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('dz-bangalore');
    expect(body.data.zoneName).toBe('Bangalore Zone');
    expect(body.data.cityName).toBe('Bangalore');
    expect(body.data.latitude).toBe(12.9716);
    expect(body.data.longitude).toBe(77.5946);
    expect(body.data.radiusKm).toBe(25);
    expect(body.data.restaurantEnabled).toBe(true);
    expect(body.data.deliveryPartnerEnabled).toBe(true);
    expect(body.data.customerOrderingEnabled).toBe(true);
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.surgeMultiplier).toBe(1.0);
  });

  it('2. PUT /api/bff/admin/location/zones/:id updates zone data, radius, coordinates, switches, and surge multiplier', async () => {
    const updatePayload = {
      zoneName: 'Bengaluru Core Metro Zone',
      cityName: 'Bangalore',
      latitude: 12.9750,
      longitude: 77.6000,
      radiusKm: 30.5,
      polygonCoordinates: '12.9750,77.6000 | 12.9900,77.6100 | 12.9600,77.5900',
      surgeMultiplier: 1.25,
      status: 'ACTIVE',
      restaurantEnabled: true,
      deliveryPartnerEnabled: false,
      customerOrderingEnabled: true,
      createZoneAdmin: true,
      zoneAdminName: 'Bangalore Zone Head',
      zoneAdminEmail: 'blr.head@foodie.com',
      zoneAdminPhone: '+91 98888 77777',
      zoneAdminRole: 'OPS',
      zoneAdminDept: 'City Operations',
    };

    const putReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-bangalore', {
      method: 'PUT',
      headers: superAdminHeaders,
      body: JSON.stringify(updatePayload),
    });
    const putRes = await bffPut(putReq, makeCtx(['admin', 'location', 'zones', 'dz-bangalore']));
    expect(putRes.status).toBe(200);

    const putBody = await putRes.json();
    expect(putBody.success).toBe(true);
    expect(putBody.data.zoneName).toBe('Bengaluru Core Metro Zone');
    expect(putBody.data.radiusKm).toBe(30.5);
    expect(putBody.data.surgeMultiplier).toBe(1.25);
    expect(putBody.data.deliveryPartnerEnabled).toBe(false);

    // Verify GET /:id reflects the updated zone data and attached admin
    const getReq = new Request('http://localhost:3000/api/bff/admin/location/zones/dz-bangalore', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const getRes = await bffGet(getReq, makeCtx(['admin', 'location', 'zones', 'dz-bangalore']));
    const getBody = await getRes.json();
    expect(getBody.data.zoneName).toBe('Bengaluru Core Metro Zone');
    expect(getBody.data.radiusKm).toBe(30.5);
    expect(getBody.data.adminEmail).toBe('blr.head@foodie.com');

    // Verify GET all zones reflects updated zone in the full list
    const listReq = new Request('http://localhost:3000/api/bff/admin/location/zones', {
      method: 'GET',
      headers: superAdminHeaders,
    });
    const listRes = await bffGet(listReq, makeCtx(['admin', 'location', 'zones']));
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);

    const updated = listBody.data.find((z: any) => z.id.toLowerCase() === 'dz-bangalore');
    expect(updated).toBeDefined();
    expect(updated.zoneName).toBe('Bengaluru Core Metro Zone');
    expect(updated.radiusKm).toBe(30.5);
    expect(updated.surgeMultiplier).toBe(1.25);
  });
});
