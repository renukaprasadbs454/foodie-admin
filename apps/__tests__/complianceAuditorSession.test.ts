import { POST as refreshRoute } from '../app/api/auth/refresh/route';
import { POST as loginRoute } from '../app/api/auth/login/route';
import { GET as bffRoute } from '../app/api/bff/[...path]/route';
import { filterNavForRole, getHomeRouteForRole, isRouteAllowedForRole } from '../lib/routeGuards';

describe('Compliance Auditor Session Persistence & Routes', () => {
  it('login route generates demo auditor session and sets cookies', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auditor@foodie.local',
        password: 'ChangeMe@123',
        role: 'AUDITOR',
      }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('AUDITOR');
    expect(body.data.userType).toBe('ADMIN');
  });

  it('refresh route handles demo auditor refresh token smoothly without 401', async () => {
    const req = new Request('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        cookie: 'foodie_refresh_token=demo-admin-auditor-refresh-token',
        'Content-Type': 'application/json',
      },
    });

    const res = await refreshRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('AUDITOR');
  });

  it('bff route returns mock user profile for demo auditor token', async () => {
    const req = new Request('http://localhost:3000/api/bff/admin/users/me', {
      method: 'GET',
      headers: {
        cookie: 'foodie_access_token=demo-admin-auditor-access-token',
      },
    });

    const res = await bffRoute(req, { params: Promise.resolve({ path: ['admin', 'users', 'me'] }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('AUDITOR');
    expect(body.data.fullName).toBe('Compliance Auditor');
  });

  it('routes and navigation correctly permit compliance auditor paths', () => {
    expect(getHomeRouteForRole('AUDITOR')).toBe('/compliance-auditor/dashboard');
    expect(isRouteAllowedForRole('/compliance-auditor/dashboard', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/compliance-auditor/reviews', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/compliance-auditor/audit-log', 'AUDITOR')).toBe(true);

    const nav = filterNavForRole('AUDITOR', '/compliance-auditor/dashboard');
    expect(nav.some((n) => n.href === '/compliance-auditor/dashboard')).toBe(true);
    expect(nav.some((n) => n.href === '/compliance-auditor/reviews')).toBe(true);
  });
});
