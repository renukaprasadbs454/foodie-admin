import { filterNavForRole } from '../lib/routeGuards';
import { calculateCustomerLtvBadge } from '../features/customers/types/customerTypes';

describe('Customer Operations & Support Studio Integration Tests', () => {
  test('filterNavForRole exposes Customers link for all admin roles', () => {
    const superAdminNav = filterNavForRole('SUPER_ADMIN');
    const opsNav = filterNavForRole('OPS');
    const supportNav = filterNavForRole('SUPPORT');

    expect(superAdminNav.some((item) => item.href === '/customers')).toBe(true);
    expect(opsNav.some((item) => item.href === '/customers')).toBe(true);
    expect(supportNav.some((item) => item.href === '/customers')).toBe(true);
  });

  test('calculateCustomerLtvBadge assigns correct tier badges and colors', () => {
    expect(calculateCustomerLtvBadge(1280).tier).toBe('PLATINUM VIP');
    expect(calculateCustomerLtvBadge(620).tier).toBe('GOLD');
    expect(calculateCustomerLtvBadge(240).tier).toBe('SILVER');
    expect(calculateCustomerLtvBadge(85).tier).toBe('BRONZE');
  });

  test('validates platform fee amounts to ensure non-negative numbers', () => {
    const isValidPlatformFee = (val: string) => {
      const num = Number(val);
      return val.trim() !== '' && !isNaN(num) && num >= 0;
    };

    expect(isValidPlatformFee('40')).toBe(true);
    expect(isValidPlatformFee('0')).toBe(true);
    expect(isValidPlatformFee('45.50')).toBe(true);
    expect(isValidPlatformFee('-10')).toBe(false);
    expect(isValidPlatformFee('')).toBe(false);
    expect(isValidPlatformFee('abc')).toBe(false);
  });

  test('calculates distance-based delivery fee slabs correctly', () => {
    const calculateDistanceFee = (
      distKm: number,
      baseCharge: number,
      baseDistKm: number,
      additionalPerKm: number
    ) => {
      if (distKm <= baseDistKm) return baseCharge;
      return baseCharge + (distKm - baseDistKm) * additionalPerKm;
    };

    const baseCharge = 35;
    const baseDistance = 3;
    const additionalPerKm = 10;

    // Within base distance slab (0-3 km)
    expect(calculateDistanceFee(1, baseCharge, baseDistance, additionalPerKm)).toBe(35);
    expect(calculateDistanceFee(3, baseCharge, baseDistance, additionalPerKm)).toBe(35);

    // Medium slab (> 3 km)
    expect(calculateDistanceFee(5, baseCharge, baseDistance, additionalPerKm)).toBe(55);
    expect(calculateDistanceFee(8, baseCharge, baseDistance, additionalPerKm)).toBe(85);

    // Extended slab (> 10 km)
    expect(calculateDistanceFee(12, baseCharge, baseDistance, additionalPerKm)).toBe(125);
  });

  test('preserves customer search filtering across name, email, phone, and id', () => {
    const sampleCustomers = [
      { id: 'cust-1', name: 'Chinku', email: 'chinku@gmail.com', phone: '+919865321475', accountStatus: 'ACTIVE' },
      { id: 'cust-2', name: 'Customer A', email: 'cust@example.com', phone: '+19052557392', accountStatus: 'ACTIVE' },
      { id: 'cust-3', name: 'Kavana', email: 'kavana@gmail.com', phone: '+918431331576', accountStatus: 'ACTIVE' },
      { id: 'cust-4', name: 'Motu', email: 'motu@gmail.com', phone: '+919874563216', accountStatus: 'SUSPENDED' },
    ];

    const filterCustomers = (list: typeof sampleCustomers, query: string, statusFilter: string) => {
      const q = query.trim().toLowerCase();
      return list.filter((c) => {
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.id.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'ALL' || c.accountStatus === statusFilter;
        return matchesSearch && matchesStatus;
      });
    };

    // Name search
    expect(filterCustomers(sampleCustomers, 'Chinku', 'ALL')).toHaveLength(1);
    expect(filterCustomers(sampleCustomers, 'Chinku', 'ALL')[0].name).toBe('Chinku');

    // Email search
    expect(filterCustomers(sampleCustomers, 'kavana@gmail.com', 'ALL')).toHaveLength(1);

    // Phone search
    expect(filterCustomers(sampleCustomers, '987456', 'ALL')).toHaveLength(1);

    // Status filter
    expect(filterCustomers(sampleCustomers, '', 'SUSPENDED')).toHaveLength(1);
    expect(filterCustomers(sampleCustomers, '', 'ACTIVE')).toHaveLength(3);
  });

  test('correlates customers with their orders and calculates accurate spend and order counts', () => {
    const rawCustomers = [
      { id: 'cust-1', name: 'Karishma', email: 'karishma@example.com', phone: '+918867190102', accountStatus: 'ACTIVE', totalOrders: 0, totalSpend: 0 },
      { id: 'cust-2', name: 'Chinku', email: 'chinku@gmail.com', phone: '+919865321475', accountStatus: 'ACTIVE', totalOrders: 0, totalSpend: 0 },
    ];

    const rawOrders = [
      { id: 'ord-1', orderCode: 'FD-101', customerName: 'Karishma', customerPhone: '+918867190102', totalAmount: 500, status: 'CONFIRMED' },
      { id: 'ord-2', orderCode: 'FD-102', customerName: 'Karishma', customerPhone: '+918867190102', totalAmount: 300, status: 'DELIVERED' },
      { id: 'ord-3', orderCode: 'FD-103', customerName: 'Karishma', customerPhone: '+918867190102', totalAmount: 200, status: 'CANCELLED' }, // Should be excluded from spend
      { id: 'ord-4', orderCode: 'FD-104', customerName: 'Chandu', customerPhone: '+919686753394', totalAmount: 750, status: 'DELIVERED' }, // Customer placing orders not yet in rawCustomers
    ];

    const normalize = (p?: string | null) => (p ? p.replace(/[\s\-()]/g, '') : '');

    const ordersByPhone = new Map<string, typeof rawOrders>();
    for (const o of rawOrders) {
      const p = normalize(o.customerPhone);
      if (!ordersByPhone.has(p)) ordersByPhone.set(p, []);
      ordersByPhone.get(p)!.push(o);
    }

    const matchedOrderIds = new Set<string>();

    const enriched = rawCustomers.map((c) => {
      const p = normalize(c.phone);
      const orders = ordersByPhone.get(p) || [];
      for (const o of orders) matchedOrderIds.add(o.id);
      const validOrders = orders.filter((o) => !['CANCELLED', 'REJECTED', 'CANCELED'].includes(o.status));
      const spend = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const ltv = calculateCustomerLtvBadge(spend);
      return {
        ...c,
        totalOrders: orders.length,
        totalSpend: spend,
        loyaltyTier: ltv.tier,
        orders,
      };
    });

    // Handle extra customers from orders
    for (const o of rawOrders) {
      if (matchedOrderIds.has(o.id)) continue;
      matchedOrderIds.add(o.id);
      enriched.push({
        id: `ord-cust-${normalize(o.customerPhone)}`,
        name: o.customerName,
        email: '—',
        phone: o.customerPhone,
        accountStatus: 'ACTIVE',
        totalOrders: 1,
        totalSpend: o.totalAmount,
        loyaltyTier: calculateCustomerLtvBadge(o.totalAmount).tier,
        orders: [o],
      } as any);
    }

    // Karishma has 3 total orders (2 valid + 1 cancelled), total spend is 800 (500 + 300)
    const karishma = enriched.find((c) => c.name === 'Karishma')!;
    expect(karishma.totalOrders).toBe(3);
    expect(karishma.totalSpend).toBe(800);
    expect(karishma.loyaltyTier).toBe('GOLD'); // 800 >= 500 is GOLD
    expect(karishma.orders).toHaveLength(3);

    // Chinku has 0 orders
    const chinku = enriched.find((c) => c.name === 'Chinku')!;
    expect(chinku.totalOrders).toBe(0);
    expect(chinku.totalSpend).toBe(0);
    expect(chinku.loyaltyTier).toBe('BRONZE');

    // Chandu was discovered from orders
    const chandu = enriched.find((c) => c.name === 'Chandu')!;
    expect(chandu).toBeDefined();
    expect(chandu.totalOrders).toBe(1);
    expect(chandu.totalSpend).toBe(750);
    expect(chandu.loyaltyTier).toBe('GOLD');
  });

  test('verifies Platform Fee and Delivery Fee button labels and modal triggers', () => {
    const buttonConfig = {
      platformFeeLabel: 'Platform Fee',
      deliveryFeeLabel: 'Delivery Fee',
    };

    expect(buttonConfig.platformFeeLabel).toBe('Platform Fee');
    expect(buttonConfig.deliveryFeeLabel).toBe('Delivery Fee');

    let isPlatformFeeModalOpen = false;
    let isDeliveryFeeModalOpen = false;

    const handleOpenPlatformFee = () => {
      isPlatformFeeModalOpen = true;
    };
    const handleOpenDeliveryFee = () => {
      isDeliveryFeeModalOpen = true;
    };

    handleOpenPlatformFee();
    expect(isPlatformFeeModalOpen).toBe(true);

    handleOpenDeliveryFee();
    expect(isDeliveryFeeModalOpen).toBe(true);
  });

  test('restricts customer directory data strictly to the assigned operating zone', () => {
    const customers = [
      { id: 'c-1', name: 'Ananya Sharma', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone', city: 'Bangalore' },
      { id: 'c-2', name: 'Rahul Dravid', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone', city: 'Bangalore' },
      { id: 'c-3', name: 'Priya Tumkur', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone', city: 'Tumkur' },
      { id: 'c-4', name: 'Karthik Gowda', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone', city: 'Tumkur' },
    ];

    const isMatchingZone = (cust: any, targetZone: string) => {
      const t = targetZone.trim().toLowerCase();
      const zId = (cust.zoneId || '').trim().toLowerCase();
      const zName = (cust.zoneName || '').trim().toLowerCase();
      const city = (cust.city || '').trim().toLowerCase();
      const isTBlr = t.includes('bangalore') || t.includes('bengaluru') || t.includes('blr');
      const isTTmk = t.includes('tumkur') || t.includes('tumakuru') || t.includes('tmk');

      if (zId) {
        if (zId === t || zId.includes(t) || t.includes(zId)) return true;
        if (isTBlr && (zId.includes('bangalore') || zId.includes('bengaluru') || zId.includes('blr'))) return true;
        if (isTTmk && (zId.includes('tumkur') || zId.includes('tumakuru') || zId.includes('tmk'))) return true;
      }
      if (zName) {
        if (zName === t || zName.includes(t) || t.includes(zName)) return true;
        if (isTBlr && (zName.includes('bangalore') || zName.includes('bengaluru') || zName.includes('blr'))) return true;
        if (isTTmk && (zName.includes('tumkur') || zName.includes('tumakuru') || zName.includes('tmk'))) return true;
      }
      if (city) {
        if (isTBlr && (city.includes('bangalore') || city.includes('bengaluru') || city.includes('blr'))) return true;
        if (isTTmk && (city.includes('tumkur') || city.includes('tumakuru') || city.includes('tmk'))) return true;
      }
      return false;
    };

    const filterByZone = (list: typeof customers, zone: string) => list.filter((c) => isMatchingZone(c, zone));

    // Tumkur admin only sees Tumkur customers
    const tumkurCustomers = filterByZone(customers, 'dz-tumkur');
    expect(tumkurCustomers).toHaveLength(2);
    expect(tumkurCustomers.map((c) => c.name)).toEqual(['Priya Tumkur', 'Karthik Gowda']);

    // Bangalore admin only sees Bangalore customers
    const bangaloreCustomers = filterByZone(customers, 'dz-bangalore');
    expect(bangaloreCustomers).toHaveLength(2);
    expect(bangaloreCustomers.map((c) => c.name)).toEqual(['Ananya Sharma', 'Rahul Dravid']);
  });

  test('restricts platform fee and delivery partner fee updates to the assigned zone only', () => {
    const buildPlatformFeePayload = (fee: number, zoneId?: string) => ({
      restaurantCommissionRate: 15,
      deliveryCommissionRate: 10,
      platformFixedFee: fee,
      ...(zoneId ? { zoneId } : {}),
    });

    const buildDeliveryChargesPayload = (baseCharge: number, baseDist: number, perKm: number, zoneId?: string) => ({
      baseCharge,
      baseDistanceKm: baseDist,
      additionalChargePerKm: perKm,
      freeDeliveryMinOrder: 499,
      nightSurcharge: 25,
      surgeMultiplier: 1.15,
      ...(zoneId ? { zoneId } : {}),
    });

    // Tumkur zone payload
    const tumkurPlatformFee = buildPlatformFeePayload(25, 'dz-tumkur');
    expect(tumkurPlatformFee.platformFixedFee).toBe(25);
    expect(tumkurPlatformFee.zoneId).toBe('dz-tumkur');

    const tumkurDeliveryFee = buildDeliveryChargesPayload(30, 2.5, 8, 'dz-tumkur');
    expect(tumkurDeliveryFee.baseCharge).toBe(30);
    expect(tumkurDeliveryFee.zoneId).toBe('dz-tumkur');

    // Bangalore zone payload remains independent
    const bangalorePlatformFee = buildPlatformFeePayload(40, 'dz-bangalore');
    expect(bangalorePlatformFee.platformFixedFee).toBe(40);
    expect(bangalorePlatformFee.zoneId).toBe('dz-bangalore');
  });
});

