import {
  filterRecordsByDateRange,
  parseRecordTimestamp,
  PaymentSettlementRecord,
  RestaurantSettlementRecord,
  LedgerEntryRecord,
  PayoutRecord,
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
});
