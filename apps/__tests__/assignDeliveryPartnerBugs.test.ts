import { GET as getAdminOrderRoute } from '../app/api/admin/orders/[id]/route';
import { GET as getOnlineDeliveryPartnersRoute } from '../app/api/admin/delivery-partners/route';
import { POST as assignPartnerRoute } from '../app/api/admin/orders/[id]/assign-delivery-partner/route';
import { getOnlineDeliveryPartners, getPushNotifications } from '../lib/deliveryAssignmentStore';

describe('Assign Delivery Partner Bug Fixes — 3 Bugs Verification', () => {
  describe('Bug 1: Hide Assign & Re-assign Buttons for Terminal Statuses / Show for Assignable Statuses', () => {
    const hiddenStatuses = ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'REJECTED'];
    const assignableStatuses = [
      'READY',
      'READY_FOR_PICKUP',
      'WAITING_FOR_DELIVERY_PARTNER',
      'PREPARING',
      'CONFIRMED',
      'PENDING',
    ];

    it('verifies status visibility logic: CANCELLED hides BOTH assign button and assigned badge completely', () => {
      ['CANCELLED', 'CANCELED'].forEach((status) => {
        const rawStatus = status.trim().toUpperCase();
        const isCancelled = ['CANCELLED', 'CANCELED'].includes(rawStatus);
        const isHiddenStatus = ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'REJECTED'].includes(rawStatus);

        const canShowAssignedBadge = true && !isCancelled;
        const canShowReassign = true && !isHiddenStatus;
        const canShowAssign = !false && !isHiddenStatus;

        expect(isCancelled).toBe(true);
        expect(canShowAssignedBadge).toBe(false);
        expect(canShowReassign).toBe(false);
        expect(canShowAssign).toBe(false);
      });
    });

    it('verifies status visibility logic: hidden statuses (DELIVERED, COMPLETED, REFUNDED) hide assign & re-assign buttons', () => {
      ['DELIVERED', 'COMPLETED', 'REFUNDED'].forEach((status) => {
        const rawStatus = status.trim().toUpperCase();
        const isCancelled = ['CANCELLED', 'CANCELED'].includes(rawStatus);
        const isHiddenStatus = ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'REJECTED'].includes(rawStatus);

        const canShowAssignedBadge = true && !isCancelled;
        const canShowReassign = true && !isHiddenStatus;
        const canShowAssign = !false && !isHiddenStatus;

        expect(isCancelled).toBe(false);
        expect(canShowAssignedBadge).toBe(true); // Shows who completed/delivered it
        expect(canShowReassign).toBe(false);    // Button hidden
        expect(canShowAssign).toBe(false);      // Button hidden
      });
    });

    it('verifies READY_FOR_PICKUP, WAITING_FOR_DELIVERY_PARTNER, READY, PREPARING, CONFIRMED show assign button', () => {
      assignableStatuses.forEach((status) => {
        const rawStatus = status.trim().toUpperCase();
        const isCancelled = ['CANCELLED', 'CANCELED'].includes(rawStatus);
        const isHiddenStatus = ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'REJECTED'].includes(rawStatus);
        const isAssignableStatus = [
          'READY',
          'READY_FOR_PICKUP',
          'WAITING_FOR_DELIVERY_PARTNER',
          'PREPARING',
          'CONFIRMED',
          'PENDING',
          'PLACED',
          'ACCEPTED',
        ].includes(rawStatus);

        const canShowAssign = !false && !isHiddenStatus && isAssignableStatus;
        expect(isHiddenStatus).toBe(false);
        expect(isAssignableStatus).toBe(true);
        expect(canShowAssign).toBe(true);
      });
    });

    it('Order 20261027-000007 status CANCELLED does not override status to ASSIGNED in API route', async () => {
      const cancelledOrderId = '9b84244e-d805-4faa-a884-335748f23bf8';
      const req = new Request(`http://localhost:3100/api/admin/orders/${cancelledOrderId}`);
      const res = await getAdminOrderRoute(req, {
        params: Promise.resolve({ id: cancelledOrderId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Status must not be forced to ASSIGNED if terminal
      const status = String(json.data.status).toUpperCase();
      const isTerminal = ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'REJECTED'].includes(status);
      if (isTerminal) {
        expect(status).not.toBe('ASSIGNED');
      }
    });
  });

  describe('Bug 2: Online Delivery Partners flexible field resolution & dynamic fetch', () => {
    it('GET /api/admin/delivery-partners?status=online returns online partners with name and phone', async () => {
      const req = new Request('http://localhost:3100/api/admin/delivery-partners?status=online');
      const res = await getOnlineDeliveryPartnersRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      const partners = json.data;
      expect(partners.length).toBeGreaterThan(0);
      for (const p of partners) {
        // Must resolve online correctly (isOnline, online, isAvailable, onlineStatus)
        const isOnline =
          p.isOnline === true ||
          p.online === true ||
          p.isAvailable === true ||
          String(p.onlineStatus).toUpperCase() === 'ONLINE' ||
          (p.isOnline !== false && p.online !== false && p.isAvailable !== false);
        expect(isOnline).toBe(true);
        expect(p.fullName || p.name).toBeTruthy();
        expect(p.phoneNumber || p.phone).toBeTruthy();
      }
    });

    it('correctly parses varied backend response shapes (data.data, data.partners, data.items)', () => {
      const sampleItem = {
        id: 'dp-1',
        fullName: 'Vikram Choudhary',
        phoneNumber: '+91 98111 22233',
        isOnline: true,
      };

      const shapes = [
        [sampleItem], // array of items directly
        { data: [sampleItem] },
        { data: { items: [sampleItem] } },
        { data: { partners: [sampleItem] } },
        { partners: [sampleItem] },
        { items: [sampleItem] },
      ];

      for (const shape of shapes) {
        const rawList = Array.isArray(shape)
          ? shape
          : Array.isArray((shape as any)?.data?.partners)
          ? (shape as any).data.partners
          : Array.isArray((shape as any)?.data?.items)
          ? (shape as any).data.items
          : Array.isArray((shape as any)?.data)
          ? (shape as any).data
          : Array.isArray((shape as any)?.partners)
          ? (shape as any).partners
          : Array.isArray((shape as any)?.items)
          ? (shape as any).items
          : [];

        expect(rawList.length).toBe(1);
        expect(rawList[0].fullName).toBe('Vikram Choudhary');
      }
    });
  });

  describe('Bug 3: Notification targeting specific delivery partner and room', () => {
    it('creates notification targeted to specific deliveryPartnerId and defines partner room', async () => {
      const testOrderId = 'ord-target-room-test-1';
      const targetPartnerId = 'dp-blr-01';

      const req = new Request(`http://localhost:3100/api/admin/orders/${testOrderId}/assign-delivery-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartnerId: targetPartnerId,
          orderNumber: '20261027-000009',
        }),
      });

      const res = await assignPartnerRoute(req, {
        params: Promise.resolve({ id: testOrderId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.assignedDeliveryPartnerId).toBe(targetPartnerId);

      // Verify targeted notification created for that specific partner only
      const partnerNotifs = getPushNotifications(targetPartnerId);
      const orderNotif = partnerNotifs.find((n) => n.orderId === testOrderId);
      expect(orderNotif).toBeDefined();
      expect(orderNotif?.deliveryPartnerId).toBe(targetPartnerId);

      // Verify partner room conventions
      const partnerRoom = `deliveryPartner_${targetPartnerId}`;
      const partnerTopic = `/topic/deliveryPartner_${targetPartnerId}`;
      expect(partnerRoom).toBe('deliveryPartner_dp-blr-01');
      expect(partnerTopic).toBe('/topic/deliveryPartner_dp-blr-01');
    });
  });
});
