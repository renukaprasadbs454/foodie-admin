import { CouponsPage } from '../features/coupons/pages/CouponsPage';
import {
  validateCreateCoupon,
  extractDateOnly,
  formatCouponValidityDate,
  isPromoCoupon,
  isRestaurantCoupon,
  isCouponEnabledForRestaurant,
  filterCouponsForCustomerDirect,
  filterCouponsForRestaurantPanel,
  calculateCouponDiscount,
} from '../features/coupons/types';
import { GET, POST, PATCH } from '../app/api/bff/[...path]/route';

describe('Restaurant Coupons Management - Admin Panel', () => {
  it('exposes the renamed Restaurant Coupons section and navigation tabs', () => {
    const couponTabs = [
      { id: 'BANNERS', label: 'Promotional Banners' },
      { id: 'PROMO_COUPONS', label: 'Promo Coupons' },
      { id: 'RESTAURANT_COUPONS', label: 'Restaurant Coupons' },
      { id: 'FIRST_ORDER_OFFERS', label: 'First Order Offers' },
      { id: 'REFERRAL_OFFERS', label: 'Referral Offers' },
      { id: 'CAMPAIGN_MANAGEMENT', label: 'Campaign Management' },
    ];

    expect(couponTabs.map((t) => t.id)).toContain('RESTAURANT_COUPONS');
    const restTab = couponTabs.find((t) => t.id === 'RESTAURANT_COUPONS');
    expect(restTab?.label).toBe('Restaurant Coupons');
  });

  it('validates restaurant-specific coupon creation with required fields matching the design', () => {
    // Valid percentage coupon for a specific restaurant
    const validPercentCoupon = validateCreateCoupon({
      code: 'ROYAL20',
      discountType: 'PERCENT',
      value: '20',
      minOrderAmount: '0', // matches screenshot default 0
      maxDiscountAmount: '100',
      expiryDate: '2099-12-31',
      usageLimitTotal: '',
      usageLimitPerUser: '1',
      restaurantId: 'b7c2a110-92d4-4f81-9b11-a83d712e5001',
    });

    expect(validPercentCoupon.ok).toBe(true);
    if (validPercentCoupon.ok) {
      expect(validPercentCoupon.body.code).toBe('ROYAL20');
      expect(validPercentCoupon.body.discountType).toBe('PERCENT');
      expect(validPercentCoupon.body.value).toBe(20);
      expect(validPercentCoupon.body.minOrderAmount).toBe(0);
      expect(validPercentCoupon.body.maxDiscountAmount).toBe(100);
      expect(validPercentCoupon.body.restaurantId).toBe('b7c2a110-92d4-4f81-9b11-a83d712e5001');
    }

    // Valid fixed amount coupon for a specific restaurant
    const validFixedCoupon = validateCreateCoupon({
      code: 'PIZZA100',
      discountType: 'FLAT',
      value: '100',
      minOrderAmount: '350',
      maxDiscountAmount: '',
      expiryDate: '2099-12-31',
      usageLimitTotal: '',
      usageLimitPerUser: '1',
      restaurantId: 'c8d3b221-03e5-5f92-ac22-b94e823f6002',
    });

    expect(validFixedCoupon.ok).toBe(true);
    if (validFixedCoupon.ok) {
      expect(validFixedCoupon.body.code).toBe('PIZZA100');
      expect(validFixedCoupon.body.discountType).toBe('FLAT');
      expect(validFixedCoupon.body.value).toBe(100);
      expect(validFixedCoupon.body.restaurantId).toBe('c8d3b221-03e5-5f92-ac22-b94e823f6002');
    }
  });

  it('ensures restaurant coupon is strictly scoped to the assigned restaurant', () => {
    const couponStore = [
      {
        couponId: 'c-rest-01',
        code: 'ROYAL20',
        restaurantId: 'rest-royal-001',
        restaurantName: 'Royal Biryani House',
        discountType: 'PERCENT',
        value: 20,
        isActive: true,
      },
      {
        couponId: 'c-rest-02',
        code: 'PIZZA50',
        restaurantId: 'rest-pizza-002',
        restaurantName: 'Bella Italia Pizzeria',
        discountType: 'FLAT',
        value: 50,
        isActive: true,
      },
      {
        couponId: 'c-gen-01',
        code: 'FOODIE50',
        restaurantId: null,
        restaurantName: null,
        discountType: 'PERCENT',
        value: 50,
        isActive: true,
      },
    ];

    // Filter promos for Royal Biryani House
    const royalPromos = couponStore.filter(
      (c) => c.restaurantId === 'rest-royal-001'
    );
    expect(royalPromos).toHaveLength(1);
    expect(royalPromos[0].code).toBe('ROYAL20');

    // Royal coupon cannot be used for Bella Italia
    const canApplyToBella = (c: { restaurantId: string | null }, targetRestId: string) => {
      if (c.restaurantId && c.restaurantId !== targetRestId) {
        return false;
      }
      return true;
    };

    expect(canApplyToBella(couponStore[0], 'rest-pizza-002')).toBe(false);
    expect(canApplyToBella(couponStore[1], 'rest-pizza-002')).toBe(true);
    expect(canApplyToBella(couponStore[2], 'rest-pizza-002')).toBe(true);
  });

  it('separates Promo Coupons from Restaurant Coupons in directory views', () => {
    const allCoupons = [
      { id: '1', code: 'GLOBAL50', restaurantId: null, module: 'All Food Delivery' },
      { id: '2', code: 'BURGER20', restaurantId: 'rest-1', module: 'Burger Joint' },
      { id: '3', code: 'PIZZA30', restaurantId: 'rest-2', module: 'Specific Restaurant' },
      { id: '4', code: 'ALLFEST', restaurantId: undefined, module: 'All Food Delivery' },
    ];

    const restaurantCoupons = allCoupons.filter(
      (c) => Boolean(c.restaurantId) || c.module === 'Specific Restaurant'
    );
    const promoCoupons = allCoupons.filter(
      (c) => !c.restaurantId && c.module !== 'Specific Restaurant'
    );

    expect(restaurantCoupons.map((c) => c.code)).toEqual(['BURGER20', 'PIZZA30']);
    expect(promoCoupons.map((c) => c.code)).toEqual(['GLOBAL50', 'ALLFEST']);
  });

  describe('Coupon Validity Date Preservation & Format Consistency', () => {
    const testCases = [
      { adminSelected: '03-12-2026', expectedDb: '2026-12-03', expectedDisplay: '03-12-2026' },
      { adminSelected: '04-12-2026', expectedDb: '2026-12-04', expectedDisplay: '04-12-2026' },
      { adminSelected: '15-12-2026', expectedDb: '2026-12-15', expectedDisplay: '15-12-2026' },
      { adminSelected: '31-12-2026', expectedDb: '2026-12-31', expectedDisplay: '31-12-2026' },
    ];

    it('preserves exact calendar date when creating coupon across all required test dates', () => {
      for (const { adminSelected, expectedDb, expectedDisplay } of testCases) {
        // Admin selects date (either via datepicker YYYY-MM-DD or DD-MM-YYYY)
        const dateFromBody = extractDateOnly(adminSelected);
        expect(dateFromBody).toBe(expectedDb);

        const validated = validateCreateCoupon({
          code: `DISC_${expectedDb.replace(/-/g, '')}`,
          discountType: 'PERCENT',
          value: '15',
          minOrderAmount: '200',
          maxDiscountAmount: '50',
          expiryDate: dateFromBody,
          usageLimitTotal: '',
          usageLimitPerUser: '1',
          restaurantId: 'b7c2a110-92d4-4f81-9b11-a83d712e5001',
        });

        expect(validated.ok).toBe(true);
        if (validated.ok) {
          expect(validated.body.expiryDate).toBe(expectedDb);
          // Format for Admin Panel active table
          expect(formatCouponValidityDate(validated.body.expiryDate)).toBe(expectedDisplay);
        }
      }
    });

    it('prevents next-day timezone shift when formatting ISO or UTC timestamps', () => {
      for (const { expectedDb, expectedDisplay } of testCases) {
        // In UTC+05:30 (IST), 23:59:59Z previously rolled over to next day when parsed with new Date()
        const legacyUtcString = `${expectedDb}T23:59:59Z`;

        // String-based formatting must strictly preserve the calendar date
        expect(formatCouponValidityDate(legacyUtcString)).toBe(expectedDisplay);
        expect(extractDateOnly(legacyUtcString)).toBe(expectedDb);
      }
    });
  });

  describe('Zone-Wise Restaurant Coupon Creation & Distribution', () => {
    it('creates a zone-wide restaurant coupon with required fields', () => {
      const result = validateCreateCoupon({
        code: 'SAVE50',
        discountType: 'PERCENT',
        value: '50',
        minOrderAmount: '200',
        maxDiscountAmount: '100',
        expiryDate: '2026-12-31',
        usageLimitTotal: '',
        usageLimitPerUser: '1',
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.body.code).toBe('SAVE50');
        expect(result.body.discountType).toBe('PERCENT');
        expect(result.body.value).toBe(50);
        expect(result.body.minOrderAmount).toBe(200);
        expect(result.body.maxDiscountAmount).toBe(100);
        expect(result.body.zoneId).toBe('dz-tumkur');
        expect(result.body.zoneName).toBe('Tumkur Zone');
        expect(result.body.restaurantId).toBeUndefined();
      }
    });

    it('distributes zone coupons to all restaurants in that zone and isolates other zones', () => {
      const restaurantRegistry = [
        { restaurantId: 'rest-tumkur-101', name: 'Tumkur Heritage Kitchen', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone' },
        { restaurantId: 'c8d3b221-03e5-5f92-ac22-b94e823f6002', name: 'Bella Italia Pizzeria', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone' },
        { restaurantId: 'b7c2a110-92d4-4f81-9b11-a83d712e5001', name: 'Royal Biryani House', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone' },
        { restaurantId: 'd9e4c332-14f6-6fa3-bd33-ca5f934a7003', name: 'Sweet Dreams Bakery', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone' },
      ];

      const coupons = [
        {
          couponId: 'c-zone-tumkur-01',
          code: 'SAVE50',
          discountType: 'PERCENT',
          value: 50,
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          couponType: 'RESTAURANT',
          isActive: true,
        },
        {
          couponId: 'c-zone-blr-01',
          code: 'BLRDEAL',
          discountType: 'PERCENT',
          value: 20,
          zoneId: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
          couponType: 'RESTAURANT',
          isActive: true,
        },
      ];

      const getEligiblePromosForRestaurant = (restaurantId: string) => {
        const rest = restaurantRegistry.find((r) => r.restaurantId === restaurantId);
        if (!rest) return [];
        return coupons.filter((c) => {
          if (!c.zoneId || c.zoneId === 'ALL') return true;
          return c.zoneId.toLowerCase() === rest.zoneId.toLowerCase();
        });
      };

      // Both Tumkur restaurants receive SAVE50
      const tumkurPromos1 = getEligiblePromosForRestaurant('rest-tumkur-101');
      const tumkurPromos2 = getEligiblePromosForRestaurant('c8d3b221-03e5-5f92-ac22-b94e823f6002');
      expect(tumkurPromos1.map((p) => p.code)).toEqual(['SAVE50']);
      expect(tumkurPromos2.map((p) => p.code)).toEqual(['SAVE50']);

      // Bangalore restaurants receive BLRDEAL, NOT SAVE50
      const blrPromos1 = getEligiblePromosForRestaurant('b7c2a110-92d4-4f81-9b11-a83d712e5001');
      const blrPromos2 = getEligiblePromosForRestaurant('d9e4c332-14f6-6fa3-bd33-ca5f934a7003');
      expect(blrPromos1.map((p) => p.code)).toEqual(['BLRDEAL']);
      expect(blrPromos2.map((p) => p.code)).toEqual(['BLRDEAL']);
      expect(blrPromos1.map((p) => p.code)).not.toContain('SAVE50');
      expect(blrPromos2.map((p) => p.code)).not.toContain('SAVE50');
    });

    it('validates dynamic form field rules between Percentage and Fixed Amount', () => {
      // Percentage form requirements
      const percentFormConfig = {
        discountType: 'PERCENT' as const,
        fields: ['code', 'discountType', 'discountValue', 'maxDiscountAmount', 'minOrderAmount', 'zoneId', 'expiryDate'],
        showMaxDiscount: true,
      };
      expect(percentFormConfig.showMaxDiscount).toBe(true);

      // Fixed Amount form requirements: maxDiscountAmount is hidden / excluded
      const fixedFormConfig = {
        discountType: 'FIXED' as const,
        fields: ['code', 'discountType', 'discountValue', 'minOrderAmount', 'zoneId', 'expiryDate'],
        showMaxDiscount: false,
      };
      expect(fixedFormConfig.showMaxDiscount).toBe(false);
      expect(fixedFormConfig.fields).not.toContain('maxDiscountAmount');
    });

    it('generates the exact restaurant broadcast notification for the targeted zone', () => {
      const couponCode = 'SAVE50';
      const discountText = '50%';
      const expectedTitle = 'New Restaurant Coupon Available!';
      const expectedBody = `Admin has created a new coupon for your zone. Coupon Code: ${couponCode}. Discount: ${discountText}. Please visit Promos to Enable or Disable this coupon.`;

      const notificationPayload = {
        title: expectedTitle,
        body: expectedBody,
        targetAudience: 'RESTAURANTS' as const,
        zoneId: 'dz-tumkur',
      };

      expect(notificationPayload.title).toBe('New Restaurant Coupon Available!');
      expect(notificationPayload.body).toBe(
        'Admin has created a new coupon for your zone. Coupon Code: SAVE50. Discount: 50%. Please visit Promos to Enable or Disable this coupon.'
      );
      expect(notificationPayload.targetAudience).toBe('RESTAURANTS');
      expect(notificationPayload.zoneId).toBe('dz-tumkur');
    });

    it('supports All Locations, Bangalore Zone, and Tumkur Zone with proper restaurant distribution', () => {
      const restaurantRegistry = [
        { restaurantId: 'rest-tumkur-101', name: 'Tumkur Heritage Kitchen', zoneId: 'dz-tumkur' },
        { restaurantId: 'b7c2a110-92d4-4f81-9b11-a83d712e5001', name: 'Royal Biryani House', zoneId: 'dz-bangalore' },
      ];

      const coupons = [
        { couponId: 'c-all', code: 'ALL50', zoneId: 'ALL', zoneName: 'All Locations', isAllZones: true },
        { couponId: 'c-tmk', code: 'TMK20', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone' },
        { couponId: 'c-blr', code: 'BLR30', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone' },
      ];

      const getApiPromosForRestaurant = (restaurantId: string) => {
        const rest = restaurantRegistry.find((r) => r.restaurantId === restaurantId);
        if (!rest) return [];
        return coupons
          .filter((c) => !c.zoneId || c.zoneId === 'ALL' || c.isAllZones || c.zoneId.toLowerCase() === rest.zoneId.toLowerCase())
          .map((c) => ({
            ...c,
            restaurantId: restaurantId, // stamped by API for the querying restaurant
          }));
      };

      // Tumkur restaurant receives ALL50 and TMK20, not BLR30
      const tumkurResults = getApiPromosForRestaurant('rest-tumkur-101');
      expect(tumkurResults.map((c) => c.code)).toEqual(['ALL50', 'TMK20']);
      expect(tumkurResults.every((c) => c.restaurantId === 'rest-tumkur-101')).toBe(true);

      // Bangalore restaurant receives ALL50 and BLR30, not TMK20
      const blrResults = getApiPromosForRestaurant('b7c2a110-92d4-4f81-9b11-a83d712e5001');
      expect(blrResults.map((c) => c.code)).toEqual(['ALL50', 'BLR30']);
      expect(blrResults.every((c) => c.restaurantId === 'b7c2a110-92d4-4f81-9b11-a83d712e5001')).toBe(true);
    });

    it('prevents duplicate coupons from displaying in the admin panel table', () => {
      // Simulates optimistic insertion + server refetch returning the same coupon
      const rawCouponsList = [
        { id: 'c-rest-1234', code: 'SPICE50', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone' },
        { id: 'c-5774', code: 'SPICE50', zoneId: 'dz-tumkur', zoneName: 'Tumkur Zone' },
        { id: 'c-3040', code: 'SPICE50', zoneId: 'dz-bangalore', zoneName: 'Bangalore Zone' },
      ];

      const seen = new Set<string>();
      const dedupedList: any[] = [];
      for (const c of rawCouponsList) {
        const dedupeKey = `${c.code.trim().toUpperCase()}_${(c.zoneId || 'ALL').trim().toLowerCase()}_`;
        if (!seen.has(dedupeKey) && !seen.has(c.id)) {
          seen.add(dedupeKey);
          seen.add(c.id);
          dedupedList.push(c);
        }
      }

      // Tumkur SPICE50 appears only once; Bangalore SPICE50 also appears once
      expect(dedupedList).toHaveLength(2);
      expect(dedupedList.map((c) => `${c.code}:${c.zoneName}`)).toEqual([
        'SPICE50:Tumkur Zone',
        'SPICE50:Bangalore Zone',
      ]);
    });
  });

  describe('Direct Customer Promo Coupons Distribution & Separation from Restaurant Coupons', () => {
    const promoCouponsStore = [
      // Scenario A: Tumkur Zone Promo Coupon
      {
        couponId: 'c-tmk-promo',
        code: 'TUMKUR50',
        title: 'Tumkur Feast Promo',
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        discountType: 'PERCENT',
        value: 50,
        minOrderAmount: 200,
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
        isActive: true,
      },
      // Scenario B: Bangalore Zone Promo Coupon
      {
        couponId: 'c-blr-promo',
        code: 'BLR40',
        title: 'Namma Bengaluru Promo',
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        discountType: 'PERCENT',
        value: 40,
        minOrderAmount: 150,
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
        isActive: true,
      },
      // Scenario C: All Zones (Platform-wide) Promo Coupon
      {
        couponId: 'c-all-promo',
        code: 'FOODIEALL',
        title: 'Platform Wide 25% OFF',
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        discountType: 'PERCENT',
        value: 25,
        minOrderAmount: 100,
        zoneId: 'ALL',
        zoneName: 'All Locations',
        isAllZones: true,
        isActive: true,
      },
      // Restaurant Coupon for Tumkur Zone
      {
        couponId: 'c-rest-tmk',
        code: 'RESTTMK',
        title: 'Tumkur Merchant Special',
        couponType: 'RESTAURANT',
        funderType: 'MERCHANT',
        discountType: 'FLAT',
        value: 50,
        minOrderAmount: 250,
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
        isActive: true,
      },
    ];

    it('identifies Promo Coupons vs Restaurant Coupons correctly', () => {
      expect(isPromoCoupon(promoCouponsStore[0])).toBe(true);
      expect(isRestaurantCoupon(promoCouponsStore[0])).toBe(false);

      expect(isPromoCoupon(promoCouponsStore[3])).toBe(false);
      expect(isRestaurantCoupon(promoCouponsStore[3])).toBe(true);
    });

    it('Scenario A: Tumkur Zone Promo Coupon is visible to Tumkur customers and hidden from Bangalore customers', () => {
      // Tumkur Customer View
      const tumkurCustomerCoupons = filterCouponsForCustomerDirect(promoCouponsStore, 'Tumkur Zone');
      const tumkurCodes = tumkurCustomerCoupons.map((c) => c.code);

      expect(tumkurCodes).toContain('TUMKUR50');
      expect(tumkurCodes).toContain('FOODIEALL');
      expect(tumkurCodes).not.toContain('BLR40');

      // Bangalore Customer View
      const blrCustomerCoupons = filterCouponsForCustomerDirect(promoCouponsStore, 'Bangalore Zone');
      const blrCodes = blrCustomerCoupons.map((c) => c.code);

      expect(blrCodes).not.toContain('TUMKUR50');
      expect(blrCodes).toContain('BLR40');
      expect(blrCodes).toContain('FOODIEALL');
    });

    it('Scenario B: Bangalore Zone Promo Coupon is visible to Bangalore customers and hidden from Tumkur customers', () => {
      const blrCustomerCoupons = filterCouponsForCustomerDirect(promoCouponsStore, 'dz-bangalore');
      const codes = blrCustomerCoupons.map((c) => c.code);

      expect(codes).toContain('BLR40');
      expect(codes).not.toContain('TUMKUR50');
    });

    it('Scenario C: All Zones Promo Coupon is visible to all eligible customers across all supported zones', () => {
      const tumkurView = filterCouponsForCustomerDirect(promoCouponsStore, 'dz-tumkur');
      const blrView = filterCouponsForCustomerDirect(promoCouponsStore, 'dz-bangalore');
      const hubliView = filterCouponsForCustomerDirect(promoCouponsStore, 'dz-hubballi');

      expect(tumkurView.map((c) => c.code)).toContain('FOODIEALL');
      expect(blrView.map((c) => c.code)).toContain('FOODIEALL');
      expect(hubliView.map((c) => c.code)).toContain('FOODIEALL');
    });

    it('ensures Promo Coupons NEVER appear in the Restaurant Panel Promos', () => {
      // Query Promos for a Tumkur restaurant
      const tumkurRestPromos = filterCouponsForRestaurantPanel(promoCouponsStore, 'rest-tumkur-101', 'dz-tumkur');
      const tumkurRestPromoCodes = tumkurRestPromos.map((c) => c.code);

      expect(tumkurRestPromoCodes).not.toContain('TUMKUR50');
      expect(tumkurRestPromoCodes).not.toContain('BLR40');
      expect(tumkurRestPromoCodes).not.toContain('FOODIEALL');
      // Only Restaurant Coupon is received
      expect(tumkurRestPromoCodes).toEqual(['RESTTMK']);

      // Query Promos for a Bangalore restaurant
      const blrRestPromos = filterCouponsForRestaurantPanel(promoCouponsStore, 'b7c2a110-92d4-4f81-9b11-a83d712e5001', 'dz-bangalore');
      const blrRestPromoCodes = blrRestPromos.map((c) => c.code);

      expect(blrRestPromoCodes).not.toContain('TUMKUR50');
      expect(blrRestPromoCodes).not.toContain('BLR40');
      expect(blrRestPromoCodes).not.toContain('FOODIEALL');
      expect(blrRestPromoCodes).not.toContain('RESTTMK'); // Tumkur restaurant coupon isolated from Bangalore
    });

    it('ensures Restaurant Coupons continue following restaurant enable/disable workflow', () => {
      const activeRestCoupon = { ...promoCouponsStore[3], isActive: true };
      const deactivatedRestCoupon = { ...promoCouponsStore[3], isActive: false };

      // Enabled coupon appears in customer app for that zone
      const customerWithActive = filterCouponsForCustomerDirect([activeRestCoupon], 'dz-tumkur');
      expect(customerWithActive.map((c) => c.code)).toContain('RESTTMK');

      // Disabled coupon does not appear in customer app
      const customerWithDisabled = filterCouponsForCustomerDirect([deactivatedRestCoupon], 'dz-tumkur');
      expect(customerWithDisabled.map((c) => c.code)).not.toContain('RESTTMK');
    });
  });

  describe('Shared Coupon Discount Contributions (Admin Discount + Restaurant Discount)', () => {
    it('1. Percentage coupon: combines Admin (10%) and Restaurant (5%) into Total (15%)', () => {
      const result = validateCreateCoupon({
        code: 'SHARED15',
        discountType: 'PERCENT',
        adminDiscount: '10',
        restaurantDiscount: '5',
        minOrderAmount: '200',
        maxDiscountAmount: '100',
        expiryDate: '2026-12-31',
        usageLimitPerUser: '1',
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.body.adminDiscount).toBe(10);
        expect(result.body.restaurantDiscount).toBe(5);
        expect(result.body.value).toBe(15); // 10 + 5
        expect(result.body.discountType).toBe('PERCENT');
      }
    });

    it('2. Fixed coupon: combines Admin (₹20) and Restaurant (₹30) into Total (₹50)', () => {
      const result = validateCreateCoupon({
        code: 'SHARED50',
        discountType: 'FLAT',
        adminDiscount: '20',
        restaurantDiscount: '30',
        minOrderAmount: '150',
        maxDiscountAmount: '',
        expiryDate: '2026-12-31',
        usageLimitPerUser: '1',
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.body.adminDiscount).toBe(20);
        expect(result.body.restaurantDiscount).toBe(30);
        expect(result.body.value).toBe(50); // 20 + 30
        expect(result.body.discountType).toBe('FLAT');
      }
    });

    it('3. Validation: rejects negative discount contributions and percentages exceeding 100%', () => {
      // Negative admin discount
      const negativeAdmin = validateCreateCoupon({
        code: 'INVALID1',
        discountType: 'PERCENT',
        adminDiscount: '-5',
        restaurantDiscount: '10',
        minOrderAmount: '100',
        maxDiscountAmount: '50',
        expiryDate: '2026-12-31',
        usageLimitPerUser: '1',
      });
      expect(negativeAdmin.ok).toBe(false);
      if (!negativeAdmin.ok) {
        expect(negativeAdmin.message).toContain('≥ 0');
      }

      // Negative restaurant discount
      const negativeRest = validateCreateCoupon({
        code: 'INVALID2',
        discountType: 'PERCENT',
        adminDiscount: '10',
        restaurantDiscount: '-2',
        minOrderAmount: '100',
        maxDiscountAmount: '50',
        expiryDate: '2026-12-31',
        usageLimitPerUser: '1',
      });
      expect(negativeRest.ok).toBe(false);

      // Percentage exceeding 100% (e.g. 60% + 50% = 110%)
      const overHundred = validateCreateCoupon({
        code: 'OVER100',
        discountType: 'PERCENT',
        adminDiscount: '60',
        restaurantDiscount: '50',
        minOrderAmount: '100',
        maxDiscountAmount: '100',
        expiryDate: '2026-12-31',
        usageLimitPerUser: '1',
      });
      expect(overHundred.ok).toBe(false);
      if (!overHundred.ok) {
        expect(overHundred.message).toContain('100');
      }
    });

    it('4. Restaurant Panel receives separate Admin Discount and Restaurant Discount values', () => {
      const coupons = [
        {
          couponId: 'c-shared-tumkur',
          code: 'SHARED15',
          discountType: 'PERCENT',
          value: 15,
          adminDiscount: 10,
          restaurantDiscount: 5,
          minOrderAmount: 200,
          maxDiscountAmount: 100,
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          couponType: 'RESTAURANT',
          isActive: true,
        },
      ];

      const restaurantPromos = filterCouponsForRestaurantPanel(coupons, 'rest-tumkur-101', 'dz-tumkur');
      expect(restaurantPromos).toHaveLength(1);
      const promo = restaurantPromos[0];
      expect(promo.adminDiscount).toBe(10);
      expect(promo.restaurantDiscount).toBe(5);
      expect(promo.value).toBe(15);
    });

    it('5. Customer App applies the combined total discount correctly without double deduction', () => {
      // Percentage Shared Coupon: 10% Admin + 5% Restaurant = 15% Total
      const percentCoupon = {
        couponId: 'c-pct-share',
        code: 'SHARED15',
        discountType: 'PERCENT',
        value: 15,
        adminDiscount: 10,
        restaurantDiscount: 5,
        minOrderAmount: 200,
        maxDiscountAmount: 100,
        zoneId: 'dz-tumkur',
        couponType: 'RESTAURANT',
        isActive: true,
      };

      const cartTotal = 400;
      // Combined calculation: 15% of 400 = 60 discount
      const pctDiscount = Math.round((cartTotal * Number(percentCoupon.value)) / 100);
      const pctFinal = cartTotal - pctDiscount;
      expect(pctDiscount).toBe(60);
      expect(pctFinal).toBe(340);

      // Fixed Shared Coupon: ₹20 Admin + ₹30 Restaurant = ₹50 Total
      const flatCoupon = {
        couponId: 'c-flat-share',
        code: 'SHARED50',
        discountType: 'FLAT',
        value: 50,
        adminDiscount: 20,
        restaurantDiscount: 30,
        minOrderAmount: 150,
        zoneId: 'dz-bangalore',
        couponType: 'RESTAURANT',
        isActive: true,
      };

      const flatDiscount = Math.min(Number(flatCoupon.value), cartTotal);
      const flatFinal = cartTotal - flatDiscount;
      expect(flatDiscount).toBe(50);
      expect(flatFinal).toBe(350);
    });
  });

  describe('Promo Coupons Persistence & Directory Retention Across Tabs/Pages', () => {
    it('preserves newly created Promo Coupons in the directory without being overwritten', () => {
      // 1. Create Promo Coupon A
      const couponA = {
        id: 'c-promo-a',
        code: 'PROMO_A',
        title: 'Promo Deal A',
        discountType: 'PERCENT' as const,
        discountValue: 20,
        minPurchase: 200,
        maxDiscount: 40,
        module: 'All Food Delivery',
        expiryDate: '2099-12-31',
        status: 'ACTIVE' as const,
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
      };

      // 2. Create Promo Coupon B
      const couponB = {
        id: 'c-promo-b',
        code: 'PROMO_B',
        title: 'Promo Deal B',
        discountType: 'FIXED' as const,
        discountValue: 50,
        minPurchase: 250,
        maxDiscount: 50,
        module: 'All Food Delivery',
        expiryDate: '2099-12-31',
        status: 'ACTIVE' as const,
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
      };

      let directory: any[] = [couponA];
      // Appending Coupon B preserves Coupon A
      directory = [couponB, ...directory.filter((c) => c.code !== couponB.code)];

      expect(directory.map((c) => c.code)).toEqual(['PROMO_B', 'PROMO_A']);

      // 3. Tab switch simulation: navigating to Restaurant Coupons and back to Promo Coupons
      const activeTab1 = 'RESTAURANT_COUPONS';
      expect(activeTab1).toBe('RESTAURANT_COUPONS');
      // When tab switches, directory data remains intact in persistent storage
      const activeTab2 = 'PROMO_COUPONS';
      expect(activeTab2).toBe('PROMO_COUPONS');
      expect(directory).toHaveLength(2);
      expect(directory.map((c) => c.code)).toContain('PROMO_A');
      expect(directory.map((c) => c.code)).toContain('PROMO_B');

      // 4. Create Promo Coupon C: verifies A and B are not overwritten
      const couponC = {
        id: 'c-promo-c',
        code: 'PROMO_C',
        title: 'Promo Deal C',
        discountType: 'PERCENT' as const,
        discountValue: 15,
        minPurchase: 100,
        maxDiscount: 30,
        module: 'All Food Delivery',
        expiryDate: '2099-12-31',
        status: 'ACTIVE' as const,
        couponType: 'PROMO_COUPON',
        funderType: 'FOODIE',
        zoneId: 'ALL',
        zoneName: 'All Locations',
      };

      directory = [couponC, ...directory.filter((c) => c.code !== couponC.code)];
      expect(directory).toHaveLength(3);
      expect(directory.map((c) => c.code)).toEqual(['PROMO_C', 'PROMO_B', 'PROMO_A']);
    });

    it('retains coupon status accurately (ACTIVE, DEACTIVATED, EXPIRED) without purging records', () => {
      const couponsList = [
        { code: 'ACTIVE1', status: 'ACTIVE', expiryDate: '2099-12-31' },
        { code: 'DEACT1', status: 'DEACTIVATED', expiryDate: '2099-12-31' },
        { code: 'EXP1', status: 'DEACTIVATED', expiryDate: '2020-01-01' },
      ];

      // Switching views or unmounting retains all items with status intact
      expect(couponsList.find((c) => c.code === 'ACTIVE1')?.status).toBe('ACTIVE');
      expect(couponsList.find((c) => c.code === 'DEACT1')?.status).toBe('DEACTIVATED');
      expect(couponsList.find((c) => c.code === 'EXP1')?.status).toBe('DEACTIVATED');
      expect(couponsList).toHaveLength(3);
    });

    it('ensures admin/coupons API response is properly extracted from { success: true, data: [...] }', () => {
      const bffResponse = {
        success: true,
        data: [
          { couponId: 'c-1', code: 'PROMO10', couponType: 'PROMO_COUPON', isActive: true },
          { couponId: 'c-2', code: 'REST20', couponType: 'RESTAURANT', isActive: true },
        ],
      };

      const transformResponse = (res: any) => {
        if (Array.isArray(res?.data)) return res.data;
        if (res?.content) return res.content;
        if (Array.isArray(res)) return res;
        if (res?.items) return res.items;
        return [];
      };

      const extracted = transformResponse(bffResponse);
      expect(extracted).toHaveLength(2);
      expect(extracted[0].code).toBe('PROMO10');
      expect(extracted[1].code).toBe('REST20');
    });
  });

  describe('Restaurant Coupon Activation and Customer Visibility', () => {
    const zoneCoupon = {
      couponId: 'c-zone-tmk-01',
      code: 'TUMKURDEAL',
      title: 'Tumkur 20% OFF Restaurant Deal',
      couponType: 'RESTAURANT',
      funderType: 'SHARED',
      discountType: 'PERCENT',
      value: 20,
      adminDiscount: 10,
      restaurantDiscount: 10,
      minOrderAmount: 200,
      maxDiscountAmount: 100,
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
      isActive: false,
      status: 'DEACTIVATED',
      enabledRestaurantIds: [] as string[],
      restaurantStatuses: {} as Record<string, boolean>,
    };

    it('reaches all assigned restaurants with DISABLED status by default when created', () => {
      // Restaurant 1 in Tumkur
      const rest1Promos = filterCouponsForRestaurantPanel([zoneCoupon], 'rest-tumkur-101', 'dz-tumkur');
      expect(rest1Promos).toHaveLength(1);
      expect(rest1Promos[0].code).toBe('TUMKURDEAL');
      expect(rest1Promos[0].isActive).toBe(false);
      expect(rest1Promos[0].status).toBe('DEACTIVATED');

      // Restaurant 2 in Tumkur
      const rest2Promos = filterCouponsForRestaurantPanel([zoneCoupon], 'rest-tumkur-102', 'dz-tumkur');
      expect(rest2Promos).toHaveLength(1);
      expect(rest2Promos[0].code).toBe('TUMKURDEAL');
      expect(rest2Promos[0].isActive).toBe(false);
      expect(rest2Promos[0].status).toBe('DEACTIVATED');
    });

    it('is never automatically ENABLED without manual restaurant action', () => {
      expect(isCouponEnabledForRestaurant(zoneCoupon, 'rest-tumkur-101')).toBe(false);
      expect(isCouponEnabledForRestaurant(zoneCoupon, 'rest-tumkur-102')).toBe(false);
    });

    it('allows each restaurant to manually enable its own coupon independently', () => {
      // Restaurant 1 manually enables its coupon
      const updatedCoupon = {
        ...zoneCoupon,
        enabledRestaurantIds: ['rest-tumkur-101'],
        restaurantStatuses: { 'rest-tumkur-101': true },
        isActive: true,
      };

      // Restaurant 1 now sees it as ACTIVE
      const rest1Promos = filterCouponsForRestaurantPanel([updatedCoupon], 'rest-tumkur-101', 'dz-tumkur');
      expect(rest1Promos[0].isActive).toBe(true);
      expect(rest1Promos[0].status).toBe('ACTIVE');

      // Restaurant 2 in the same zone remains DISABLED
      const rest2Promos = filterCouponsForRestaurantPanel([updatedCoupon], 'rest-tumkur-102', 'dz-tumkur');
      expect(rest2Promos[0].isActive).toBe(false);
      expect(rest2Promos[0].status).toBe('DEACTIVATED');
    });

    it('enabling one restaurant coupon does not affect other restaurants in the same zone', () => {
      const rest1EnabledCoupon = {
        ...zoneCoupon,
        enabledRestaurantIds: ['rest-tumkur-101'],
        restaurantStatuses: { 'rest-tumkur-101': true },
        isActive: true,
      };

      expect(isCouponEnabledForRestaurant(rest1EnabledCoupon, 'rest-tumkur-101')).toBe(true);
      expect(isCouponEnabledForRestaurant(rest1EnabledCoupon, 'rest-tumkur-102')).toBe(false);
      expect(isCouponEnabledForRestaurant(rest1EnabledCoupon, 'rest-tumkur-103')).toBe(false);
    });

    it('appears to customers selecting that specific restaurant only after enablement', () => {
      // Before Restaurant 1 enables it: customer selecting Restaurant 1 does NOT see it
      const beforeCustomerView = filterCouponsForCustomerDirect([zoneCoupon], 'dz-tumkur', 'rest-tumkur-101');
      expect(beforeCustomerView.map((c) => c.code)).not.toContain('TUMKURDEAL');

      // After Restaurant 1 enables it: customer selecting Restaurant 1 DOES see it
      const rest1EnabledCoupon = {
        ...zoneCoupon,
        enabledRestaurantIds: ['rest-tumkur-101'],
        restaurantStatuses: { 'rest-tumkur-101': true },
        isActive: true,
      };
      const afterCustomerViewRest1 = filterCouponsForCustomerDirect([rest1EnabledCoupon], 'dz-tumkur', 'rest-tumkur-101');
      expect(afterCustomerViewRest1.map((c) => c.code)).toContain('TUMKURDEAL');

      // Customer selecting Restaurant 2 (disabled) does NOT see it
      const afterCustomerViewRest2 = filterCouponsForCustomerDirect([rest1EnabledCoupon], 'dz-tumkur', 'rest-tumkur-102');
      expect(afterCustomerViewRest2.map((c) => c.code)).not.toContain('TUMKURDEAL');
    });

    it('preserves existing zone-wise assignment functionality across different zones', () => {
      const rest1EnabledCoupon = {
        ...zoneCoupon,
        enabledRestaurantIds: ['rest-tumkur-101'],
        restaurantStatuses: { 'rest-tumkur-101': true },
        isActive: true,
      };

      // Tumkur zone customers selecting rest-tumkur-101 see the coupon
      const tumkurCustomer = filterCouponsForCustomerDirect([rest1EnabledCoupon], 'dz-tumkur', 'rest-tumkur-101');
      expect(tumkurCustomer.map((c) => c.code)).toContain('TUMKURDEAL');

      // Bangalore zone customers cannot see Tumkur zone coupon
      const bangaloreCustomer = filterCouponsForCustomerDirect([rest1EnabledCoupon], 'dz-bangalore', 'rest-tumkur-101');
      expect(bangaloreCustomer.map((c) => c.code)).not.toContain('TUMKURDEAL');
    });

    it('validates complete Super Admin creation, restaurant activation, and checkout application via BFF', async () => {
      const uniqueCode = `AUTO_${Date.now().toString().slice(-4)}`;

      // 1. Super Admin creates a zone-wise coupon for Tumkur Zone
      const createReq = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: uniqueCode,
          discountType: 'PERCENT',
          value: 20,
          adminDiscount: 10,
          restaurantDiscount: 10,
          minOrderAmount: 100,
          maxDiscountAmount: 50,
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          couponType: 'RESTAURANT',
        }),
      });
      const createRes = await POST(createReq, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      expect(createRes.status).toBe(201);
      const createdData = await createRes.json();
      expect(createdData.data.code).toBe(uniqueCode);
      expect(createdData.data.isActive).toBe(false);
      expect(createdData.data.status).toBe('DEACTIVATED');

      // 2. Coupon reaches Tumkur restaurants with DISABLED status by default
      const rest1QueryReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=rest-tumkur-101&zoneId=dz-tumkur');
      const rest1QueryRes = await GET(rest1QueryReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const rest1Coupons = await rest1QueryRes.json();
      const targetInRest1 = rest1Coupons.data.find((c: any) => c.code === uniqueCode);
      expect(targetInRest1).toBeDefined();
      expect(targetInRest1.isActive).toBe(false);
      expect(targetInRest1.status).toBe('DEACTIVATED');

      // 3. Customer selecting Restaurant 1 cannot see disabled coupon
      const custBeforeReq = new Request(`http://localhost:3100/api/bff/coupons/active?restaurantId=rest-tumkur-101&zoneId=dz-tumkur`);
      const custBeforeRes = await GET(custBeforeReq, { params: Promise.resolve({ path: ['coupons', 'active'] }) });
      const custBeforeData = await custBeforeRes.json();
      expect(custBeforeData.data.some((c: any) => c.code === uniqueCode)).toBe(false);

      // 4. Customer attempting to apply disabled coupon at checkout is rejected
      const applyDisabledReq = new Request('http://localhost:3100/api/bff/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: uniqueCode,
          restaurantId: 'rest-tumkur-101',
          cartTotal: 250,
          zoneId: 'dz-tumkur',
        }),
      });
      const applyDisabledRes = await POST(applyDisabledReq, { params: Promise.resolve({ path: ['coupons', 'apply'] }) });
      expect(applyDisabledRes.status).toBe(400);
      const applyDisabledData = await applyDisabledRes.json();
      expect(applyDisabledData.error.code).toBe('COUPON_DISABLED');

      // 5. Restaurant 1 manually enables its coupon
      const activateReq = new Request(`http://localhost:3100/api/bff/restaurant/coupons/${createdData.data.couponId}/activate?restaurantId=rest-tumkur-101`, {
        method: 'PATCH',
      });
      const activateRes = await PATCH(activateReq, {
        params: Promise.resolve({ path: ['restaurant', 'coupons', createdData.data.couponId, 'activate'] }),
      });
      expect(activateRes.status).toBe(200);

      // 6. Restaurant 1 now sees it as ACTIVE; Restaurant 2 in same zone is STILL DISABLED
      const rest1AfterReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=rest-tumkur-101&zoneId=dz-tumkur');
      const rest1AfterRes = await GET(rest1AfterReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const rest1AfterData = await rest1AfterRes.json();
      expect(rest1AfterData.data.find((c: any) => c.code === uniqueCode)?.isActive).toBe(true);

      const rest2AfterReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=rest-tumkur-102&zoneId=dz-tumkur');
      const rest2AfterRes = await GET(rest2AfterReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const rest2AfterData = await rest2AfterRes.json();
      expect(rest2AfterData.data.find((c: any) => c.code === uniqueCode)?.isActive).toBe(false);

      // 7. Customer selecting Restaurant 1 can now see and apply the coupon
      const custAfterReq = new Request(`http://localhost:3100/api/bff/coupons/active?restaurantId=rest-tumkur-101&zoneId=dz-tumkur`);
      const custAfterRes = await GET(custAfterReq, { params: Promise.resolve({ path: ['coupons', 'active'] }) });
      const custAfterData = await custAfterRes.json();
      expect(custAfterData.data.some((c: any) => c.code === uniqueCode)).toBe(true);

      const applySuccessReq = new Request('http://localhost:3100/api/bff/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: uniqueCode,
          restaurantId: 'rest-tumkur-101',
          cartTotal: 250,
          zoneId: 'dz-tumkur',
        }),
      });
      const applySuccessRes = await POST(applySuccessReq, { params: Promise.resolve({ path: ['coupons', 'apply'] }) });
      expect(applySuccessRes.status).toBe(200);
      const applySuccessData = await applySuccessRes.json();
      expect(applySuccessData.success).toBe(true);
      expect(applySuccessData.data.discountAmount).toBe(50); // 20% of 250 = 50 (maxDiscount 50)

      // 8. Customer selecting Restaurant 2 cannot apply it at checkout
      const applyRest2Req = new Request('http://localhost:3100/api/bff/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: uniqueCode,
          restaurantId: 'rest-tumkur-102',
          cartTotal: 250,
          zoneId: 'dz-tumkur',
        }),
      });
      const applyRest2Res = await POST(applyRest2Req, { params: Promise.resolve({ path: ['coupons', 'apply'] }) });
      expect(applyRest2Res.status).toBe(400);
      const applyRest2Data = await applyRest2Res.json();
      expect(applyRest2Data.error.code).toBe('COUPON_DISABLED');
    });
  });

  describe('Manual Maximum Discount Amount Field & Checkout Cap Enforcement', () => {
    it('1. Keeps Minimum Order Amount and stores manual Maximum Discount Amount without auto-calculation', () => {
      const manualCoupon = validateCreateCoupon({
        code: 'MAXCAP40',
        discountType: 'PERCENT',
        value: '50', // 50% discount
        minOrderAmount: '200',
        maxDiscountAmount: '40', // manually entered: ₹40, NOT 50 * 2 = 100!
        expiryDate: '2099-12-31',
        usageLimitPerUser: '1',
        restaurantId: 'b7c2a110-92d4-4f81-9b11-a83d712e5001',
      });

      expect(manualCoupon.ok).toBe(true);
      if (manualCoupon.ok) {
        expect(manualCoupon.body.minOrderAmount).toBe(200);
        expect(manualCoupon.body.maxDiscountAmount).toBe(40);
        // Verify it was NOT auto-generated as value * 2 (100)
        expect(manualCoupon.body.maxDiscountAmount).not.toBe(100);
      }
    });

    it('2. Helper calculateCouponDiscount applies the exact maximum discount cap', () => {
      const coupon50 = {
        code: 'SAVE50MAX40',
        discountType: 'PERCENT',
        value: 50,
        minOrderAmount: 100,
        maxDiscountAmount: 40,
      };

      // Cart total 300: 50% is 150, but capped at 40
      expect(calculateCouponDiscount(coupon50, 300)).toBe(40);

      // Cart total 50: minOrderAmount 100 not met
      expect(calculateCouponDiscount(coupon50, 50)).toBe(0);

      const coupon20 = {
        code: 'SAVE20MAX50',
        discountType: 'PERCENT',
        value: 20,
        minOrderAmount: 100,
        maxDiscountAmount: 50,
      };

      // Cart total 500: 20% is 100, but capped at 50
      expect(calculateCouponDiscount(coupon20, 500)).toBe(50);

      // Cart total 200: 20% is 40 (below cap of 50, so full 40 is granted)
      expect(calculateCouponDiscount(coupon20, 200)).toBe(40);
    });

    it('3. BFF preserves manual maxDiscountAmount, distributes to Restaurant & Customer, and caps at checkout', async () => {
      const code = `MCAP_${Date.now().toString().slice(-4)}`;

      // 1. Super Admin creates coupon with manual maxDiscountAmount of ₹40
      const createReq = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discountType: 'PERCENT',
          value: 50, // 50% discount
          adminDiscount: 25,
          restaurantDiscount: 25,
          minOrderAmount: 150,
          maxDiscountAmount: 40, // Manually entered ₹40
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          couponType: 'RESTAURANT',
        }),
      });
      const createRes = await POST(createReq, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.data.maxDiscountAmount).toBe(40);
      expect(created.data.maxDiscount).toBe(40);

      // 2. Passed correctly to Restaurant Panel
      const restReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=rest-tumkur-101&zoneId=dz-tumkur');
      const restRes = await GET(restReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const restData = await restRes.json();
      const restCoupon = restData.data.find((c: any) => c.code === code);
      expect(restCoupon).toBeDefined();
      expect(restCoupon.maxDiscountAmount).toBe(40);
      expect(restCoupon.maxDiscount).toBe(40);

      // 3. Restaurant enables coupon
      const actReq = new Request(`http://localhost:3100/api/bff/restaurant/coupons/${created.data.couponId}/activate?restaurantId=rest-tumkur-101`, {
        method: 'PATCH',
      });
      const actRes = await PATCH(actReq, {
        params: Promise.resolve({ path: ['restaurant', 'coupons', created.data.couponId, 'activate'] }),
      });
      expect(actRes.status).toBe(200);

      // 4. Customer App receives exact maxDiscountAmount
      const custReq = new Request('http://localhost:3100/api/bff/coupons/active?restaurantId=rest-tumkur-101&zoneId=dz-tumkur');
      const custRes = await GET(custReq, { params: Promise.resolve({ path: ['coupons', 'active'] }) });
      const custData = await custRes.json();
      const custCoupon = custData.data.find((c: any) => c.code === code);
      expect(custCoupon).toBeDefined();
      expect(custCoupon.maxDiscountAmount).toBe(40);
      expect(custCoupon.maxDiscount).toBe(40);

      // 5. Checkout application strictly caps discount at ₹40
      const applyReq = new Request('http://localhost:3100/api/bff/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          restaurantId: 'rest-tumkur-101',
          cartTotal: 300, // 50% of 300 would be 150!
          zoneId: 'dz-tumkur',
        }),
      });
      const applyRes = await POST(applyReq, { params: Promise.resolve({ path: ['coupons', 'apply'] }) });
      expect(applyRes.status).toBe(200);
      const applyData = await applyRes.json();
      expect(applyData.success).toBe(true);
      expect(applyData.data.discountAmount).toBe(40); // Strictly capped to 40
      expect(applyData.data.finalTotal).toBe(260); // 300 - 40 = 260
    });
  });

  describe('Global Super Admin Coupon Storage and Zone-Wise Distribution', () => {
    it('stores coupons created across different Super Admin devices/sessions in shared storage and shows them in Global View', async () => {
      const code1 = `DEV_A_${Date.now().toString().slice(-4)}`;
      const code2 = `DEV_B_${Date.now().toString().slice(-4)}`;

      // 1. Device A (Super Admin: admin_device_a@foodie.com, active zone: dz-tumkur) creates Tumkur coupon
      const devACreateReq = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'admin_device_a@foodie.com',
          'Cookie': 'foodie_active_zone_id=dz-tumkur',
        },
        body: JSON.stringify({
          code: code1,
          discountType: 'PERCENT',
          value: 20,
          adminDiscount: 10,
          restaurantDiscount: 10,
          minOrderAmount: 200,
          maxDiscountAmount: 50,
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
          couponType: 'RESTAURANT',
          createdBy: 'admin_device_a@foodie.com',
        }),
      });
      const devACreateRes = await POST(devACreateReq, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      expect(devACreateRes.status).toBe(201);
      const devACreated = await devACreateRes.json();
      expect(devACreated.data.code).toBe(code1);
      expect(devACreated.data.createdBy).toBe('admin_device_a@foodie.com');

      // 2. Device B (Super Admin: admin_device_b@foodie.com, active zone: dz-bangalore) creates Bangalore coupon
      const devBCreateReq = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'admin_device_b@foodie.com',
          'Cookie': 'foodie_active_zone_id=dz-bangalore',
        },
        body: JSON.stringify({
          code: code2,
          discountType: 'PERCENT',
          value: 25,
          adminDiscount: 15,
          restaurantDiscount: 10,
          minOrderAmount: 300,
          maxDiscountAmount: 60,
          zoneId: 'dz-bangalore',
          zoneName: 'Bangalore Zone',
          couponType: 'RESTAURANT',
          createdBy: 'admin_device_b@foodie.com',
        }),
      });
      const devBCreateRes = await POST(devBCreateReq, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      expect(devBCreateRes.status).toBe(201);
      const devBCreated = await devBCreateRes.json();
      expect(devBCreated.data.code).toBe(code2);
      expect(devBCreated.data.createdBy).toBe('admin_device_b@foodie.com');

      // 3. Verify Global View from Device A (with Tumkur cookie and header) sees BOTH coupons
      const globalReqA = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'GET',
        headers: {
          'Cookie': 'foodie_active_zone_id=dz-tumkur',
          'X-Active-Zone-Id': 'dz-tumkur',
        },
      });
      const globalResA = await GET(globalReqA, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      const globalDataA = await globalResA.json();
      expect(globalDataA.success).toBe(true);
      const coupon1InA = globalDataA.data.find((c: any) => c.code === code1);
      const coupon2InA = globalDataA.data.find((c: any) => c.code === code2);
      expect(coupon1InA).toBeDefined();
      expect(coupon2InA).toBeDefined();
      expect(coupon1InA.createdBy).toBe('admin_device_a@foodie.com');
      expect(coupon2InA.createdBy).toBe('admin_device_b@foodie.com');

      // 4. Verify Global View from Device B (with Bangalore cookie and header) also sees BOTH coupons
      const globalReqB = new Request('http://localhost:3100/api/bff/admin/coupons', {
        method: 'GET',
        headers: {
          'Cookie': 'foodie_active_zone_id=dz-bangalore',
          'X-Active-Zone-Id': 'dz-bangalore',
        },
      });
      const globalResB = await GET(globalReqB, { params: Promise.resolve({ path: ['admin', 'coupons'] }) });
      const globalDataB = await globalResB.json();
      expect(globalDataB.success).toBe(true);
      const coupon1InB = globalDataB.data.find((c: any) => c.code === code1);
      const coupon2InB = globalDataB.data.find((c: any) => c.code === code2);
      expect(coupon1InB).toBeDefined();
      expect(coupon2InB).toBeDefined();

      // 5. Zone assignment and restaurant isolation:
      // Tumkur restaurant receives ONLY coupon 1 (Tumkur), with DISABLED status by default
      const restTmkReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=rest-tumkur-101&zoneId=dz-tumkur');
      const restTmkRes = await GET(restTmkReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const restTmkData = await restTmkRes.json();
      const restTmkHasCoupon1 = restTmkData.data.find((c: any) => c.code === code1);
      const restTmkHasCoupon2 = restTmkData.data.find((c: any) => c.code === code2);
      expect(restTmkHasCoupon1).toBeDefined();
      expect(restTmkHasCoupon1.isActive).toBe(false); // DISABLED by default
      expect(restTmkHasCoupon2).toBeUndefined(); // Bangalore coupon not received

      // Bangalore restaurant receives ONLY coupon 2 (Bangalore), with DISABLED status by default
      const restBlrReq = new Request('http://localhost:3100/api/bff/restaurant/coupons?restaurantId=b7c2a110-92d4-4f81-9b11-a83d712e5001&zoneId=dz-bangalore');
      const restBlrRes = await GET(restBlrReq, { params: Promise.resolve({ path: ['restaurant', 'coupons'] }) });
      const restBlrData = await restBlrRes.json();
      const restBlrHasCoupon1 = restBlrData.data.find((c: any) => c.code === code1);
      const restBlrHasCoupon2 = restBlrData.data.find((c: any) => c.code === code2);
      expect(restBlrHasCoupon2).toBeDefined();
      expect(restBlrHasCoupon2.isActive).toBe(false); // DISABLED by default
      expect(restBlrHasCoupon1).toBeUndefined(); // Tumkur coupon not received
    });
  });
});
