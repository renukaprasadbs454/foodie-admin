import { EnquiryRecord } from '../api/endpoints/supportApi';

describe('Support Desk Dynamic Zone Isolation', () => {
  const sampleTickets: EnquiryRecord[] = [
    {
      id: 'ENQ-CUST-BLR-1',
      category: 'CUSTOMER',
      senderName: 'Ananya Sharma',
      senderEmail: 'ananya@foodie.local',
      senderPhone: '+91 98000 11111',
      subject: 'Order delayed in Indiranagar',
      message: 'My food order has not arrived yet.',
      timestamp: '10 mins ago',
      status: 'OPEN',
      priority: 'HIGH',
      zoneId: 'dz-bangalore',
      zoneName: 'Bangalore Zone',
    },
    {
      id: 'ENQ-REST-BLR-2',
      category: 'RESTAURANT',
      restaurantId: 'rest-blr-1',
      restaurantName: 'Bangalore Biryani Club',
      senderName: 'Bangalore Biryani Club',
      senderEmail: 'bbc@foodie.partner',
      senderPhone: '+91 98000 22222',
      subject: 'Menu update inquiry',
      message: 'Requesting assistance updating dinner menu.',
      timestamp: '25 mins ago',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      zoneId: 'dz-bangalore',
      zoneName: 'Bangalore Zone',
    },
    {
      id: 'ENQ-DELIV-BLR-3',
      category: 'DELIVERY',
      senderName: 'Ramesh Rider',
      senderEmail: 'ramesh@foodie.rider',
      senderPhone: '+91 98000 33333',
      subject: 'Surge incentive question',
      message: 'Surge payment bonus missing for order #8812.',
      timestamp: '1 hour ago',
      status: 'RESOLVED',
      priority: 'HIGH',
      zoneId: 'dz-bangalore',
      zoneName: 'Bangalore Zone',
    },
    {
      id: 'ENQ-CUST-TMK-4',
      category: 'CUSTOMER',
      senderName: 'Priya Tumkur',
      senderEmail: 'priya@foodie.local',
      senderPhone: '+91 98000 44444',
      subject: 'Coupon issue near Kyatsandra',
      message: 'Promo code rejected at checkout.',
      timestamp: '15 mins ago',
      status: 'OPEN',
      priority: 'MEDIUM',
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
    },
    {
      id: 'ENQ-REST-TMK-5',
      category: 'RESTAURANT',
      restaurantId: 'rest-tmk-2',
      restaurantName: 'Hotel Mayura Tumkur',
      senderName: 'Hotel Mayura Tumkur',
      senderEmail: 'mayura@foodie.partner',
      senderPhone: '+91 98000 55555',
      subject: 'Payout settlement query',
      message: 'Weekly settlement cycle statement confirmation.',
      timestamp: '40 mins ago',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
    },
    {
      id: 'ENQ-CUST-HSN-6',
      category: 'CUSTOMER',
      senderName: 'Harish Hassan',
      senderEmail: 'harish@foodie.local',
      senderPhone: '+91 98000 66666',
      subject: 'Delivery issue in Hassan Main Road',
      message: 'Package arrived with damaged seal.',
      timestamp: '5 mins ago',
      status: 'OPEN',
      priority: 'HIGH',
      zoneId: 'dz-hassan',
      zoneName: 'Hassan Zone',
    },
    {
      id: 'ENQ-REST-HSN-7',
      category: 'RESTAURANT',
      restaurantId: 'rest-hsn-1',
      restaurantName: 'Hassan Spice Kitchen',
      senderName: 'Hassan Spice Kitchen',
      senderEmail: 'spice@hassan.foodie',
      senderPhone: '+91 98000 77777',
      subject: 'Onboarding verification',
      message: 'FSSAI document uploaded for Hassan store.',
      timestamp: '30 mins ago',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      zoneId: 'dz-hassan',
      zoneName: 'Hassan Zone',
    },
    {
      id: 'ENQ-DELIV-TPR-8',
      category: 'DELIVERY',
      senderName: 'Thimmaiah Rider Tiptur',
      senderEmail: 'thimmaiah@tiptur.rider',
      senderPhone: '+91 98000 88888',
      subject: 'Rider app GPS question in Tiptur',
      message: 'Zone boundary signal issue in Tiptur market.',
      timestamp: '12 mins ago',
      status: 'OPEN',
      priority: 'HIGH',
      zoneId: 'dz-tiptur',
      zoneName: 'Tiptur Zone',
    },
    {
      id: 'ENQ-CUST-TPR-9',
      category: 'CUSTOMER',
      senderName: 'Lakshmi Tiptur',
      senderEmail: 'lakshmi@tiptur.customer',
      senderPhone: '+91 98000 99999',
      subject: 'Coconut shake order refund',
      message: 'Need refund for cancelled beverage.',
      timestamp: '2 hours ago',
      status: 'RESOLVED',
      priority: 'LOW',
      zoneId: 'dz-tiptur',
      zoneName: 'Tiptur Zone',
    },
  ];

  function filterForAdmin(tickets: EnquiryRecord[], role: string, assignedZoneId: string | null) {
    if (role === 'SUPER_ADMIN' || !assignedZoneId || assignedZoneId === 'ALL') {
      return tickets;
    }
    const tzClean = assignedZoneId.replace(/^dz-/, '').toLowerCase();
    return tickets.filter((t) => {
      if (!t.zoneId) return false;
      const tClean = t.zoneId.replace(/^dz-/, '').toLowerCase();
      return tClean === tzClean || t.zoneId.toLowerCase() === assignedZoneId.toLowerCase();
    });
  }

  it('allows Super Admin full Global View across ALL zones', () => {
    const superAdminView = filterForAdmin(sampleTickets, 'SUPER_ADMIN', null);
    expect(superAdminView).toHaveLength(9);

    const zones = new Set(superAdminView.map((t) => t.zoneId));
    expect(zones).toContain('dz-bangalore');
    expect(zones).toContain('dz-tumkur');
    expect(zones).toContain('dz-hassan');
    expect(zones).toContain('dz-tiptur');

    // Counts across all zones
    const openCount = superAdminView.filter((t) => t.status === 'OPEN').length;
    const customerCount = superAdminView.filter((t) => t.category === 'CUSTOMER').length;
    const restaurantCount = superAdminView.filter((t) => t.category === 'RESTAURANT').length;
    const deliveryCount = superAdminView.filter((t) => t.category === 'DELIVERY').length;

    expect(openCount).toBe(4);
    expect(customerCount).toBe(4);
    expect(restaurantCount).toBe(3);
    expect(deliveryCount).toBe(2);
  });

  it('restricts Hassan Zone Admin strictly to Hassan messages', () => {
    const hassanView = filterForAdmin(sampleTickets, 'OPS', 'dz-hassan');
    expect(hassanView).toHaveLength(2);
    expect(hassanView.every((t) => t.zoneId === 'dz-hassan')).toBe(true);

    const ticketIds = hassanView.map((t) => t.id);
    expect(ticketIds).toContain('ENQ-CUST-HSN-6');
    expect(ticketIds).toContain('ENQ-REST-HSN-7');
    expect(ticketIds).not.toContain('ENQ-CUST-BLR-1');
    expect(ticketIds).not.toContain('ENQ-CUST-TMK-4');
    expect(ticketIds).not.toContain('ENQ-DELIV-TPR-8');
  });

  it('restricts Tiptur Zone Admin strictly to Tiptur messages', () => {
    const tipturView = filterForAdmin(sampleTickets, 'OPS', 'dz-tiptur');
    expect(tipturView).toHaveLength(2);
    expect(tipturView.every((t) => t.zoneId === 'dz-tiptur')).toBe(true);

    const ticketIds = tipturView.map((t) => t.id);
    expect(ticketIds).toContain('ENQ-DELIV-TPR-8');
    expect(ticketIds).toContain('ENQ-CUST-TPR-9');
    expect(ticketIds).not.toContain('ENQ-CUST-HSN-6');
    expect(ticketIds).not.toContain('ENQ-CUST-BLR-1');
  });

  it('restricts Bangalore Zone Admin strictly to Bangalore messages', () => {
    const bangaloreView = filterForAdmin(sampleTickets, 'OPS', 'dz-bangalore');
    expect(bangaloreView).toHaveLength(3);
    expect(bangaloreView.every((t) => t.zoneId === 'dz-bangalore')).toBe(true);

    const categories = bangaloreView.map((t) => t.category);
    expect(categories).toContain('CUSTOMER');
    expect(categories).toContain('RESTAURANT');
    expect(categories).toContain('DELIVERY');
  });

  it('restricts Tumkur Zone Admin strictly to Tumkur messages', () => {
    const tumkurView = filterForAdmin(sampleTickets, 'OPS', 'dz-tumkur');
    expect(tumkurView).toHaveLength(2);
    expect(tumkurView.every((t) => t.zoneId === 'dz-tumkur')).toBe(true);
  });

  it('works dynamically for any arbitrary newly created zone without hardcoded strings', () => {
    const newZoneTicket: EnquiryRecord = {
      id: 'ENQ-MYS-1',
      category: 'CUSTOMER',
      senderName: 'Mysore Customer',
      senderEmail: 'mysore@customer.org',
      senderPhone: '+91 98000 00099',
      subject: 'Delivery question in Mysore Heritage',
      message: 'Palace delivery timing query',
      timestamp: 'Just now',
      status: 'OPEN',
      priority: 'MEDIUM',
      zoneId: 'dz-mysore',
      zoneName: 'Mysore Zone',
    };

    const combined = [...sampleTickets, newZoneTicket];
    const mysoreView = filterForAdmin(combined, 'OPS', 'dz-mysore');
    expect(mysoreView).toHaveLength(1);
    expect(mysoreView[0].id).toBe('ENQ-MYS-1');
    expect(mysoreView[0].zoneId).toBe('dz-mysore');

    // Super Admin sees the new zone as well
    const superAdminView = filterForAdmin(combined, 'SUPER_ADMIN', null);
    expect(superAdminView).toHaveLength(10);
  });
});
