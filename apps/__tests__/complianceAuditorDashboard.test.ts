import { filterNavForRole, getHomeRouteForRole, isRouteAllowedForRole } from '../lib/routeGuards';

describe('Compliance Auditor Dashboard & Navigation Suite', () => {
  it('routes AUDITOR role to compliance dashboard route as primary home', () => {
    const homeRoute = getHomeRouteForRole('AUDITOR');
    expect(homeRoute).toBe('/compliance-auditor/dashboard');
  });

  it('allows AUDITOR role to access compliance routes', () => {
    expect(isRouteAllowedForRole('/compliance-auditor/dashboard', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/reviews', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/audit-log', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/legal', 'AUDITOR')).toBe(true);
    expect(isRouteAllowedForRole('/compliance-auditor/terms', 'AUDITOR')).toBe(true);
  });

  it('restricts AUDITOR role from modifying core financial release actions and non-auditor areas', () => {
    expect(isRouteAllowedForRole('/approvals', 'AUDITOR')).toBe(false);
    expect(isRouteAllowedForRole('/finance-admin', 'AUDITOR')).toBe(false);
    expect(isRouteAllowedForRole('/restaurant-admin', 'AUDITOR')).toBe(false);
    expect(isRouteAllowedForRole('/darkstore-admin', 'AUDITOR')).toBe(false);
    expect(isRouteAllowedForRole('/settings', 'AUDITOR')).toBe(false);
    expect(isRouteAllowedForRole('/users', 'AUDITOR')).toBe(false);
  });

  it('generates the 4 Compliance Auditor sidebar items matching design specifications', () => {
    const navItems = filterNavForRole('AUDITOR');
    expect(navItems).toHaveLength(4);

    const labels = navItems.map((item) => item.label);
    expect(labels).toEqual([
      'Home',
      'Reviews & Complaints',
      'Audit Log',
      'Terms & Conditions',
    ]);
  });
});
