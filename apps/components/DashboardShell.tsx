'use client';

import React, { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, EmptyState, Text } from 'foodie-shared-web';
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
      const savedRole = localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role') || (isAuditorPath ? 'AUDITOR' : null);
      const savedUserId = localStorage.getItem('foodie_admin_user_id') || sessionStorage.getItem('foodie_admin_user_id') || '44444444-4444-4444-4444-444444444001';
      if (savedRole && savedUserId) {
        dispatch(
          setSession({
            userId: savedUserId,
            role: savedRole as any,
            userType: 'ADMIN',
            fullName: savedRole === 'AUDITOR' ? 'Compliance Auditor' : 'Admin Operator',
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
    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null;

    if (meProfile) {
      const finalRole = (isAuditorPath || storedRole === 'AUDITOR')
        ? 'AUDITOR'
        : ((storedRole && storedRole !== 'SUPER_ADMIN' ? storedRole : meProfile.role) || storedRole || role || 'SUPER_ADMIN');
      dispatch(
        setSession({
          userId: meProfile.adminUserId || userId || '44444444-4444-4444-4444-444444444001',
          role: finalRole as any,
          userType: 'ADMIN',
          fullName: finalRole === 'AUDITOR' ? 'Compliance Auditor' : (meProfile.fullName || 'Admin Operator'),
          permissions: meProfile.permissions || [],
        }),
      );
    } else if (isMeError) {
      const status = (meError as { status?: number })?.status;
      if (status === 401 || status === 403) {
        if (!isAuditorPath && storedRole !== 'AUDITOR' && !storedRole && !role && !userId) {
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
        }
      }
    }
  }, [meProfile, isMeError, meError, dispatch, router, role, userId, pathname]);

  useEffect(() => {
    if (hasHydrated && authStatus === 'unauthenticated' && !role && !userId) {
      const isAuditorPath = Boolean(pathname && pathname.startsWith('/compliance-auditor'));
      const savedRole = typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null;
      if (!savedRole && !isAuditorPath) {
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

  const effectiveRole = isAuditorContext
    ? 'AUDITOR'
    : (role || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') as any) : null));
  const effectiveUserId = userId || (typeof window !== 'undefined' ? localStorage.getItem('foodie_admin_user_id') : null);
  const activeRole = isAuditorContext ? 'AUDITOR' : (effectiveRole || 'SUPER_ADMIN');
  const activeUserId = effectiveUserId || '44444444-4444-4444-4444-444444444001';

  const nav = filterNavForRole(activeRole, pathname);
  const isAllowedRoute = isRouteAllowedForRole(pathname, activeRole);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#F0F9FF',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '0px 1fr' : '270px 1fr',
          transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sidebar Navigation — Fixed in place */}
        <aside
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            height: '100vh',
            maxHeight: '100vh',
            zIndex: 40,
            width: isCompact ? 0 : 270,
            opacity: isCompact ? 0 : 1,
            visibility: isCompact ? 'hidden' : 'visible',
            backgroundColor: '#075985',
            backgroundImage: 'linear-gradient(180deg, #075985 0%, #0C4A6E 50%, #082F49 100%)',
            color: '#FFFFFF',
            padding: isCompact ? 0 : '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: isCompact ? 'none' : '4px 0 20px rgba(7, 89, 133, 0.25)',
            borderRight: isCompact ? 'none' : '1px solid #0369A1',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
            overflowY: 'auto',
            pointerEvents: isCompact ? 'none' : 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Brand Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {activeRole === 'AUDITOR' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: '#38BDF8', display: 'flex', alignItems: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
                      Compliance Auditor
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                    Foodie <span style={{ color: '#38BDF8' }}>Admin</span>
                  </div>
                )}
              </div>
            </div>

            {/* Role Badge */}
            {activeRole ? (
              <div
                style={{
                  backgroundColor: 'rgba(12, 74, 110, 0.75)',
                  border: '1px solid #0284C7',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                title={`Active Role: ${activeRole}`}
              >
                <div>
                  <div style={{ fontSize: 10, color: '#7DD3FC', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Active Role
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                    {activeRole === 'AUDITOR' ? 'ADMIN' : activeRole}
                  </div>
                </div>
                <span
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: '50%',
                    backgroundColor: '#38BDF8',
                    boxShadow: '0 0 10px #38BDF8',
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
                  gap: 4,
                }}
              >
                {nav.map((item, idx) => {
                  const isActive =
                    item.href === '/compliance-auditor/dashboard'
                      ? pathname === '/compliance-auditor/dashboard' || pathname === '/compliance-auditor' || pathname === '/'
                      : item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href) ||
                      (item.href === '/support' && pathname.startsWith('/contact-us'));

                  const isHighlighted = item.highlighted ?? false;
                  const isAuditor = activeRole === 'AUDITOR';

                  return (
                    <React.Fragment key={item.href}>
                      <li>
                        <Link
                          href={item.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isAuditor ? '10px 14px' : '9px 12px',
                            borderRadius: isAuditor ? 10 : 8,
                            fontSize: 13,
                            fontWeight: isActive || isHighlighted ? 700 : 500,
                            color: isActive
                              ? '#FFFFFF'
                              : isHighlighted
                                ? '#FFFFFF'
                                : '#BAE6FD',
                            backgroundColor: isActive
                              ? '#0284C7'
                              : isHighlighted
                                ? '#0369A1'
                                : 'transparent',
                            backgroundImage: isActive
                              ? 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)'
                              : 'none',
                            borderLeft: isAuditor
                              ? 'none'
                              : isActive
                              ? '4px solid #38BDF8'
                              : isHighlighted
                                ? '4px solid #38BDF8'
                                : '4px solid transparent',
                            boxShadow: isActive ? '0 4px 12px rgba(14, 165, 233, 0.4)' : 'none',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease-in-out',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#0369A1',
                                backgroundColor: '#BAE6FD',
                                padding: '2px 6px',
                                borderRadius: 6,
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

          {/* Sidebar Bottom Profile & Logout Footer */}
          <div
            style={{
              borderTop: '1px solid #0369A1',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(14, 165, 233, 0.4)',
                }}
              >
                {activeRole === 'AUDITOR' ? 'CA' : 'AD'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {activeRole === 'AUDITOR' ? 'Compliance Auditor' : 'Admin'}
                </div>
                <div style={{ fontSize: 11, color: '#7DD3FC', marginTop: 1 }}>
                  admin
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
                color: '#BAE6FD',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0369A1';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#BAE6FD';
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
          <main style={{ flex: 1, padding: '24px 32px 48px', maxWidth: 1600 }}>
            {!isAllowedRoute ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 24px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #BAE6FD',
                  textAlign: 'center',
                  marginTop: 24,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <Text as="h2" variant="heading1" style={{ fontSize: 22, fontWeight: 800, color: '#0369A1', marginBottom: 8 }}>
                  403 — Access Restricted
                </Text>
                <Text variant="body" style={{ color: '#0284C7', maxWidth: 460, marginBottom: 24, fontSize: 14 }}>
                  Your administrative account ({activeRole || 'UNASSIGNED'}) is not authorized to access <strong>{pathname}</strong>.
                </Text>
                <Button
                  label={`Go to ${activeRole ? activeRole : 'Home'} Dashboard`}
                  aria-label={`Navigate to ${activeRole ? activeRole : 'Home'} dashboard`}
                  onClick={() => router.push(getHomeRouteForRole(activeRole))}
                  style={{
                    backgroundColor: '#0284C7',
                    backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                    color: '#FFFFFF',
                    padding: '10px 20px',
                    fontWeight: 700,
                    borderRadius: 8,
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
