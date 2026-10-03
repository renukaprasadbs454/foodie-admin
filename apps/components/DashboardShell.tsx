'use client';

import React, { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, EmptyState, Text, type AdminRole } from 'foodie-shared-web';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearSession,
  selectAdminRole,
  selectAuthStatus,
  selectUserId,
  setSession,
} from '@/features/auth/authSlice';
import { useGetAdminMeQuery } from '@/api/endpoints/authApi';
import { logoutAdmin } from '@/features/auth/session';
import {
  filterNavForRole,
  getHomeRouteForRole,
  isRouteAllowedForRole,
} from '@/lib/routeGuards';
import { AdminHeaderBar } from '@/components/AdminHeaderBar';
import { AiAssistantWidget } from '@/components/AiAssistantWidget';


export function DashboardShell({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAppSelector(selectAuthStatus);
  const role = useAppSelector(selectAdminRole);
  const userId = useAppSelector(selectUserId);
  const [loggingOut, setLoggingOut] = React.useState(false);
  // Sidebar collapsed state - declared at top level to satisfy Rules of Hooks
  const [isCompact, setIsCompact] = React.useState(false);
  const [hasHydrated, setHasHydrated] = React.useState(false);

  // Rehydrate Redux session from local/session storage on initial client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuditorPath = Boolean(pathname && pathname.startsWith('/compliance-auditor'));
      const isFinancePath = Boolean(
        pathname && (
          pathname.startsWith('/finance-admin') ||
          pathname.startsWith('/delivery-payouts') ||
          pathname.startsWith('/payments') ||
          pathname.startsWith('/approvals')
        )
      );
      const defaultRoleForPath = isAuditorPath ? 'AUDITOR' : (isFinancePath ? 'FINANCE_ADMIN' : null);
      const savedRole = localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role') || defaultRoleForPath;
      const savedUserId = localStorage.getItem('foodie_admin_user_id') || sessionStorage.getItem('foodie_admin_user_id') || '44444444-4444-4444-4444-444444444001';
      if (savedRole && savedUserId) {
        dispatch(
          setSession({
            userId: savedUserId,
            role: savedRole as AdminRole,
            userType: 'ADMIN',
            fullName: savedRole === 'AUDITOR' ? 'Compliance Auditor' : (savedRole === 'FINANCE_ADMIN' ? 'Finance Admin' : 'Admin Operator'),
          }),
        );
      }
      setHasHydrated(true);
    }
  }, [dispatch, pathname]);

  // Fetch current authenticated user profile from backend ME API
  const { data: meProfile, isError: isMeError, error: meError } = useGetAdminMeQuery(undefined, {
    skip: !hasHydrated && authStatus === 'unauthenticated' && !role && !userId,
  });

  useEffect(() => {
    const isAuditorPath = Boolean(pathname && pathname.startsWith('/compliance-auditor'));
    const isFinancePath = Boolean(
      pathname && (
        pathname.startsWith('/finance-admin') ||
        pathname.startsWith('/delivery-payouts') ||
        pathname.startsWith('/payments') ||
        pathname.startsWith('/approvals')
      )
    );
    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null;

    if (meProfile) {
      const finalRole = (isAuditorPath || storedRole === 'AUDITOR')
        ? 'AUDITOR'
        : (isFinancePath || storedRole === 'FINANCE_ADMIN' || (storedRole && storedRole.toUpperCase().includes('FINANCE')))
        ? 'FINANCE_ADMIN'
        : ((storedRole && storedRole !== 'SUPER_ADMIN' ? storedRole : meProfile.role) || storedRole || role || 'SUPER_ADMIN');
      dispatch(
        setSession({
          userId: meProfile.adminUserId || userId || '44444444-4444-4444-4444-444444444001',
          role: finalRole as AdminRole,
          userType: 'ADMIN',
          fullName: finalRole === 'AUDITOR' ? 'Compliance Auditor' : (finalRole === 'FINANCE_ADMIN' ? 'Finance Admin' : (meProfile.fullName || 'Admin Operator')),
          permissions: meProfile.permissions || [],
        }),
      );
    } else if (isMeError) {
      const status = (meError as { status?: number })?.status;
      if (status === 401 || status === 403) {
        if (!isAuditorPath && !isFinancePath && storedRole !== 'AUDITOR' && storedRole !== 'FINANCE_ADMIN' && !storedRole && !role && !userId) {
          dispatch(clearSession());
          router.replace('/login');
        } else if (isAuditorPath || storedRole === 'AUDITOR') {
          // Keep auditor session alive on API error
          dispatch(
            setSession({
              userId: userId || '44444444-4444-4444-4444-444444444001',
              role: 'AUDITOR',
              userType: 'ADMIN',
              fullName: 'Compliance Auditor',
              permissions: ['*'],
            }),
          );
        } else if (isFinancePath || storedRole === 'FINANCE_ADMIN' || (storedRole && storedRole.toUpperCase().includes('FINANCE'))) {
          // Keep finance admin session alive on API error
          dispatch(
            setSession({
              userId: userId || '44444444-4444-4444-4444-444444444001',
              role: 'FINANCE_ADMIN',
              userType: 'ADMIN',
              fullName: 'Finance Admin',
              permissions: ['*'],
            }),
          );
        }
      }
    }
  }, [meProfile, isMeError, meError, dispatch, router, role, userId, pathname]);

  useEffect(() => {
    if (hasHydrated && authStatus === 'unauthenticated' && !role && !userId) {
      const isAuditorPath = Boolean(pathname && pathname.startsWith('/compliance-auditor'));
      const isFinancePath = Boolean(
        pathname && (
          pathname.startsWith('/finance-admin') ||
          pathname.startsWith('/delivery-payouts') ||
          pathname.startsWith('/payments') ||
          pathname.startsWith('/approvals')
        )
      );
      const savedRole = typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null;
      if (!savedRole && !isAuditorPath && !isFinancePath) {
        router.replace('/login');
      } else if (isAuditorPath || savedRole === 'AUDITOR') {
        dispatch(
          setSession({
            userId: '44444444-4444-4444-4444-444444444001',
            role: 'AUDITOR',
            userType: 'ADMIN',
            fullName: 'Compliance Auditor',
          }),
        );
      } else if (isFinancePath || savedRole === 'FINANCE_ADMIN' || (savedRole && savedRole.toUpperCase().includes('FINANCE'))) {
        dispatch(
          setSession({
            userId: '44444444-4444-4444-4444-444444444001',
            role: 'FINANCE_ADMIN',
            userType: 'ADMIN',
            fullName: 'Finance Admin',
          }),
        );
      }
    }
  }, [hasHydrated, authStatus, role, userId, router, pathname, dispatch]);

  const onLogout = async () => {
    setLoggingOut(true);
    await logoutAdmin(dispatch);
    router.replace('/login');
    setLoggingOut(false);
  };

  const isAuditorContext =
    Boolean(pathname && pathname.startsWith('/compliance-auditor')) ||
    role === 'AUDITOR' ||
    (typeof window !== 'undefined' && localStorage.getItem('foodie_admin_role') === 'AUDITOR');

  const isFinanceContext =
    Boolean(pathname && (
      pathname.startsWith('/finance-admin') ||
      pathname.startsWith('/delivery-payouts') ||
      pathname.startsWith('/payments') ||
      pathname.startsWith('/approvals')
    )) ||
    Boolean(role && role.toUpperCase().includes('FINANCE')) ||
    (typeof window !== 'undefined' && (localStorage.getItem('foodie_admin_role') || '').toUpperCase().includes('FINANCE'));

  const effectiveRole = isAuditorContext
    ? 'AUDITOR'
    : (isFinanceContext
      ? 'FINANCE_ADMIN'
      : (role || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') as AdminRole | null) : null)));
  const effectiveUserId = userId || (typeof window !== 'undefined' ? localStorage.getItem('foodie_admin_user_id') : null);
  const activeRole = isAuditorContext ? 'AUDITOR' : (isFinanceContext ? 'FINANCE_ADMIN' : (effectiveRole || 'SUPER_ADMIN'));
  const activeUserId = effectiveUserId || '44444444-4444-4444-4444-444444444001';

  const nav = filterNavForRole(activeRole, pathname);
  const isAllowedRoute = isRouteAllowedForRole(pathname, activeRole);

  useEffect(() => {
    if (activeRole && activeRole.toUpperCase().includes('RESTAURANT') && (pathname === '/' || pathname === '/dashboard')) {
      router.replace('/restaurants');
    } else if (activeRole && activeRole.toUpperCase() === 'SUPPORT_AGENT' && (pathname === '/' || pathname === '/dashboard')) {
      router.replace('/support');
    }
  }, [activeRole, pathname, router]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: '#F5F7FA',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '0px 1fr' : '260px 1fr',
          transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sidebar Navigation — Sticky in place */}
        <aside
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            height: '100vh',
            maxHeight: '100vh',
            zIndex: 40,
            width: isCompact ? 0 : 260,
            opacity: isCompact ? 0 : 1,
            visibility: isCompact ? 'hidden' : 'visible',
            backgroundColor: '#FFFFFF',
            borderRight: isCompact ? 'none' : '1px solid #E5E7EB',
            color: '#111827',
            padding: isCompact ? 0 : '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: isCompact ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
            overflowY: 'auto',
            pointerEvents: isCompact ? 'none' : 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Brand Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 6px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {activeRole === 'AUDITOR' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
                      Compliance Auditor
                    </div>
                  </div>
                ) : activeRole === 'FINANCE_ADMIN' || isFinanceContext ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', whiteSpace: 'nowrap' }}>
                      Foodie <span style={{ color: '#2196F3' }}>Finance</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', whiteSpace: 'nowrap' }}>
                      Foodie <span style={{ color: '#2196F3' }}>Admin</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Role Badge */}
            {activeRole ? (
              <div
                style={{
                  backgroundColor: '#F5F7FA',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                title={`Active Role: ${activeRole}`}
              >
                <div>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Active Role
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                    {activeRole === 'AUDITOR' ? 'ADMIN' : (activeRole === 'FINANCE_ADMIN' ? 'FINANCE ADMIN' : activeRole)}
                  </div>
                </div>
                <span
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: '50%',
                    backgroundColor: '#22C55E',
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)',
                  }}
                  className="pulse-live"
                />
              </div>
            ) : null}

            {/* Navigation Links */}
            <nav aria-label="Admin Navigation" style={{ flex: 1, overflowY: 'auto' }}>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                {nav.map((item) => {
                  const isActive =
                    item.href === '/compliance-auditor/dashboard'
                      ? pathname === '/compliance-auditor/dashboard' || pathname === '/compliance-auditor' || pathname === '/'
                      : item.href === '/finance-admin/dashboard'
                      ? pathname === '/finance-admin/dashboard' || pathname === '/finance-admin'
                      : item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href) ||
                        (item.href === '/support' && pathname.startsWith('/contact-us'));

                  const isHighlighted = item.highlighted ?? false;

                  return (
                    <React.Fragment key={item.href}>
                      <li>
                        <Link
                          href={item.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? '#2196F3' : (isHighlighted ? '#111827' : '#6B7280'),
                            backgroundColor: isActive ? '#E3F2FD' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease-in-out',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = '#F5F7FA';
                              e.currentTarget.style.color = '#111827';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = isHighlighted ? '#111827' : '#6B7280';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            {item.icon === 'bar-chart' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="20" x2="12" y2="10" />
                                <line x1="18" y1="20" x2="18" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="16" />
                              </svg>
                            )}
                            {item.icon === 'truck' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                            )}
                            {item.icon === 'credit-card' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                              </svg>
                            )}
                            {item.icon === 'shield-alert' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                            )}
                            {item.icon === 'home' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                            )}
                            {item.icon === 'star' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            )}
                            {item.icon === 'file-text' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            )}
                            {item.icon === 'file-lines' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <line x1="10" y1="9" x2="8" y2="9" />
                              </svg>
                            )}
                            {item.icon === 'shield' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                            )}
                            {item.icon === 'gear' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                              </svg>
                            )}
                            {item.icon === 'users' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            )}
                            <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                          </div>
                          {item.badge ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: isActive ? '#1D4ED8' : '#6B7280',
                                backgroundColor: isActive ? '#BFDBFE' : '#F3F4F6',
                                padding: '2px 8px',
                                borderRadius: 10,
                              }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* User Profile Footer */}
          <div
            style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#E3F2FD',
                  color: '#2196F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {activeRole === 'AUDITOR' ? 'CA' : (activeRole === 'FINANCE_ADMIN' || isFinanceContext ? 'FA' : 'AD')}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {activeRole === 'AUDITOR' ? 'Compliance Auditor' : (activeRole === 'FINANCE_ADMIN' || isFinanceContext ? 'Finance Admin' : 'Admin')}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                  {activeRole === 'FINANCE_ADMIN' || isFinanceContext ? 'finance.admin' : 'admin@foodie.com'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onLogout()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#6B7280',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEE2E2';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area — Scrollable */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#F5F7FA',
          }}
        >
          {/* Top Header Bar */}
          <AdminHeaderBar
            role={activeRole}
            userId={activeUserId}
            onLogout={() => void onLogout()}
            loggingOut={loggingOut}
            isCompact={isCompact}
            onToggleCompact={() => setIsCompact((prev) => !prev)}
          />

          {/* Main Page Layout Content — Dynamic Route Handler */}
          <main style={{ flex: 1, padding: '24px 32px 48px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
            {!isAllowedRoute ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 24px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  textAlign: 'center',
                  marginTop: 24,
                }}
              >
                <Text as="h2" variant="heading1" style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                  403 — Access Restricted
                </Text>
                <Text variant="body" style={{ color: '#6B7280', maxWidth: 460, marginBottom: 24, fontSize: 14 }}>
                  Your administrative account ({activeRole || 'UNASSIGNED'}) is not authorized to access <strong>{pathname}</strong>.
                </Text>
                <Button
                  label={`Go to ${activeRole ? activeRole : 'Home'} Dashboard`}
                  aria-label={`Navigate to ${activeRole ? activeRole : 'Home'} dashboard`}
                  onClick={() => router.push(getHomeRouteForRole(activeRole))}
                  style={{
                    backgroundColor: '#2196F3',
                    backgroundImage: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    padding: '10px 24px',
                    fontWeight: 700,
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                  }}
                />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>



      {/* Foodie AI Operations Assistant Floating Widget */}
      <AiAssistantWidget />
    </div>
  );
}

export function FoundationPlaceholder({ title }: { title: string }) {
  return (
    <EmptyState
      title={title}
      description="Foundation scaffold only. Feature UI is Phase 2."
      aria-label={`${title} foundation placeholder`}
    />
  );
}
