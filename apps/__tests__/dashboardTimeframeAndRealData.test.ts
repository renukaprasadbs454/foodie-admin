import { GET } from '../app/api/bff/[...path]/route';
import { getDashboardPresetRange, validateDateRange } from '../features/analytics/types';

describe('Dashboard Timeframe Filter and Real Backend Data', () => {
  // Reference date: Wednesday, October 28, 2026
  const refDate = new Date(2026, 9, 28, 12, 0, 0);

  describe('Timeframe Preset Date Boundaries', () => {
    it('calculates Today correctly (today only)', () => {
      const range = getDashboardPresetRange('Today', refDate);
      expect(range.dateFrom).toBe('2026-10-28');
      expect(range.dateTo).toBe('2026-10-28');
    });

    it('calculates Yesterday correctly (yesterday only)', () => {
      const range = getDashboardPresetRange('Yesterday', refDate);
      expect(range.dateFrom).toBe('2026-10-27');
      expect(range.dateTo).toBe('2026-10-27');
    });

    it('calculates Last 7 Days correctly (7 calendar days including today)', () => {
      const range = getDashboardPresetRange('Last 7 Days', refDate);
      expect(range.dateFrom).toBe('2026-10-22');
      expect(range.dateTo).toBe('2026-10-28');
    });

    it('calculates Last 30 Days correctly (30 calendar days including today)', () => {
      const range = getDashboardPresetRange('Last 30 Days', refDate);
      expect(range.dateFrom).toBe('2026-09-29');
      expect(range.dateTo).toBe('2026-10-28');
    });

    it('calculates This Month correctly (first day of current month to today)', () => {
      const range = getDashboardPresetRange('This Month', refDate);
      expect(range.dateFrom).toBe('2026-10-01');
      expect(range.dateTo).toBe('2026-10-28');
    });

    it('validates Custom Date Range correctly', () => {
      const valid = validateDateRange('2026-10-01', '2026-10-28');
      expect(valid.ok).toBe(true);
      if (valid.ok) {
        expect(valid.range.dateFrom).toBe('2026-10-01');
        expect(valid.range.dateTo).toBe('2026-10-28');
      }

      const inverted = validateDateRange('2026-10-28', '2026-10-01');
      expect(inverted.ok).toBe(false);

      const invalid = validateDateRange('not-a-date', '2026-10-28');
      expect(invalid.ok).toBe(false);
    });
  });

  describe('BFF Analytics Dashboard Summary Real Data Integration', () => {
    beforeEach(() => {
      global.fetch = jest.fn((url: any, init: any) => {
        const urlStr = url.toString();
        const headers: any = init?.headers || {};
        const activeZone = headers['X-Active-Zone-Id'] || headers['x-active-zone-id'];

        if (urlStr.includes('/api/v1/analytics/dashboard-summary')) {
          if (activeZone === 'dz-tumkur-zone') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: {
                    totalOrders: 13,
                    totalRevenue: 3886,
                    activeRestaurants: 3,
                    activeDeliveryPartners: 6,
                    newCustomers: 0,
                    avgOrderValue: 298.92,
                  },
                }),
                { status: 200 }
              )
            );
          }

          // Global platform summary: 15 orders, captured payment revenue was 0 due to COD orders
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  totalOrders: 15,
                  totalRevenue: 0,
                  activeRestaurants: 12,
                  activeDeliveryPartners: 48,
                  newCustomers: 2,
                  avgOrderValue: 0,
                },
              }),
              { status: 200 }
            )
          );
        }

        if (urlStr.includes('/api/v1/analytics/daily-sales')) {
          if (activeZone === 'dz-tumkur-zone') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: [
                    { date: '2026-10-22', orderCount: 6, revenue: 1674 },
                    { date: '2026-10-27', orderCount: 6, revenue: 1923 },
                    { date: '2026-10-28', orderCount: 1, revenue: 289 },
                  ],
                }),
                { status: 200 }
              )
            );
          }

          // Global daily sales with gross volume from order table
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: [
                  { date: '2026-10-22', orderCount: 6, revenue: 1674 },
                  { date: '2026-10-27', orderCount: 8, revenue: 3423 },
                  { date: '2026-10-28', orderCount: 1, revenue: 289 },
                ],
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
      }) as jest.Mock;
    });

    it('calculates Total Marketplace Revenue and Average Order Value accurately for platform-wide view', async () => {
      const req = new Request('http://localhost:3000/api/bff/analytics/dashboard-summary?dateFrom=2026-10-22&dateTo=2026-10-28', {
        headers: {
          cookie: 'foodie_access_token=super_admin_jwt_token; foodie_user_role=SUPER_ADMIN',
        },
      });

      const res = await GET(req, { params: Promise.resolve({ path: ['analytics', 'dashboard-summary'] }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const data = json.data;

      // Card 1: Total Marketplace Revenue (1674 + 3423 + 289 = 5386)
      expect(data.totalRevenue).toBe(5386);

      // Card 2: Total Orders (15)
      expect(data.totalOrders).toBe(15);

      // Card 3: Active Stores / Vendors (12)
      expect(data.activeRestaurants).toBe(12);

      // Card 4: Active Delivery Fleet (48)
      expect(data.activeDeliveryPartners).toBe(48);

      // Card 5: Registered Customers (2)
      expect(data.newCustomers).toBe(2);

      // Card 6: Average Order Value = 5386 / 15 = 359.07
      expect(data.avgOrderValue).toBe(359.07);
    });

    it('preserves Zone Admin data isolation and normalizes zone headers', async () => {
      const req = new Request('http://localhost:3000/api/bff/analytics/dashboard-summary?dateFrom=2026-10-22&dateTo=2026-10-28', {
        headers: {
          cookie: 'foodie_access_token=zone_admin_jwt_token; foodie_user_assigned_zone=dz-tumkur-zone',
          'x-active-zone-id': 'dz-tumkur',
        },
      });

      const res = await GET(req, { params: Promise.resolve({ path: ['analytics', 'dashboard-summary'] }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const data = json.data;

      expect(data.totalRevenue).toBe(3886);
      expect(data.totalOrders).toBe(13);
      expect(data.activeRestaurants).toBe(3);
      expect(data.activeDeliveryPartners).toBe(6);
      expect(data.newCustomers).toBe(0);
      expect(data.avgOrderValue).toBe(298.92);
    });

    it('handles zero orders without division by zero', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                totalOrders: 0,
                totalRevenue: 0,
                activeRestaurants: 12,
                activeDeliveryPartners: 48,
                newCustomers: 0,
                avgOrderValue: 0,
              },
            }),
            { status: 200 }
          )
        )
      ) as jest.Mock;

      const req = new Request('http://localhost:3000/api/bff/analytics/dashboard-summary?dateFrom=2026-01-01&dateTo=2026-01-02', {
        headers: {
          cookie: 'foodie_access_token=super_admin_jwt_token',
        },
      });

      const res = await GET(req, { params: Promise.resolve({ path: ['analytics', 'dashboard-summary'] }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.totalOrders).toBe(0);
      expect(json.data.totalRevenue).toBe(0);
      expect(json.data.avgOrderValue).toBe(0);
    });

    it('returns daily sales data synchronizing with the timeframe filter', async () => {
      const req = new Request('http://localhost:3000/api/bff/analytics/daily-sales?dateFrom=2026-10-22&dateTo=2026-10-28', {
        headers: {
          cookie: 'foodie_access_token=super_admin_jwt_token',
        },
      });

      const res = await GET(req, { params: Promise.resolve({ path: ['analytics', 'daily-sales'] }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(3);
      expect(json.data[0].revenue).toBe(1674);
      expect(json.data[1].revenue).toBe(3423);
      expect(json.data[2].revenue).toBe(289);
    });
  });
});
