import {
  calculateSettlementEarnings,
  calculatePaymentSplit,
  filterRecordsByDateRange,
  DEFAULT_COMMISSION_CONFIG,
  CommissionConfig,
  PaymentSettlementRecord,
} from '../features/payments/types';

describe('Commission Rules and Admin Earnings Automatic Synchronization', () => {
  // Reference date: Wednesday, October 28, 2026, 14:30:00
  const refDate = new Date(2026, 9, 28, 14, 30, 0);

  const sampleOrders: PaymentSettlementRecord[] = [
    {
      id: 'order-1',
      settlementId: 'SET-1',
      orderId: 'ORD-1',
      customerName: 'Customer A',
      totalPaid: 1140,
      foodSubtotal: 1000,
      deliveryFee: 100,
      restaurantNetShare: 860,
      deliveryPartnerNetShare: 90,
      adminTotalRevenue: 190,
      settlementStatus: 'FUNDS_DISTRIBUTED',
      settledAt: new Date(2026, 9, 28, 10, 0, 0).toISOString(), // Today
    },
    {
      id: 'order-2',
      settlementId: 'SET-2',
      orderId: 'ORD-2',
      customerName: 'Customer B',
      totalPaid: 580,
      foodSubtotal: 500,
      deliveryFee: 40,
      restaurantNetShare: 430,
      deliveryPartnerNetShare: 36,
      adminTotalRevenue: 114,
      settlementStatus: 'SETTLED',
      settledAt: new Date(2026, 9, 27, 12, 0, 0).toISOString(), // Yesterday (This week)
    },
    {
      id: 'order-3',
      settlementId: 'SET-3',
      orderId: 'ORD-3',
      customerName: 'Customer C',
      totalPaid: 850,
      foodSubtotal: 700,
      deliveryFee: 110,
      restaurantNetShare: 602,
      deliveryPartnerNetShare: 99,
      adminTotalRevenue: 149,
      settlementStatus: 'COMPLETED',
      settledAt: new Date(2026, 9, 15, 9, 0, 0).toISOString(), // Earlier this month
    },
    {
      id: 'order-cancelled',
      settlementId: 'SET-CANCELLED',
      orderId: 'ORD-CAN-1',
      customerName: 'Customer Cancelled',
      totalPaid: 1000,
      foodSubtotal: 900,
      deliveryFee: 60,
      restaurantNetShare: 774,
      deliveryPartnerNetShare: 54,
      adminTotalRevenue: 172,
      settlementStatus: 'CANCELLED',
      settledAt: new Date(2026, 9, 28, 11, 0, 0).toISOString(),
    },
    {
      id: 'order-failed',
      settlementId: 'SET-FAILED',
      orderId: 'ORD-FAIL-1',
      customerName: 'Customer Failed',
      totalPaid: 500,
      foodSubtotal: 400,
      deliveryFee: 60,
      restaurantNetShare: 344,
      deliveryPartnerNetShare: 54,
      adminTotalRevenue: 102,
      settlementStatus: 'FAILED',
      settledAt: new Date(2026, 9, 28, 11, 30, 0).toISOString(),
    },
    {
      id: 'order-refunded',
      settlementId: 'SET-REFUNDED',
      orderId: 'ORD-REF-1',
      customerName: 'Customer Refunded',
      totalPaid: 650,
      foodSubtotal: 550,
      deliveryFee: 60,
      restaurantNetShare: 473,
      deliveryPartnerNetShare: 54,
      adminTotalRevenue: 123,
      settlementStatus: 'REFUNDED',
      settledAt: new Date(2026, 9, 28, 12, 0, 0).toISOString(),
    },
  ];

  describe('1. Default Commission Rules (14% / 10% / ₹40)', () => {
    it('calculates earnings accurately with default rules', () => {
      const breakdown = calculateSettlementEarnings(sampleOrders[0], DEFAULT_COMMISSION_CONFIG);
      // Food subtotal: 1000 * 14% = 140
      expect(breakdown.foodCommission).toBe(140);
      // Delivery fee: 100 * 10% = 10
      expect(breakdown.deliveryCommission).toBe(10);
      // Platform fee: 40
      expect(breakdown.platformFee).toBe(40);
      // Total: 140 + 10 + 40 = 190
      expect(breakdown.adminTotalRevenue).toBe(190);
    });
  });

  describe('2. Synchronizing Updated Commission Rules (14% → 16%, 10% → 12%, ₹40 → ₹50)', () => {
    const updatedRules: CommissionConfig = {
      restaurantCommissionRate: 16,
      deliveryCommissionRate: 12,
      platformFixedFee: 50,
    };

    it('calculates restaurant food commission using the updated rate (16%) and food subtotal', () => {
      // Example from specification: food subtotal ₹1,000 and commission rate 16% -> platform earns ₹160
      const breakdown = calculateSettlementEarnings(sampleOrders[0], updatedRules);
      expect(breakdown.foodCommission).toBe(160);
    });

    it('calculates delivery partner commission using the updated rate (12%) and delivery fee (not food subtotal)', () => {
      // Example from specification: delivery fee ₹100 and commission rate 12% -> platform earns ₹12
      const breakdown = calculateSettlementEarnings(sampleOrders[0], updatedRules);
      expect(breakdown.deliveryCommission).toBe(12);
    });

    it('uses the updated fixed platform service fee (₹50) per eligible order', () => {
      // Example from specification: fixed platform fee changed from ₹40 to ₹50 -> platform earns ₹50
      const breakdown = calculateSettlementEarnings(sampleOrders[0], updatedRules);
      expect(breakdown.platformFee).toBe(50);
    });

    it('calculates Total Platform Earnings = Food Commission + Delivery Commission + Fixed Platform Fee', () => {
      // Total = 160 + 12 + 50 = 222
      const breakdown = calculateSettlementEarnings(sampleOrders[0], updatedRules);
      expect(breakdown.adminTotalRevenue).toBe(222);
      expect(breakdown.adminTotalRevenue).toBe(
        breakdown.foodCommission + breakdown.deliveryCommission + breakdown.platformFee
      );
    });

    it('calculates multi-order aggregate platform earnings with updated rules', () => {
      const eligible = sampleOrders.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      expect(eligible).toHaveLength(3);

      const breakdowns = eligible.map((s) => calculateSettlementEarnings(s, updatedRules));

      // Order 1: 1000 food * 16% = 160; 100 deliv * 12% = 12; fee = 50 -> 222
      expect(breakdowns[0]).toEqual({
        foodCommission: 160,
        deliveryCommission: 12,
        platformFee: 50,
        adminTotalRevenue: 222,
      });

      // Order 2: 500 food * 16% = 80; 40 deliv * 12% = 4.8; fee = 50 -> 134.80
      expect(breakdowns[1]).toEqual({
        foodCommission: 80,
        deliveryCommission: 4.8,
        platformFee: 50,
        adminTotalRevenue: 134.8,
      });

      // Order 3: 700 food * 16% = 112; 110 deliv * 12% = 13.2; fee = 50 -> 175.20
      expect(breakdowns[2]).toEqual({
        foodCommission: 112,
        deliveryCommission: 13.2,
        platformFee: 50,
        adminTotalRevenue: 175.2,
      });

      const totalFoodCommission = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliveryCommission = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalPlatformFees = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);
      const totalAdminEarningsRevenue = totalFoodCommission + totalDeliveryCommission + totalPlatformFees;

      // 160 + 80 + 112 = 352
      expect(totalFoodCommission).toBe(352);
      // 12 + 4.8 + 13.2 = 30
      expect(totalDeliveryCommission).toBe(30);
      // 50 * 3 = 150
      expect(totalPlatformFees).toBe(150);
      // 352 + 30 + 150 = 532
      expect(totalAdminEarningsRevenue).toBe(532);
    });
  });

  describe('3. Date Filtering with Updated Commission Rules', () => {
    const customRules: CommissionConfig = {
      restaurantCommissionRate: 15,
      deliveryCommissionRate: 10,
      platformFixedFee: 50,
    };

    const eligible = sampleOrders.filter(
      (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
    );

    it('recalculates TODAY earnings using updated commission rules', () => {
      const todayOrders = filterRecordsByDateRange(
        eligible,
        'TODAY',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(todayOrders).toHaveLength(1);
      expect(todayOrders[0].id).toBe('order-1');

      const breakdown = calculateSettlementEarnings(todayOrders[0], customRules);
      // 1000 * 15% = 150; 100 * 10% = 10; fee = 50 -> 210
      expect(breakdown.foodCommission).toBe(150);
      expect(breakdown.deliveryCommission).toBe(10);
      expect(breakdown.platformFee).toBe(50);
      expect(breakdown.adminTotalRevenue).toBe(210);
    });

    it('recalculates THIS_WEEK earnings using updated commission rules', () => {
      const weekOrders = filterRecordsByDateRange(
        eligible,
        'THIS_WEEK',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      // Order 1 (Today) + Order 2 (Yesterday)
      expect(weekOrders).toHaveLength(2);

      const breakdowns = weekOrders.map((s) => calculateSettlementEarnings(s, customRules));
      const totalFood = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliv = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalFee = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);

      // Order 1: 150 food, 10 deliv, 50 fee
      // Order 2: 500 * 15% = 75 food, 40 * 10% = 4 deliv, 50 fee
      expect(totalFood).toBe(225);
      expect(totalDeliv).toBe(14);
      expect(totalFee).toBe(100);
      expect(totalFood + totalDeliv + totalFee).toBe(339);
    });

    it('recalculates THIS_MONTH earnings using updated commission rules', () => {
      const monthOrders = filterRecordsByDateRange(
        eligible,
        'THIS_MONTH',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(monthOrders).toHaveLength(3);

      const breakdowns = monthOrders.map((s) => calculateSettlementEarnings(s, customRules));
      const totalFood = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliv = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalFee = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);

      // 150 + 75 + (700 * 15% = 105) = 330
      expect(totalFood).toBe(330);
      // 10 + 4 + (110 * 10% = 11) = 25
      expect(totalDeliv).toBe(25);
      // 50 * 3 = 150
      expect(totalFee).toBe(150);
      expect(totalFood + totalDeliv + totalFee).toBe(505);
    });

    it('returns ₹0.00 for empty date range without NaN', () => {
      const empty = filterRecordsByDateRange(
        eligible,
        'CUSTOM',
        (s) => s.settledAt,
        '2020-01-01',
        '2020-01-31',
        refDate
      );
      expect(empty).toHaveLength(0);

      const breakdowns = empty.map((s) => calculateSettlementEarnings(s, customRules));
      const totalFood = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliv = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalFee = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);

      expect(totalFood).toBe(0);
      expect(totalDeliv).toBe(0);
      expect(totalFee).toBe(0);
      expect(totalFood + totalDeliv + totalFee).toBe(0);
    });
  });

  describe('4. Money Conservation & Split Calculation with Updated Rules', () => {
    it('conserves 100% of funds when platform rules change', () => {
      const rules: CommissionConfig = {
        restaurantCommissionRate: 18,
        deliveryCommissionRate: 15,
        platformFixedFee: 60,
      };

      const split = calculatePaymentSplit(800, 120, rules);

      // Food: 800 * 18% = 144
      expect(split.adminFoodCommission).toBe(144);
      // Delivery: 120 * 15% = 18
      expect(split.adminDeliveryCommission).toBe(18);
      // Platform: 60
      expect(split.platformFee).toBe(60);
      // Total admin: 144 + 18 + 60 = 222
      expect(split.adminTotalRevenue).toBe(222);
      // Restaurant net: 800 - 144 = 656
      expect(split.restaurantNetShare).toBe(656);
      // Delivery partner net: 120 - 18 = 102
      expect(split.deliveryPartnerNetShare).toBe(102);
      // Total paid: 800 + 120 + 60 = 980
      expect(split.totalPaid).toBe(980);

      // Verify conservation
      const totalDistributed = Number(
        (split.adminTotalRevenue + split.restaurantNetShare + split.deliveryPartnerNetShare).toFixed(2)
      );
      expect(totalDistributed).toBe(split.totalPaid);
    });
  });

  describe('5. Preservation of Historical Settlements with Pre-computed Commissions', () => {
    it('preserves pre-computed commission values when historical record stores explicit amounts at default config', () => {
      const historicalRecord: PaymentSettlementRecord = {
        id: 'hist-1',
        orderId: 'ORD-HIST-1',
        totalPaid: 740,
        foodSubtotal: 600,
        deliveryFee: 100,
        platformFee: 40,
        restaurantFoodCommission: 84, // Frozen explicit commission
        deliveryPartnerCommission: 10, // Frozen explicit commission
        adminTotalRevenue: 134,
        restaurantNetShare: 516,
        deliveryPartnerNetShare: 90,
        settlementStatus: 'COMPLETED',
        settledAt: '2026-03-01T10:00:00.000Z',
      };

      const breakdown = calculateSettlementEarnings(historicalRecord, DEFAULT_COMMISSION_CONFIG);
      expect(breakdown.foodCommission).toBe(84);
      expect(breakdown.deliveryCommission).toBe(10);
      expect(breakdown.platformFee).toBe(40);
      expect(breakdown.adminTotalRevenue).toBe(134);
    });
  });
});

