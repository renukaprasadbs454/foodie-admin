import {
  filterRecordsByDateRange,
  parseRecordTimestamp,
  calculateSettlementEarnings,
  DEFAULT_COMMISSION_CONFIG,
  PaymentSettlementRecord,
  RestaurantSettlementRecord,
  LedgerEntryRecord,
  PayoutRecord,
  CancelledOrderRefundRequest,
} from '../features/payments/types';

describe('Payment Tabs Date Filtering System', () => {
  // Reference date: Wednesday, October 28, 2026, 14:30:00 (Local time)
  const refDate = new Date(2026, 9, 28, 14, 30, 0); // Month is 0-indexed: 9 = October

  describe('1. Master Order Settlements Filtering', () => {
    const settlements: PaymentSettlementRecord[] = [
      {
        id: 'settle-today-1',
        settlementId: 'SET-TODAY-1',
        orderId: 'ORD-101',
        customerName: 'Alice',
        totalPaid: 500,
        foodSubtotal: 400,
        deliveryFee: 60,
        restaurantNetShare: 344,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 102,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 28, 10, 0, 0).toISOString(), // Today 10:00 AM
      },
      {
        id: 'settle-yesterday-1',
        settlementId: 'SET-YEST-1',
        orderId: 'ORD-102',
        customerName: 'Bob',
        totalPaid: 800,
        foodSubtotal: 700,
        deliveryFee: 60,
        restaurantNetShare: 602,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 144,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 27, 16, 0, 0).toISOString(), // Yesterday 4:00 PM (Tuesday)
      },
      {
        id: 'settle-this-week-monday',
        settlementId: 'SET-MON-1',
        orderId: 'ORD-103',
        customerName: 'Charlie',
        totalPaid: 1200,
        foodSubtotal: 1000,
        deliveryFee: 100,
        restaurantNetShare: 860,
        deliveryPartnerNetShare: 90,
        adminTotalRevenue: 250,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 26, 9, 0, 0).toISOString(), // Monday of this week
      },
      {
        id: 'settle-last-week',
        settlementId: 'SET-LAST-WK',
        orderId: 'ORD-104',
        customerName: 'Dave',
        totalPaid: 450,
        foodSubtotal: 350,
        deliveryFee: 60,
        restaurantNetShare: 301,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 95,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 20, 11, 0, 0).toISOString(), // Last week
      },
      {
        id: 'settle-earlier-this-month',
        settlementId: 'SET-MONTH-1',
        orderId: 'ORD-105',
        customerName: 'Eve',
        totalPaid: 650,
        foodSubtotal: 500,
        deliveryFee: 70,
        restaurantNetShare: 430,
        deliveryPartnerNetShare: 63,
        adminTotalRevenue: 157,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 5, 12, 0, 0).toISOString(), // Oct 5, 2026
      },
      {
        id: 'settle-earlier-this-year',
        settlementId: 'SET-YEAR-1',
        orderId: 'ORD-106',
        customerName: 'Frank',
        totalPaid: 300,
        foodSubtotal: 220,
        deliveryFee: 40,
        restaurantNetShare: 189.2,
        deliveryPartnerNetShare: 36,
        adminTotalRevenue: 74.8,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 2, 15, 14, 0, 0).toISOString(), // March 15, 2026
      },
      {
        id: 'settle-last-year',
        settlementId: 'SET-LAST-YEAR',
        orderId: 'ORD-107',
        customerName: 'Grace',
        totalPaid: 700,
        foodSubtotal: 600,
        deliveryFee: 60,
        restaurantNetShare: 516,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 130,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2025, 11, 20, 10, 0, 0).toISOString(), // Dec 20, 2025
      },
    ];

    it('returns all settlements when ALL filter is selected', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'ALL',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(7);
      expect(result.map((s) => s.id)).toEqual(settlements.map((s) => s.id));
    });

    it('filters settlements for TODAY only', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'TODAY',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('settle-today-1');
      expect(result[0].totalPaid).toBe(500);
      expect(result[0].adminTotalRevenue).toBe(102);
    });

    it('filters settlements for YESTERDAY only', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'YESTERDAY',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('settle-yesterday-1');
      expect(result[0].customerName).toBe('Bob');
    });

    it('filters settlements for THIS_WEEK (Monday through current day)', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'THIS_WEEK',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(3);
      const ids = result.map((s) => s.id);
      expect(ids).toContain('settle-today-1');
      expect(ids).toContain('settle-yesterday-1');
      expect(ids).toContain('settle-this-week-monday');
      expect(ids).not.toContain('settle-last-week');
    });

    it('filters settlements for THIS_MONTH (October 1 to current day)', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'THIS_MONTH',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(5);
      const ids = result.map((s) => s.id);
      expect(ids).toContain('settle-today-1');
      expect(ids).toContain('settle-yesterday-1');
      expect(ids).toContain('settle-this-week-monday');
      expect(ids).toContain('settle-last-week');
      expect(ids).toContain('settle-earlier-this-month');
      expect(ids).not.toContain('settle-earlier-this-year');
    });

    it('filters settlements for THIS_YEAR (Jan 1 to current day)', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'THIS_YEAR',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(result).toHaveLength(6);
      const ids = result.map((s) => s.id);
      expect(ids).not.toContain('settle-last-year');
    });

    it('filters settlements for CUSTOM date range inclusive of start and end date', () => {
      const result = filterRecordsByDateRange(
        settlements,
        'CUSTOM',
        (s) => s.settledAt,
        '2026-10-26',
        '2026-10-27',
        refDate
      );
      expect(result).toHaveLength(2);
      const ids = result.map((s) => s.id);
      expect(ids).toContain('settle-this-week-monday');
      expect(ids).toContain('settle-yesterday-1');
    });
  });

  describe('2. Restaurant Order Settlements Filtering', () => {
    const restaurantSettlements: RestaurantSettlementRecord[] = [
      {
        id: 'rs-today',
        restaurantId: 'rest-1',
        restaurantName: 'Pizza Hub',
        periodStart: '2026-10-28',
        periodEnd: '2026-10-28',
        totalOrdersCount: 15,
        totalSubtotal: 4500,
        totalCommission: 630,
        netPayoutAmount: 3870,
        status: 'DISBURSED',
        paidAt: new Date(2026, 9, 28, 11, 0, 0).toISOString(),
      },
      {
        id: 'rs-yesterday',
        restaurantId: 'rest-2',
        restaurantName: 'Burger King',
        periodStart: '2026-10-27',
        periodEnd: '2026-10-27',
        totalOrdersCount: 22,
        totalSubtotal: 6600,
        totalCommission: 924,
        netPayoutAmount: 5676,
        status: 'PENDING',
        paidAt: '2026-10-27 22:00:00',
      },
      {
        id: 'rs-last-month',
        restaurantId: 'rest-3',
        restaurantName: 'Taco Bell',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        totalOrdersCount: 80,
        totalSubtotal: 24000,
        totalCommission: 3360,
        netPayoutAmount: 20640,
        status: 'DISBURSED',
        paidAt: '2026-09-30T18:00:00Z',
      },
    ];

    it('filters restaurant settlements by paidAt fallback to periodEnd', () => {
      const todayResults = filterRecordsByDateRange(
        restaurantSettlements,
        'TODAY',
        (rs) => rs.paidAt || rs.periodEnd || rs.periodStart,
        undefined,
        undefined,
        refDate
      );
      expect(todayResults).toHaveLength(1);
      expect(todayResults[0].id).toBe('rs-today');
      expect(todayResults[0].netPayoutAmount).toBe(3870);

      const yesterdayResults = filterRecordsByDateRange(
        restaurantSettlements,
        'YESTERDAY',
        (rs) => rs.paidAt || rs.periodEnd || rs.periodStart,
        undefined,
        undefined,
        refDate
      );
      expect(yesterdayResults).toHaveLength(1);
      expect(yesterdayResults[0].id).toBe('rs-yesterday');
      expect(yesterdayResults[0].status).toBe('PENDING');
    });
  });

  describe('3. Audit Ledger Filtering', () => {
    const ledgerEntries: LedgerEntryRecord[] = [
      {
        id: 'LED-001',
        walletAccountId: 'PLATFORM-ESCROW',
        entryType: 'CREDIT',
        amount: 500,
        referenceType: 'ORDER_SETTLEMENT',
        referenceId: 'ORD-101',
        balanceAfter: 5000,
        createdAt: new Date(2026, 9, 28, 8, 0, 0).toISOString(),
      },
      {
        id: 'LED-002',
        walletAccountId: 'REST-001',
        entryType: 'CREDIT',
        amount: 344,
        referenceType: 'ORDER_SETTLEMENT',
        referenceId: 'ORD-101',
        balanceAfter: 12000,
        createdAt: new Date(2026, 9, 27, 14, 0, 0).toISOString(),
      },
      {
        id: 'LED-003',
        walletAccountId: 'DRIVER-001',
        entryType: 'DEBIT',
        amount: 500,
        referenceType: 'PAYOUT_DISBURSAL',
        referenceId: 'PO-001',
        balanceAfter: 1500,
        createdAt: new Date(2026, 8, 15, 10, 0, 0).toISOString(), // Sept 15
      },
    ];

    it('filters ledger entries without modifying ledger data', () => {
      const originalCopy = JSON.stringify(ledgerEntries);
      const thisMonthResults = filterRecordsByDateRange(
        ledgerEntries,
        'THIS_MONTH',
        (l) => l.createdAt,
        undefined,
        undefined,
        refDate
      );
      expect(thisMonthResults).toHaveLength(2);
      expect(thisMonthResults.map((l) => l.id)).toEqual(['LED-001', 'LED-002']);
      // Verify immutable
      expect(JSON.stringify(ledgerEntries)).toBe(originalCopy);
    });
  });

  describe('4. Restaurant & Delivery Partner Payouts Filtering', () => {
    const payouts: PayoutRecord[] = [
      {
        id: 'po-today',
        walletAccountId: 'ACC-1',
        amount: 2500,
        status: 'REQUESTED',
        createdAt: new Date(2026, 9, 28, 12, 0, 0).toISOString(),
      },
      {
        id: 'po-yesterday',
        walletAccountId: 'ACC-2',
        amount: 1500,
        status: 'COMPLETED',
        createdAt: new Date(2026, 9, 27, 9, 0, 0).toISOString(),
      },
      {
        id: 'po-old',
        walletAccountId: 'ACC-3',
        amount: 4000,
        status: 'COMPLETED',
        createdAt: new Date(2026, 7, 10, 10, 0, 0).toISOString(),
      },
    ];

    it('filters payouts by createdAt timestamp', () => {
      const todayResults = filterRecordsByDateRange(
        payouts,
        'TODAY',
        (p) => p.createdAt || p.updatedAt,
        undefined,
        undefined,
        refDate
      );
      expect(todayResults).toHaveLength(1);
      expect(todayResults[0].id).toBe('po-today');
      expect(todayResults[0].amount).toBe(2500);

      const yesterdayResults = filterRecordsByDateRange(
        payouts,
        'YESTERDAY',
        (p) => p.createdAt || p.updatedAt,
        undefined,
        undefined,
        refDate
      );
      expect(yesterdayResults).toHaveLength(1);
      expect(yesterdayResults[0].id).toBe('po-yesterday');
    });
  });

  describe('5. Edge cases and timestamp parser', () => {
    it('parses YYYY-MM-DD date strings safely', () => {
      const parsed = parseRecordTimestamp('2026-10-28');
      expect(parsed).not.toBeNull();
      const date = new Date(parsed!);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(9);
      expect(date.getDate()).toBe(28);
    });

    it('safely handles empty arrays and null timestamps', () => {
      expect(filterRecordsByDateRange([], 'TODAY', () => null)).toEqual([]);
      const records = [{ id: '1', date: null }, { id: '2', date: undefined }];
      expect(filterRecordsByDateRange(records, 'TODAY', (r) => r.date)).toEqual([]);
    });

    it('normalizes inverted custom date ranges automatically', () => {
      const records = [
        { id: '1', date: '2026-10-27T10:00:00Z' },
        { id: '2', date: '2026-10-28T10:00:00Z' },
      ];
      // User entered start as Oct 28 and end as Oct 27
      const result = filterRecordsByDateRange(
        records,
        'CUSTOM',
        (r) => r.date,
        '2026-10-28',
        '2026-10-27'
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('6. Executive Overview Filtering & Metric Recalculations', () => {
    const executiveSettlements: PaymentSettlementRecord[] = [
      {
        id: 'settle-today-1',
        settlementId: 'SET-TODAY-1',
        orderId: 'ORD-101',
        customerName: 'Alice',
        totalPaid: 500,
        foodSubtotal: 400,
        deliveryFee: 60,
        restaurantNetShare: 344,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 102,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 28, 10, 0, 0).toISOString(), // Today 10:00 AM
      },
      {
        id: 'settle-yesterday-1',
        settlementId: 'SET-YEST-1',
        orderId: 'ORD-102',
        customerName: 'Bob',
        totalPaid: 800,
        foodSubtotal: 700,
        deliveryFee: 60,
        restaurantNetShare: 602,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 144,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 27, 16, 0, 0).toISOString(), // Yesterday 4:00 PM (Tuesday)
      },
      {
        id: 'settle-this-week-monday',
        settlementId: 'SET-MON-1',
        orderId: 'ORD-103',
        customerName: 'Charlie',
        totalPaid: 1200,
        foodSubtotal: 1000,
        deliveryFee: 100,
        restaurantNetShare: 860,
        deliveryPartnerNetShare: 90,
        adminTotalRevenue: 250,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 26, 9, 0, 0).toISOString(), // Monday of this week
      },
      {
        id: 'settle-last-week',
        settlementId: 'SET-LAST-WK',
        orderId: 'ORD-104',
        customerName: 'Dave',
        totalPaid: 450,
        foodSubtotal: 350,
        deliveryFee: 60,
        restaurantNetShare: 301,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 95,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 20, 11, 0, 0).toISOString(), // Last week
      },
      {
        id: 'settle-earlier-this-month',
        settlementId: 'SET-MONTH-1',
        orderId: 'ORD-105',
        customerName: 'Eve',
        totalPaid: 650,
        foodSubtotal: 500,
        deliveryFee: 70,
        restaurantNetShare: 430,
        deliveryPartnerNetShare: 63,
        adminTotalRevenue: 157,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 5, 12, 0, 0).toISOString(), // Oct 5, 2026
      },
      {
        id: 'settle-earlier-this-year',
        settlementId: 'SET-YEAR-1',
        orderId: 'ORD-106',
        customerName: 'Frank',
        totalPaid: 300,
        foodSubtotal: 220,
        deliveryFee: 40,
        restaurantNetShare: 189.2,
        deliveryPartnerNetShare: 36,
        adminTotalRevenue: 74.8,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 2, 15, 14, 0, 0).toISOString(), // March 15, 2026
      },
      {
        id: 'settle-last-year',
        settlementId: 'SET-LAST-YEAR',
        orderId: 'ORD-107',
        customerName: 'Grace',
        totalPaid: 700,
        foodSubtotal: 600,
        deliveryFee: 60,
        restaurantNetShare: 516,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 130,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2025, 11, 20, 10, 0, 0).toISOString(), // Dec 20, 2025
      },
    ];

    it('ensures Executive Overview filter options include ONLY Today, This Week, This Month, This Year, Custom Date Range', () => {
      const allowedOptions = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'CUSTOM'];
      // Verify YESTERDAY and ALL are strictly omitted
      expect(allowedOptions).not.toContain('YESTERDAY');
      expect(allowedOptions).not.toContain('ALL');
      expect(allowedOptions).toHaveLength(5);
    });

    it('recalculates all 4 financial metrics accurately for TODAY', () => {
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'TODAY',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(1);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(500);
      expect(totalAdminNetRevenue).toBe(102);
      expect(totalDistributedToRestaurants).toBe(344);
      expect(totalDistributedToDrivers).toBe(54);
    });

    it('recalculates all 4 financial metrics accurately for THIS_WEEK', () => {
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'THIS_WEEK',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(3);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(2500);
      expect(totalAdminNetRevenue).toBe(496);
      expect(totalDistributedToRestaurants).toBe(1806);
      expect(totalDistributedToDrivers).toBe(198);
    });

    it('recalculates all 4 financial metrics accurately for THIS_MONTH', () => {
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'THIS_MONTH',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(5);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(3600);
      expect(totalAdminNetRevenue).toBe(748);
      expect(totalDistributedToRestaurants).toBe(2537);
      expect(totalDistributedToDrivers).toBe(315);
    });

    it('recalculates all 4 financial metrics accurately for THIS_YEAR', () => {
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'THIS_YEAR',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(6);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(3900);
      expect(Number(totalAdminNetRevenue.toFixed(1))).toBe(822.8);
      expect(Number(totalDistributedToRestaurants.toFixed(1))).toBe(2726.2);
      expect(totalDistributedToDrivers).toBe(351);
    });

    it('recalculates all 4 financial metrics accurately for CUSTOM date range', () => {
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'CUSTOM',
        (s) => s.settledAt,
        '2026-10-26',
        '2026-10-27',
        refDate
      );
      expect(filtered).toHaveLength(2);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(2000);
      expect(totalAdminNetRevenue).toBe(394);
      expect(totalDistributedToRestaurants).toBe(1462);
      expect(totalDistributedToDrivers).toBe(144);
    });

    it('gracefully handles empty filter results with 0 for all metrics', () => {
      // Range where no settlements exist (e.g. year 2020)
      const filtered = filterRecordsByDateRange(
        executiveSettlements,
        'CUSTOM',
        (s) => s.settledAt,
        '2020-01-01',
        '2020-01-31',
        refDate
      );
      expect(filtered).toHaveLength(0);

      const totalAdminEscrowPaid = filtered.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
      const totalAdminNetRevenue = filtered.reduce((acc, s) => acc + (s.adminTotalRevenue || 0), 0);
      const totalDistributedToRestaurants = filtered.reduce((acc, s) => acc + (s.restaurantNetShare || 0), 0);
      const totalDistributedToDrivers = filtered.reduce((acc, s) => acc + (s.deliveryPartnerNetShare || 0), 0);

      expect(totalAdminEscrowPaid).toBe(0);
      expect(totalAdminNetRevenue).toBe(0);
      expect(totalDistributedToRestaurants).toBe(0);
      expect(totalDistributedToDrivers).toBe(0);
    });

    it('validates custom date range where From date is later than To date', () => {
      const startDate = '2026-10-28';
      const endDate = '2026-10-20';
      const isInvalid = startDate > endDate;
      expect(isInvalid).toBe(true);
    });
  });

  describe('7. Admin Earnings Filtering & Net Revenue Breakdown', () => {
    const earningsSettlements: PaymentSettlementRecord[] = [
      {
        id: 'earn-today-1',
        settlementId: 'SET-EARN-1',
        orderId: 'ORD-EARN-1',
        customerName: 'Aarav',
        totalPaid: 620,
        foodSubtotal: 500,
        deliveryFee: 80,
        platformFee: 40,
        restaurantNetShare: 430,
        deliveryPartnerNetShare: 72,
        adminTotalRevenue: 118,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 28, 11, 0, 0).toISOString(), // Today
      },
      {
        id: 'earn-yest-1',
        settlementId: 'SET-EARN-2',
        orderId: 'ORD-EARN-2',
        customerName: 'Bhavna',
        totalPaid: 740,
        foodSubtotal: 600,
        deliveryFee: 100,
        platformFee: 40,
        restaurantFoodCommission: 84, // Pre-computed
        deliveryPartnerCommission: 10, // Pre-computed
        adminTotalRevenue: 134,
        restaurantNetShare: 516,
        deliveryPartnerNetShare: 90,
        settlementStatus: 'COMPLETED',
        settledAt: new Date(2026, 9, 27, 15, 0, 0).toISOString(), // Yesterday
      },
      {
        id: 'earn-mon-1',
        settlementId: 'SET-EARN-3',
        orderId: 'ORD-EARN-3',
        customerName: 'Chetan',
        totalPaid: 450,
        foodSubtotal: 0,
        deliveryFee: 0,
        platformFee: 40,
        // foodSubtotal missing/0, but restaurantNetShare = 344 (86%)
        restaurantNetShare: 344,
        deliveryPartnerNetShare: 54, // 90% of 60
        adminTotalRevenue: 102,
        settlementStatus: 'SETTLED',
        settledAt: new Date(2026, 9, 26, 9, 30, 0).toISOString(), // Monday of this week
      },
      {
        id: 'earn-last-wk',
        settlementId: 'SET-EARN-4',
        orderId: 'ORD-EARN-4',
        customerName: 'Divya',
        totalPaid: 1140,
        foodSubtotal: 1000,
        deliveryFee: 100,
        platformFee: 40,
        restaurantNetShare: 860,
        deliveryPartnerNetShare: 90,
        adminTotalRevenue: 190,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 9, 20, 14, 0, 0).toISOString(), // Last week (Oct 20)
      },
      {
        id: 'earn-earlier-year',
        settlementId: 'SET-EARN-5',
        orderId: 'ORD-EARN-5',
        customerName: 'Farhan',
        totalPaid: 350,
        foodSubtotal: 250,
        deliveryFee: 60,
        platformFee: 40,
        restaurantNetShare: 215,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 75,
        settlementStatus: 'FUNDS_DISTRIBUTED',
        settledAt: new Date(2026, 2, 10, 10, 0, 0).toISOString(), // March 2026
      },
      {
        id: 'earn-cancelled',
        settlementId: 'SET-EARN-6',
        orderId: 'ORD-EARN-6',
        customerName: 'Gita',
        totalPaid: 500,
        foodSubtotal: 400,
        deliveryFee: 60,
        platformFee: 40,
        restaurantNetShare: 344,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 102,
        settlementStatus: 'CANCELLED',
        settledAt: new Date(2026, 9, 28, 12, 0, 0).toISOString(), // Today but cancelled
      },
      {
        id: 'earn-failed',
        settlementId: 'SET-EARN-7',
        orderId: 'ORD-EARN-7',
        customerName: 'Harish',
        totalPaid: 600,
        foodSubtotal: 500,
        deliveryFee: 60,
        platformFee: 40,
        restaurantNetShare: 430,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 116,
        settlementStatus: 'FAILED',
        settledAt: new Date(2026, 9, 28, 13, 0, 0).toISOString(), // Today but failed
      },
      {
        id: 'earn-refunded',
        settlementId: 'SET-EARN-8',
        orderId: 'ORD-EARN-8',
        customerName: 'Ishaan',
        totalPaid: 700,
        foodSubtotal: 600,
        deliveryFee: 60,
        platformFee: 40,
        restaurantNetShare: 516,
        deliveryPartnerNetShare: 54,
        adminTotalRevenue: 130,
        settlementStatus: 'REFUNDED',
        settledAt: new Date(2026, 9, 28, 13, 30, 0).toISOString(), // Today but refunded
      },
    ];

    it('calculates 14% food commission, 10% delivery commission, and ₹40 fixed fee via calculateSettlementEarnings', () => {
      const breakdown = calculateSettlementEarnings(earningsSettlements[0]);
      // 14% of 500 = 70.00
      expect(breakdown.foodCommission).toBe(70);
      // 10% of 80 = 8.00
      expect(breakdown.deliveryCommission).toBe(8);
      // Fixed fee = 40.00
      expect(breakdown.platformFee).toBe(40);
      // Total net revenue = 70 + 8 + 40 = 118.00
      expect(breakdown.adminTotalRevenue).toBe(118);
    });

    it('uses explicit commissions when present on settlement record', () => {
      const breakdown = calculateSettlementEarnings(earningsSettlements[1]);
      expect(breakdown.foodCommission).toBe(84);
      expect(breakdown.deliveryCommission).toBe(10);
      expect(breakdown.platformFee).toBe(40);
      expect(breakdown.adminTotalRevenue).toBe(134);
    });

    it('derives commissions from restaurant and delivery net shares when subtotals are missing', () => {
      const breakdown = calculateSettlementEarnings(earningsSettlements[2]);
      // restaurantNetShare 344 is 86%, so 344 * 14 / 86 = 56.00
      expect(breakdown.foodCommission).toBe(56);
      // deliveryPartnerNetShare 54 is 90%, so 54 * 10 / 90 = 6.00
      expect(breakdown.deliveryCommission).toBe(6);
      expect(breakdown.platformFee).toBe(40);
      expect(breakdown.adminTotalRevenue).toBe(102);
    });

    it('excludes CANCELLED, FAILED, and REFUNDED settlements from revenue calculations to prevent double counting', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      expect(eligible).toHaveLength(5);
      expect(eligible.some((s) => s.id === 'earn-cancelled')).toBe(false);
      expect(eligible.some((s) => s.id === 'earn-failed')).toBe(false);
      expect(eligible.some((s) => s.id === 'earn-refunded')).toBe(false);
    });

    it('calculates revenue breakdown correctly for TODAY', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      const filtered = filterRecordsByDateRange(
        eligible,
        'TODAY',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('earn-today-1');

      const breakdowns = filtered.map((s) => calculateSettlementEarnings(s));
      const totalFoodCommission = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliveryCommission = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalPlatformFees = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);
      const totalNetPlatformRevenue = totalFoodCommission + totalDeliveryCommission + totalPlatformFees;

      expect(totalFoodCommission).toBe(70);
      expect(totalDeliveryCommission).toBe(8);
      expect(totalPlatformFees).toBe(40);
      expect(totalNetPlatformRevenue).toBe(118);
    });

    it('calculates revenue breakdown correctly for THIS_WEEK (Monday through Wednesday)', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      const filtered = filterRecordsByDateRange(
        eligible,
        'THIS_WEEK',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      // Today (Wed), Yesterday (Tue), Mon -> 3 settlements
      expect(filtered).toHaveLength(3);

      const breakdowns = filtered.map((s) => calculateSettlementEarnings(s));
      const totalFoodCommission = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliveryCommission = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalPlatformFees = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);
      const totalNetPlatformRevenue = totalFoodCommission + totalDeliveryCommission + totalPlatformFees;

      // 70 + 84 + 56 = 210
      expect(totalFoodCommission).toBe(210);
      // 8 + 10 + 6 = 24
      expect(totalDeliveryCommission).toBe(24);
      // 40 * 3 = 120
      expect(totalPlatformFees).toBe(120);
      // 210 + 24 + 120 = 354
      expect(totalNetPlatformRevenue).toBe(354);
    });

    it('calculates revenue breakdown correctly for THIS_MONTH', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      const filtered = filterRecordsByDateRange(
        eligible,
        'THIS_MONTH',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      // Today, Yest, Mon, Oct 20 (last week) -> 4 settlements
      expect(filtered).toHaveLength(4);

      const breakdowns = filtered.map((s) => calculateSettlementEarnings(s));
      const totalFoodCommission = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliveryCommission = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalPlatformFees = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);

      // 210 + 140 = 350
      expect(totalFoodCommission).toBe(350);
      // 24 + 10 = 34
      expect(totalDeliveryCommission).toBe(34);
      // 40 * 4 = 160
      expect(totalPlatformFees).toBe(160);
      expect(totalFoodCommission + totalDeliveryCommission + totalPlatformFees).toBe(544);
    });

    it('calculates revenue breakdown correctly for THIS_YEAR', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      const filtered = filterRecordsByDateRange(
        eligible,
        'THIS_YEAR',
        (s) => s.settledAt,
        undefined,
        undefined,
        refDate
      );
      expect(filtered).toHaveLength(5);
    });

    it('calculates revenue breakdown for CUSTOM date range and handles 0 results gracefully without NaN', () => {
      const eligible = earningsSettlements.filter(
        (s) => s.settlementStatus !== 'FAILED' && s.settlementStatus !== 'CANCELLED' && s.settlementStatus !== 'REFUNDED'
      );
      const filtered = filterRecordsByDateRange(
        eligible,
        'CUSTOM',
        (s) => s.settledAt,
        '2021-01-01',
        '2021-01-31',
        refDate
      );
      expect(filtered).toHaveLength(0);

      const breakdowns = filtered.map((s) => calculateSettlementEarnings(s));
      const totalFoodCommission = breakdowns.reduce((acc, b) => acc + b.foodCommission, 0);
      const totalDeliveryCommission = breakdowns.reduce((acc, b) => acc + b.deliveryCommission, 0);
      const totalPlatformFees = breakdowns.reduce((acc, b) => acc + b.platformFee, 0);

      expect(totalFoodCommission).toBe(0);
      expect(totalDeliveryCommission).toBe(0);
      expect(totalPlatformFees).toBe(0);
      expect(Number.isNaN(totalFoodCommission)).toBe(false);
      expect(Number.isNaN(totalDeliveryCommission)).toBe(false);
      expect(Number.isNaN(totalPlatformFees)).toBe(false);
    });
  });

  describe('8. Refunds & Reversals Filtering, Sorting & Pagination', () => {
    const mockRefunds: CancelledOrderRefundRequest[] = [
      {
        id: 'ref-1',
        orderId: 'ORD-REF-1',
        orderNumber: '#001',
        customerId: 'CUST-1',
        customerName: 'Aarav Sharma',
        paymentUuid: 'pay-uuid-1',
        amount: 250,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Restaurant took too long',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date(2026, 9, 28, 10, 0, 0).toISOString(), // Today
        status: 'PENDING_APPROVAL',
      },
      {
        id: 'ref-2',
        orderId: 'ORD-REF-2',
        orderNumber: '#002',
        customerId: 'CUST-2',
        customerName: 'Bhavna Patel',
        paymentUuid: 'pay-uuid-2',
        amount: 500,
        paymentMethod: 'ONLINE (CASHFREE NETBANKING)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Wrong address entered',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date(2026, 9, 27, 16, 30, 0).toISOString(), // Yesterday
        reviewedAt: new Date(2026, 9, 27, 17, 0, 0).toISOString(),
        status: 'APPROVED',
      },
      {
        id: 'ref-3',
        orderId: 'ORD-REF-3',
        orderNumber: '#003',
        customerId: 'CUST-3',
        customerName: 'Chetan Kumar',
        paymentUuid: 'pay-uuid-3',
        amount: 150,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Duplicate order placed',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date(2026, 9, 26, 11, 0, 0).toISOString(), // Monday of this week
        reviewedAt: new Date(2026, 9, 26, 11, 30, 0).toISOString(),
        status: 'REJECTED',
      },
      {
        id: 'ref-4',
        orderId: 'ORD-REF-4',
        orderNumber: '#004',
        customerId: 'CUST-4',
        customerName: 'Divya Nair',
        paymentUuid: 'pay-uuid-4',
        amount: 320,
        paymentMethod: 'ONLINE (CASHFREE CARDS)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Item unavailable at restaurant',
        cancelledBy: 'RESTAURANT',
        cancelledAt: new Date(2026, 9, 20, 14, 0, 0).toISOString(), // Oct 20 (This Month)
        status: 'PENDING_APPROVAL',
      },
      {
        id: 'ref-5',
        orderId: 'ORD-REF-5',
        orderNumber: '#005',
        customerId: 'CUST-5',
        customerName: 'Esha Verma',
        paymentUuid: 'pay-uuid-5',
        amount: 450,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Order delayed beyond 60 mins',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date(2026, 9, 5, 9, 0, 0).toISOString(), // Oct 5 (This Month)
        reviewedAt: new Date(2026, 9, 5, 10, 0, 0).toISOString(),
        status: 'REFUNDED',
      },
      {
        id: 'ref-6',
        orderId: 'ORD-REF-6',
        orderNumber: '#006',
        customerId: 'CUST-6',
        customerName: 'Farhan Ali',
        paymentUuid: 'pay-uuid-6',
        amount: 800,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Accidental payment',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date(2026, 3, 10, 12, 0, 0).toISOString(), // April 2026 (This Year)
        reviewedAt: new Date(2026, 3, 10, 13, 0, 0).toISOString(),
        status: 'APPROVED',
      },
      {
        id: 'ref-7',
        orderId: 'ORD-REF-7',
        orderNumber: '#007',
        customerId: 'CUST-7',
        customerName: 'Geeta Sen',
        paymentUuid: 'pay-uuid-7',
        amount: 180,
        paymentMethod: 'ONLINE (CASHFREE UPI)',
        isOnlinePayment: true,
        gatewayProvider: 'CASHFREE',
        cancellationReason: 'Delivery partner not assigned',
        cancelledBy: 'ADMIN',
        cancelledAt: new Date(2026, 9, 28, 12, 0, 0).toISOString(), // Today
        status: 'PENDING_APPROVAL',
      },
    ];

    it('filters refunds by initiation timestamp (cancelledAt) so pending refunds without reviewedAt are preserved', () => {
      const todayRefunds = filterRecordsByDateRange(
        mockRefunds,
        'TODAY',
        (r) => r.cancelledAt,
        undefined,
        undefined,
        refDate
      );
      expect(todayRefunds).toHaveLength(2);
      expect(todayRefunds.map((r) => r.id)).toEqual(['ref-1', 'ref-7']);
      // Both are pending approval and do not have reviewedAt
      expect(todayRefunds.every((r) => r.status === 'PENDING_APPROVAL')).toBe(true);
      expect(todayRefunds.every((r) => !r.reviewedAt)).toBe(true);
    });

    it('filters refunds accurately for THIS_WEEK (Monday through Wednesday)', () => {
      const thisWeekRefunds = filterRecordsByDateRange(
        mockRefunds,
        'THIS_WEEK',
        (r) => r.cancelledAt,
        undefined,
        undefined,
        refDate
      );
      // ref-1 (today), ref-7 (today), ref-2 (yesterday), ref-3 (monday)
      expect(thisWeekRefunds).toHaveLength(4);
      expect(thisWeekRefunds.map((r) => r.id).sort()).toEqual(['ref-1', 'ref-2', 'ref-3', 'ref-7'].sort());
    });

    it('filters refunds accurately for THIS_MONTH', () => {
      const thisMonthRefunds = filterRecordsByDateRange(
        mockRefunds,
        'THIS_MONTH',
        (r) => r.cancelledAt,
        undefined,
        undefined,
        refDate
      );
      // ref-1, ref-2, ref-3, ref-4, ref-5, ref-7 (all October)
      expect(thisMonthRefunds).toHaveLength(6);
      expect(thisMonthRefunds.some((r) => r.id === 'ref-6')).toBe(false); // April is excluded
    });

    it('calculates top KPI summary cards accurately over filtered records', () => {
      const thisWeekRefunds = filterRecordsByDateRange(
        mockRefunds,
        'THIS_WEEK',
        (r) => r.cancelledAt,
        undefined,
        undefined,
        refDate
      );

      const pendingList = thisWeekRefunds.filter((r) => r.status === 'PENDING_APPROVAL');
      const pendingCount = pendingList.length;
      const pendingAmount = pendingList.reduce((acc, r) => acc + (r.amount || 0), 0);

      const processedList = thisWeekRefunds.filter(
        (r) => r.status === 'APPROVED' || r.status === 'REFUNDED'
      );
      const processedCount = processedList.length;
      const processedAmount = processedList.reduce((acc, r) => acc + (r.amount || 0), 0);

      expect(pendingCount).toBe(2);
      expect(pendingAmount).toBe(430); // 250 + 180

      expect(processedCount).toBe(1);
      expect(processedAmount).toBe(500); // 500
    });

    it('sorts refunds correctly by DATE_DESC, DATE_ASC, AMOUNT_DESC, and AMOUNT_ASC', () => {
      // DATE_DESC (newest first)
      const sortedDateDesc = [...mockRefunds].sort((a, b) => {
        const timeA = new Date(a.cancelledAt).getTime();
        const timeB = new Date(b.cancelledAt).getTime();
        return timeB - timeA;
      });
      expect(sortedDateDesc[0].id).toBe('ref-7'); // Today 12:00
      expect(sortedDateDesc[sortedDateDesc.length - 1].id).toBe('ref-6'); // April

      // DATE_ASC (oldest first)
      const sortedDateAsc = [...mockRefunds].sort((a, b) => {
        const timeA = new Date(a.cancelledAt).getTime();
        const timeB = new Date(b.cancelledAt).getTime();
        return timeA - timeB;
      });
      expect(sortedDateAsc[0].id).toBe('ref-6'); // April

      // AMOUNT_DESC (highest first)
      const sortedAmountDesc = [...mockRefunds].sort((a, b) => (b.amount || 0) - (a.amount || 0));
      expect(sortedAmountDesc[0].amount).toBe(800);
      expect(sortedAmountDesc[sortedAmountDesc.length - 1].amount).toBe(150);

      // AMOUNT_ASC (lowest first)
      const sortedAmountAsc = [...mockRefunds].sort((a, b) => (a.amount || 0) - (b.amount || 0));
      expect(sortedAmountAsc[0].amount).toBe(150);
      expect(sortedAmountAsc[sortedAmountAsc.length - 1].amount).toBe(800);
    });

    it('paginates records properly with 5 items per page', () => {
      const itemsPerPage = 5;
      const totalPages = Math.ceil(mockRefunds.length / itemsPerPage);
      expect(totalPages).toBe(2);

      const page1 = mockRefunds.slice(0, itemsPerPage);
      const page2 = mockRefunds.slice(itemsPerPage, itemsPerPage * 2);

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(2);
      expect([...page1, ...page2]).toHaveLength(7);
    });
  });
});
