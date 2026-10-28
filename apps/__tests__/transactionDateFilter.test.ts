import {
  filterTransactionsByDateRange,
  PaymentTransactionRecord,
  TransactionDateFilter,
} from '../features/payments/types';

describe('Transaction Date Filtering System', () => {
  // Fixed reference date: Wednesday, October 28, 2026, 14:30:00 (Local Time)
  const refDate = new Date(2026, 9, 28, 14, 30, 0); // Month is 0-indexed: 9 = October

  const sampleTransactions: PaymentTransactionRecord[] = [
    {
      id: 'tx-today-1',
      orderId: 'ORD-TODAY-1',
      userId: 'user-1',
      amount: 450,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_123',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 28, 9, 15, 0).toISOString(), // Today morning
    },
    {
      id: 'tx-today-2',
      orderId: 'ORD-TODAY-2',
      userId: 'user-2',
      amount: 850,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_124',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 28, 23, 45, 0).toISOString(), // Today night (end of day)
    },
    {
      id: 'tx-yesterday',
      orderId: 'ORD-YESTERDAY',
      userId: 'user-3',
      amount: 320,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_125',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 27, 18, 0, 0).toISOString(), // Yesterday (Tuesday, within this week)
    },
    {
      id: 'tx-monday',
      orderId: 'ORD-MONDAY',
      userId: 'user-4',
      amount: 600,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_126',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 26, 0, 1, 0).toISOString(), // Monday of this week
    },
    {
      id: 'tx-last-week-sun',
      orderId: 'ORD-LAST-WEEK',
      userId: 'user-5',
      amount: 510,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_127',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 25, 23, 50, 0).toISOString(), // Previous Sunday (outside this week)
    },
    {
      id: 'tx-earlier-this-month',
      orderId: 'ORD-EARLY-OCT',
      userId: 'user-6',
      amount: 990,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_128',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 9, 2, 12, 0, 0).toISOString(), // Oct 2, 2026 (this month, not this week)
    },
    {
      id: 'tx-last-month',
      orderId: 'ORD-LAST-MONTH',
      userId: 'user-7',
      amount: 400,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_129',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2026, 8, 30, 20, 0, 0).toISOString(), // September 30, 2026 (this year, not this month)
    },
    {
      id: 'tx-last-year',
      orderId: 'ORD-LAST-YEAR',
      userId: 'user-8',
      amount: 720,
      currency: 'INR',
      paymentMethod: 'CASHFREE_UPI',
      status: 'COMPLETED',
      gatewayTransactionId: 'pay_130',
      gatewayName: 'CASHFREE',
      createdAt: new Date(2025, 11, 20, 10, 0, 0).toISOString(), // Dec 20, 2025 (last year)
    },
  ];

  it('All Transactions returns all transactions without filtering', () => {
    const result = filterTransactionsByDateRange(sampleTransactions, 'ALL', undefined, undefined, refDate);
    expect(result).toHaveLength(8);
  });

  it('Today returns only transactions created on the reference date', () => {
    const result = filterTransactionsByDateRange(sampleTransactions, 'TODAY', undefined, undefined, refDate);
    const ids = result.map((tx) => tx.id);
    expect(ids).toEqual(['tx-today-1', 'tx-today-2']);
  });

  it('This Week returns transactions from Monday to Sunday of the current week', () => {
    // Current week: Monday Oct 26 to Sunday Nov 1
    const result = filterTransactionsByDateRange(sampleTransactions, 'THIS_WEEK', undefined, undefined, refDate);
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain('tx-today-1');
    expect(ids).toContain('tx-today-2');
    expect(ids).toContain('tx-yesterday');
    expect(ids).toContain('tx-monday');
    expect(ids).not.toContain('tx-last-week-sun');
    expect(ids).not.toContain('tx-earlier-this-month');
    expect(ids).toHaveLength(4);
  });

  it('This Month returns transactions from the 1st to the last day of the current month', () => {
    // October 2026
    const result = filterTransactionsByDateRange(sampleTransactions, 'THIS_MONTH', undefined, undefined, refDate);
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain('tx-today-1');
    expect(ids).toContain('tx-today-2');
    expect(ids).toContain('tx-yesterday');
    expect(ids).toContain('tx-monday');
    expect(ids).toContain('tx-last-week-sun');
    expect(ids).toContain('tx-earlier-this-month');
    expect(ids).not.toContain('tx-last-month');
    expect(ids).not.toContain('tx-last-year');
    expect(ids).toHaveLength(6);
  });

  it('This Year returns transactions within the current calendar year', () => {
    // Year 2026
    const result = filterTransactionsByDateRange(sampleTransactions, 'THIS_YEAR', undefined, undefined, refDate);
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain('tx-last-month');
    expect(ids).not.toContain('tx-last-year');
    expect(ids).toHaveLength(7);
  });

  it('Custom Date Range includes transactions on start date and the entire end date', () => {
    // Custom range: Oct 26, 2026 to Oct 27, 2026
    const result = filterTransactionsByDateRange(
      sampleTransactions,
      'CUSTOM',
      '2026-10-26',
      '2026-10-27',
      refDate
    );
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain('tx-monday'); // Oct 26
    expect(ids).toContain('tx-yesterday'); // Oct 27 at 18:00
    expect(ids).not.toContain('tx-today-1'); // Oct 28
    expect(ids).not.toContain('tx-last-week-sun'); // Oct 25
    expect(ids).toHaveLength(2);
  });

  it('Custom Date Range with only start date filters from start date onwards', () => {
    const result = filterTransactionsByDateRange(
      sampleTransactions,
      'CUSTOM',
      '2026-10-28',
      '',
      refDate
    );
    const ids = result.map((tx) => tx.id);
    expect(ids).toEqual(['tx-today-1', 'tx-today-2']);
  });

  it('Custom Date Range with only end date filters up to the entire end date', () => {
    const result = filterTransactionsByDateRange(
      sampleTransactions,
      'CUSTOM',
      '',
      '2026-09-30',
      refDate
    );
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain('tx-last-month');
    expect(ids).toContain('tx-last-year');
    expect(ids).toHaveLength(2);
  });

  it('returns an empty array when no transactions match the selected date range', () => {
    const result = filterTransactionsByDateRange(
      sampleTransactions,
      'CUSTOM',
      '2024-01-01',
      '2024-01-31',
      refDate
    );
    expect(result).toHaveLength(0);
  });

  it('safely handles empty transaction arrays and invalid dates', () => {
    expect(filterTransactionsByDateRange([], 'TODAY', undefined, undefined, refDate)).toHaveLength(0);

    const corruptTx: PaymentTransactionRecord[] = [
      {
        id: 'tx-invalid',
        orderId: 'ORD-INVALID',
        userId: 'u',
        amount: 100,
        currency: 'INR',
        paymentMethod: 'CASHFREE',
        status: 'COMPLETED',
        gatewayTransactionId: 'g',
        gatewayName: 'CASHFREE',
        createdAt: 'invalid-date-string',
      },
    ];
    expect(filterTransactionsByDateRange(corruptTx, 'TODAY', undefined, undefined, refDate)).toHaveLength(0);
    expect(filterTransactionsByDateRange(corruptTx, 'ALL', undefined, undefined, refDate)).toHaveLength(1);
  });
});
