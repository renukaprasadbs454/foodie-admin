import React from 'react';
import {
  getDashboardPresetRange,
  getPreviousPeriodRange,
  validateDateRange,
  formatCount,
  formatMoneyInr,
  defaultDateRange,
  calculatePercentageChange,
  parseTrendIndicator,
} from '../features/analytics/types';

describe('Dashboard Summary Controls & State Logic Verification', () => {
  const refDate = new Date(2026, 9, 31, 10, 0, 0); // Saturday, Oct 31, 2026

  describe('A. Analytics Timeframe Presets', () => {
    it('calculates "Today" preset correctly', () => {
      const range = getDashboardPresetRange('Today', refDate);
      expect(range.dateFrom).toBe('2026-10-31');
      expect(range.dateTo).toBe('2026-10-31');
    });

    it('calculates "Yesterday" preset correctly', () => {
      const range = getDashboardPresetRange('Yesterday', refDate);
      expect(range.dateFrom).toBe('2026-10-30');
      expect(range.dateTo).toBe('2026-10-30');
    });

    it('calculates "Last 7 Days" preset correctly', () => {
      const range = getDashboardPresetRange('Last 7 Days', refDate);
      expect(range.dateFrom).toBe('2026-10-25');
      expect(range.dateTo).toBe('2026-10-31');
    });

    it('calculates "Last 30 Days" preset correctly', () => {
      const range = getDashboardPresetRange('Last 30 Days', refDate);
      expect(range.dateFrom).toBe('2026-10-02');
      expect(range.dateTo).toBe('2026-10-31');
    });

    it('calculates "This Month" preset correctly', () => {
      const range = getDashboardPresetRange('This Month', refDate);
      expect(range.dateFrom).toBe('2026-10-01');
      expect(range.dateTo).toBe('2026-10-31');
    });

    it('switches between presets repeatedly with deterministic ranges', () => {
      const presets = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'];
      for (const p of presets) {
        const r1 = getDashboardPresetRange(p, refDate);
        const r2 = getDashboardPresetRange(p, refDate);
        expect(r1).toEqual(r2);
        expect(r1.dateFrom <= r1.dateTo).toBe(true);
      }
    });
  });

  describe('B. Custom Date Range Validation and Boundary Handling', () => {
    it('accepts valid date range where dateFrom <= dateTo', () => {
      const res = validateDateRange('2026-10-01', '2026-10-15');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.range.dateFrom).toBe('2026-10-01');
        expect(res.range.dateTo).toBe('2026-10-15');
      }
    });

    it('accepts same-day custom range (dateFrom === dateTo)', () => {
      const res = validateDateRange('2026-10-15', '2026-10-15');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.range.dateFrom).toBe('2026-10-15');
        expect(res.range.dateTo).toBe('2026-10-15');
      }
    });

    it('rejects inverted range where dateFrom > dateTo', () => {
      const res = validateDateRange('2026-10-20', '2026-10-10');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.message).toBe('dateFrom must be on or before dateTo.');
      }
    });

    it('rejects empty or missing dates', () => {
      expect(validateDateRange('', '2026-10-15').ok).toBe(false);
      expect(validateDateRange('2026-10-01', '').ok).toBe(false);
      expect(validateDateRange('', '').ok).toBe(false);
    });

    it('rejects non-ISO malformed dates', () => {
      expect(validateDateRange('15-10-2026', '2026-10-20').ok).toBe(false);
      expect(validateDateRange('2026/10/01', '2026/10/15').ok).toBe(false);
      expect(validateDateRange('invalid', '2026-10-15').ok).toBe(false);
    });
  });

  describe('C. Dashboard Summary KPI Data Formatting', () => {
    it('formats counts properly with zero and non-zero numbers', () => {
      expect(formatCount(15)).toBe('15');
      expect(formatCount(0)).toBe('0');
      expect(formatCount(12)).toBe('12');
      expect(formatCount(null)).toBe('—');
      expect(formatCount(undefined)).toBe('—');
    });

    it('formats money values correctly in INR with 2 decimal places', () => {
      expect(formatMoneyInr(5386)).toBe('₹5386.00');
      expect(formatMoneyInr(359.07)).toBe('₹359.07');
      expect(formatMoneyInr(0)).toBe('₹0.00');
      expect(formatMoneyInr(null)).toBe('₹—');
      expect(formatMoneyInr(undefined)).toBe('₹—');
    });
  });

  describe('D. Daily Sales Telemetry Sorting and Safety', () => {
    it('sorts daily sales points chronologically', () => {
      const unsorted = [
        { date: '2026-10-28', orderCount: 1, revenue: 289 },
        { date: '2026-10-22', orderCount: 6, revenue: 1674 },
        { date: '2026-10-27', orderCount: 8, revenue: 3423 },
      ];

      const sorted = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
      expect(sorted[0].date).toBe('2026-10-22');
      expect(sorted[1].date).toBe('2026-10-27');
      expect(sorted[2].date).toBe('2026-10-28');
    });

    it('calculates 15% platform commission correctly', () => {
      const revenue = 1674;
      const commission = Math.round(revenue * 0.15 * 100) / 100;
      expect(commission).toBe(251.1);
    });
  });

  describe('E. Previous Comparison Period Calculation (getPreviousPeriodRange)', () => {
    it('calculates previous 7-day period for Last 7 Days (2026-10-22 to 2026-10-28)', () => {
      const current = { dateFrom: '2026-10-22', dateTo: '2026-10-28' };
      const prev = getPreviousPeriodRange(current);
      expect(prev.dateFrom).toBe('2026-10-15');
      expect(prev.dateTo).toBe('2026-10-21');
    });

    it('calculates previous day for Today (2026-10-31 to 2026-10-31)', () => {
      const current = { dateFrom: '2026-10-31', dateTo: '2026-10-31' };
      const prev = getPreviousPeriodRange(current);
      expect(prev.dateFrom).toBe('2026-10-30');
      expect(prev.dateTo).toBe('2026-10-30');
    });

    it('calculates previous 30-day period for Last 30 Days (2026-10-02 to 2026-10-31)', () => {
      const current = { dateFrom: '2026-10-02', dateTo: '2026-10-31' };
      const prev = getPreviousPeriodRange(current);
      expect(prev.dateTo).toBe('2026-10-01');
      expect(prev.dateFrom).toBe('2026-09-02');
    });

    it('calculates previous period for arbitrary custom range', () => {
      const current = { dateFrom: '2026-10-10', dateTo: '2026-10-14' }; // 5 days
      const prev = getPreviousPeriodRange(current);
      expect(prev.dateTo).toBe('2026-10-09');
      expect(prev.dateFrom).toBe('2026-10-05'); // 5 days: Oct 5, 6, 7, 8, 9
    });
  });

  describe('F. Accurate Percentage Change & Trend Resolution (calculatePercentageChange)', () => {
    it('calculates positive change correctly (+15.4% for 15 vs 13)', () => {
      const trend = calculatePercentageChange(15, 13);
      expect(trend).not.toBeNull();
      expect(trend?.text).toBe('+15.4%');
      expect(trend?.isPositive).toBe(true);
      expect(trend?.isNeutral).toBe(false);
    });

    it('calculates positive change correctly (+8.5%)', () => {
      // 108.5 vs 100
      const trend = calculatePercentageChange(108.5, 100);
      expect(trend?.text).toBe('+8.5%');
      expect(trend?.isPositive).toBe(true);
    });

    it('calculates negative change correctly (-25.0% for 15 vs 20)', () => {
      const trend = calculatePercentageChange(15, 20);
      expect(trend).not.toBeNull();
      expect(trend?.text).toBe('-25.0%');
      expect(trend?.isPositive).toBe(false);
      expect(trend?.isNeutral).toBe(false);
    });

    it('calculates zero change correctly (0.0% for 15 vs 15)', () => {
      const trend = calculatePercentageChange(15, 15);
      expect(trend).not.toBeNull();
      expect(trend?.text).toBe('0.0%');
      expect(trend?.isNeutral).toBe(true);
    });

    it('handles zero previous value safely with positive current value (+100%)', () => {
      const trend = calculatePercentageChange(15, 0);
      expect(trend?.text).toBe('+100%');
      expect(trend?.isPositive).toBe(true);
    });

    it('handles zero in both current and previous safely (0.0%)', () => {
      const trend = calculatePercentageChange(0, 0);
      expect(trend?.text).toBe('0.0%');
      expect(trend?.isNeutral).toBe(true);
    });

    it('handles null/undefined values safely without error', () => {
      expect(calculatePercentageChange(null, 10)).toBeNull();
      expect(calculatePercentageChange(10, null)).toBeNull();
      expect(calculatePercentageChange(undefined, undefined)).toBeNull();
      expect(calculatePercentageChange('invalid', 10)).toBeNull();
    });

    it('parses explicit string and number trends correctly', () => {
      expect(parseTrendIndicator('+8.5%')?.text).toBe('+8.5%');
      expect(parseTrendIndicator('+8.5%')?.isPositive).toBe(true);

      expect(parseTrendIndicator('-12.3%')?.text).toBe('-12.3%');
      expect(parseTrendIndicator('-12.3%')?.isPositive).toBe(false);

      expect(parseTrendIndicator(14.2)?.text).toBe('+14.2%');
      expect(parseTrendIndicator(-5.1)?.text).toBe('-5.1%');
      expect(parseTrendIndicator(0)?.text).toBe('0.0%');

      expect(parseTrendIndicator('—')?.text).toBe('—');
      expect(parseTrendIndicator('—')?.isNeutral).toBe(true);
      expect(parseTrendIndicator(null)).toBeNull();
    });
  });
});
