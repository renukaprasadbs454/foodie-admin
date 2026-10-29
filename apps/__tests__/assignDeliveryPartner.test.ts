import {
  getOnlineDeliveryPartners,
  assignDeliveryPartnerToOrder,
  getOrderAssignment,
  getAssignedOrdersForPartner,
  getPushNotifications,
} from '../lib/deliveryAssignmentStore';

describe('Admin Panel — Assign Delivery Partner Feature', () => {
  const testOrderId = 'ord-test-assignment-999';
  const testOrderNumber = 'ORD-9999';

  it('fetches list of delivery partners who are currently online with name and phone', async () => {
    const partners = await getOnlineDeliveryPartners();
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.length).toBeGreaterThan(0);

    const first = partners[0];
    expect(first.id).toBeDefined();
    expect(first.fullName).toBeDefined();
    expect(first.phoneNumber).toBeDefined();
    expect(first.isOnline).toBe(true);
  });

  it('assigns a delivery partner to an order and updates status to ASSIGNED', async () => {
    const partners = await getOnlineDeliveryPartners();
    const targetPartner = partners[0];

    const result = await assignDeliveryPartnerToOrder(testOrderId, targetPartner.id, null, {
      orderNumber: testOrderNumber,
      customerAddress: 'MG Road, Bangalore',
      restaurantAddress: 'Indiranagar, Bangalore',
    });

    expect(result.orderId).toBe(testOrderId);
    expect(result.deliveryPartnerId).toBe(targetPartner.id);
    expect(result.deliveryPartnerName).toBe(targetPartner.fullName);
    expect(result.status).toBe('ASSIGNED');

    // Check store retrieval
    const retrieved = getOrderAssignment(testOrderId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.deliveryPartnerName).toBe(targetPartner.fullName);
    expect(retrieved?.status).toBe('ASSIGNED');
  });

  it('syncs assigned orders for specific Delivery Partner app fetch', () => {
    const partners = [
      { id: 'dp-blr-01', name: 'Suresh Kumar' },
    ];
    const assigned = getAssignedOrdersForPartner('dp-blr-01', 'ASSIGNED');
    expect(Array.isArray(assigned)).toBe(true);
    const hasOrder = assigned.some((o) => o.orderId === testOrderId);
    expect(hasOrder).toBe(true);
  });

  it('creates push notification for assigned delivery partner', () => {
    const notifs = getPushNotifications('dp-blr-01');
    expect(Array.isArray(notifs)).toBe(true);
    const orderNotif = notifs.find((n) => n.orderId === testOrderId);
    expect(orderNotif).toBeDefined();
    expect(orderNotif?.body).toContain(`New Order Assigned - Order #${testOrderNumber}`);
  });
});

