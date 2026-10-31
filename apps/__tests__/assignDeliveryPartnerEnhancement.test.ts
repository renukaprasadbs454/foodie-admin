import {
  getOnlineDeliveryPartners,
  assignDeliveryPartnerToOrder,
  getOrderAssignment,
} from '../lib/deliveryAssignmentStore';
import { GET as getAdminOrderRoute } from '../app/api/admin/orders/[id]/route';
import { POST as assignPartnerRoute } from '../app/api/admin/orders/[id]/assign-delivery-partner/route';
import { GET as getOnlineDeliveryPartnersRoute } from '../app/api/admin/delivery-partners/route';

describe('Enhanced Assign Delivery Partner Feature — Admin Panel', () => {
  const unassignedOrderId = 'ord-test-unassigned-101';
  const assignedOrderId = 'ord-test-assigned-202';

  it('1. GET /api/admin/orders/:id returns unassigned state with null delivery partner', async () => {
    const req = new Request(`http://localhost:3100/api/admin/orders/${unassignedOrderId}`);
    const res = await getAdminOrderRoute(req, {
      params: Promise.resolve({ id: unassignedOrderId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.deliveryPartnerId).toBeNull();
    expect(json.data.deliveryPartnerName).toBeNull();
    expect(json.data.deliveryPartnerPhone).toBeNull();
    expect(json.data.assignedDeliveryPartner).toBeNull();
  });

  it('2. GET /api/admin/delivery-partners?status=online returns online partners with Full Name and Phone', async () => {
    const req = new Request('http://localhost:3100/api/admin/delivery-partners?status=online');
    const res = await getOnlineDeliveryPartnersRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    for (const partner of json.data) {
      expect(partner.isOnline).toBe(true);
      expect(partner.fullName || partner.name).toBeDefined();
      expect(partner.phoneNumber || partner.phone).toBeDefined();
    }
  });

  it('3. POST /api/admin/orders/:id/assign-delivery-partner assigns online partner and persists to store', async () => {
    const partners = await getOnlineDeliveryPartners();
    const partnerToAssign = partners[0];

    const assignReq = new Request(
      `http://localhost:3100/api/admin/orders/${assignedOrderId}/assign-delivery-partner`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartnerId: partnerToAssign.id,
          orderNumber: 'ORD-2026',
        }),
      }
    );

    const assignRes = await assignPartnerRoute(assignReq, {
      params: Promise.resolve({ id: assignedOrderId }),
    });

    expect(assignRes.status).toBe(200);
    const assignJson = await assignRes.json();
    expect(assignJson.success).toBe(true);
    expect(assignJson.data.assignedDeliveryPartnerId).toBe(partnerToAssign.id);
    expect(assignJson.data.assignedDeliveryPartnerName).toBe(partnerToAssign.fullName);
    expect(assignJson.data.assignedDeliveryPartnerPhone).toBe(partnerToAssign.phoneNumber);
    expect(assignJson.data.status).toBe('ASSIGNED');

    // Verify persistence in store
    const stored = getOrderAssignment(assignedOrderId);
    expect(stored).not.toBeNull();
    expect(stored?.deliveryPartnerId).toBe(partnerToAssign.id);
    expect(stored?.deliveryPartnerName).toBe(partnerToAssign.fullName);
    expect(stored?.status).toBe('ASSIGNED');
  });

  it('4. GET /api/admin/orders/:id returns assigned state on refresh/re-fetch with partner details', async () => {
    const req = new Request(`http://localhost:3100/api/admin/orders/${assignedOrderId}`);
    const res = await getAdminOrderRoute(req, {
      params: Promise.resolve({ id: assignedOrderId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.deliveryPartnerId).toBeDefined();
    expect(json.data.deliveryPartnerName).toBeDefined();
    expect(json.data.deliveryPartnerPhone).toBeDefined();
    expect(json.data.assignedDeliveryPartner).toBeDefined();
    expect(json.data.assignedDeliveryPartner.fullName).toBe(json.data.deliveryPartnerName);
    expect(json.data.status).toBe('ASSIGNED');
  });

  it('5. Re-assigning to a different online partner updates the assignment and keeps status ASSIGNED', async () => {
    const partners = await getOnlineDeliveryPartners();
    const newPartner = partners.length > 1 ? partners[1] : partners[0];

    const reassignReq = new Request(
      `http://localhost:3100/api/admin/orders/${assignedOrderId}/assign-delivery-partner`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartnerId: newPartner.id,
        }),
      }
    );

    const reassignRes = await assignPartnerRoute(reassignReq, {
      params: Promise.resolve({ id: assignedOrderId }),
    });

    expect(reassignRes.status).toBe(200);
    const reassignJson = await reassignRes.json();
    expect(reassignJson.success).toBe(true);
    expect(reassignJson.data.assignedDeliveryPartnerId).toBe(newPartner.id);
    expect(reassignJson.data.assignedDeliveryPartnerName).toBe(newPartner.fullName);
    expect(reassignJson.data.status).toBe('ASSIGNED');

    // Confirm GET reflects the new partner
    const getReq = new Request(`http://localhost:3100/api/admin/orders/${assignedOrderId}`);
    const getRes = await getAdminOrderRoute(getReq, {
      params: Promise.resolve({ id: assignedOrderId }),
    });
    const getJson = await getRes.json();
    expect(getJson.data.deliveryPartnerId).toBe(newPartner.id);
    expect(getJson.data.deliveryPartnerName).toBe(newPartner.fullName);
    expect(getJson.data.status).toBe('ASSIGNED');
  });
});

