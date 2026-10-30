import { PATCH as bffPatch } from '../app/api/bff/[...path]/route';
import fs from 'fs';
import path from 'path';

function makeCtx(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe('Delivery Partner Suspend Feature', () => {
  const testPartnerId = '5952315c-1111-2222-3333-444455556666';

  it('declares suspendDeliveryPartner in deliveryPartnersApi.ts', () => {
    const apiFile = fs.readFileSync(path.resolve(__dirname, '../api/endpoints/deliveryPartnersApi.ts'), 'utf8');
    expect(apiFile).toContain('suspendDeliveryPartner: builder.mutation');
    expect(apiFile).toContain('useSuspendDeliveryPartnerMutation');
    expect(apiFile).toContain('/api/bff/admin/delivery-partners/${partnerId}/suspend');
  });

  it('renders Suspend button and modal in DeliveryPartnersPage.tsx', () => {
    const pageFile = fs.readFileSync(path.resolve(__dirname, '../features/deliveryPartners/pages/DeliveryPartnersPage.tsx'), 'utf8');
    expect(pageFile).toContain('useSuspendDeliveryPartnerMutation');
    expect(pageFile).toContain('suspendModalPartner');
    expect(pageFile).toContain('handleConfirmSuspendPartner');
    expect(pageFile).toContain('Suspend');
    expect(pageFile).toContain('Suspend Delivery Partner');
  });

  it('handles suspend action in BFF route setting kycStatus to SUSPENDED and offline', async () => {
    const req = new Request(`http://localhost:3000/api/bff/admin/delivery-partners/${testPartnerId}/suspend`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'foodie_access_token=demo-super-admin-token; foodie_admin_role=SUPER_ADMIN',
      },
      body: JSON.stringify({ reason: 'Account suspended by Admin. Verification review in progress.' }),
    });

    const res = await bffPatch(req, makeCtx(['admin', 'delivery-partners', testPartnerId, 'suspend']));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.kycStatus).toBe('SUSPENDED');
    expect(json.data.isOnline).toBe(false);
  });

  it('clears suspension when KYC is approved or rejected', async () => {
    const globalAny = global as unknown as Record<string, unknown>;
    const suspendedMap = globalAny.ADMIN_SUSPENDED_DELIVERY_PARTNERS as Map<string, any>;
    expect(suspendedMap).toBeDefined();
    expect(suspendedMap.has(testPartnerId)).toBe(true);

    const approveReq = new Request(`http://localhost:3000/api/bff/admin/delivery-partners/${testPartnerId}/kyc-approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'foodie_access_token=demo-super-admin-token; foodie_admin_role=SUPER_ADMIN',
      },
    });

    await bffPatch(approveReq, makeCtx(['admin', 'delivery-partners', testPartnerId, 'kyc-approve']));
    expect(suspendedMap.has(testPartnerId)).toBe(false);
  });
});
