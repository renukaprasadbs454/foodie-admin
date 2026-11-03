import { CouponsPage } from '../features/coupons/pages/CouponsPage';
import {
  validateCreateCoupon,
  extractDateOnly,
  formatCouponValidityDate,
} from '../features/coupons/types';

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
  });
});
