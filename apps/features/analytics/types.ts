/**
 * P2-ADM-02 analytics shapes — API Analytics DTOs §14.1–§14.3 /
 * DashboardSummaryResponseDto, DailySalesPointDto, OrderStatusMetricDto.
 */

export type AnalyticsDateRange = {
  dateFrom: string;
  dateTo: string;
};

export type DashboardSummary = {
  totalOrders: number;
  totalRevenue: number | string;
  activeRestaurants: number;
  activeDeliveryPartners: number;
  newCustomers: number;
  avgOrderValue: number | string;
  revenueTrend?: number | string | null;
  ordersTrend?: number | string | null;
  storesTrend?: number | string | null;
  fleetTrend?: number | string | null;
  customersTrend?: number | string | null;
  aovTrend?: number | string | null;
  trends?: Record<string, number | string | null>;
};

export type DailySalesPoint = {
  date: string;
  orderCount: number;
  revenue: number | string;
};

export type OrderStatusMetric = {
  status: string;
  count: number;
  percentageOfTotal: number | string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export function validateDateRange(
  dateFrom: string,
  dateTo: string,
): { ok: true; range: AnalyticsDateRange } | { ok: false; message: string } {
  if (!dateFrom || !dateTo) {
    return { ok: false, message: 'dateFrom and dateTo are required.' };
  }
  if (!isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
    return { ok: false, message: 'Use ISO dates (YYYY-MM-DD).' };
  }
  if (dateFrom > dateTo) {
    return { ok: false, message: 'dateFrom must be on or before dateTo.' };
  }
  return { ok: true, range: { dateFrom, dateTo } };
}

/** Default range: last 7 calendar days inclusive (UTC ISO dates). */
export function defaultDateRange(now = new Date()): AnalyticsDateRange {
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 6);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDashboardPresetRange(label: string, now = new Date()): AnalyticsDateRange {
  const todayStr = formatLocalDate(now);

  if (label === 'Today') {
    return { dateFrom: todayStr, dateTo: todayStr };
  }
  if (label === 'Yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yestStr = formatLocalDate(yesterday);
    return { dateFrom: yestStr, dateTo: yestStr };
  }
  if (label === 'Last 7 Days') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { dateFrom: formatLocalDate(from), dateTo: todayStr };
  }
  if (label === 'Last 30 Days') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    return { dateFrom: formatLocalDate(from), dateTo: todayStr };
  }
  if (label === 'This Month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: formatLocalDate(from), dateTo: todayStr };
  }
  return { dateFrom: todayStr, dateTo: todayStr };
}

export function formatMoneyInr(value: number | string | null | undefined): string {
  if (value == null || value === '') return '₹—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '₹—';
  return `₹${n.toFixed(2)}`;
}

export function formatCount(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return String(Math.trunc(n));
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

export type TrendIndicator = {
  text: string;
  isPositive: boolean;
  isNeutral?: boolean;
};

export function getPreviousPeriodRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const from = new Date(`${range.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${range.dateTo}T00:00:00.000Z`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return range;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const durationDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;

  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (durationDays - 1) * dayMs);

  return {
    dateFrom: prevFrom.toISOString().slice(0, 10),
    dateTo: prevTo.toISOString().slice(0, 10),
  };
}

export function calculatePercentageChange(
  current: number | string | null | undefined,
  previous: number | string | null | undefined,
): TrendIndicator | null {
  if (current == null || previous == null) return null;

  const curr = typeof current === 'number' ? current : Number(current);
  const prev = typeof previous === 'number' ? previous : Number(previous);

  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;

  if (prev === 0 && curr === 0) {
    return { text: '0.0%', isPositive: true, isNeutral: true };
  }

  if (prev === 0 && curr > 0) {
    return { text: '+100%', isPositive: true, isNeutral: false };
  }

  if (prev === 0 && curr < 0) {
    return { text: '-100%', isPositive: false, isNeutral: false };
  }

  const diff = curr - prev;
  const pct = (diff / Math.abs(prev)) * 100;

  if (Math.abs(pct) < 0.05) {
    return { text: '0.0%', isPositive: true, isNeutral: true };
  }

  const isPositive = pct > 0;
  return {
    text: `${isPositive ? '+' : ''}${pct.toFixed(1)}%`,
    isPositive,
    isNeutral: false,
  };
}

export function parseTrendIndicator(value: unknown): TrendIndicator | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null && 'text' in value) {
    const v = value as { text: string; isPositive?: boolean; isNeutral?: boolean };
    return {
      text: String(v.text),
      isPositive: v.isPositive ?? !String(v.text).startsWith('-'),
      isNeutral: v.isNeutral ?? (v.text === '—' || v.text === '0.0%'),
    };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) < 0.05) {
      return { text: '0.0%', isPositive: true, isNeutral: true };
    }
    const isPositive = value > 0;
    return {
      text: `${isPositive ? '+' : ''}${value.toFixed(1)}%`,
      isPositive,
      isNeutral: false,
    };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed === '—' || trimmed === 'N/A' || trimmed === '...') {
      return { text: trimmed, isPositive: true, isNeutral: true };
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      return { text: trimmed, isPositive: !trimmed.startsWith('-'), isNeutral: false };
    }
    if (Math.abs(parsed) < 0.05) {
      return { text: '0.0%', isPositive: true, isNeutral: true };
    }
    const isPositive = parsed > 0;
    return {
      text: trimmed.endsWith('%') ? trimmed : `${isPositive ? '+' : ''}${parsed.toFixed(1)}%`,
      isPositive,
      isNeutral: false,
    };
  }
  return null;
}
