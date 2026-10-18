'use client';

import React, { useState, useEffect } from 'react';
import {
  type AdminRole,
  Toast,
  trackAnalyticsEvent,
  useConnectivity,
} from 'foodie-shared-web';
import {
  useLoginMutation,
  useGetAdminRolesQuery,
  type AdminRoleOption,
} from '@/api/endpoints/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setSession } from './authSlice';
import { isNonEmptyPassword, isValidAdminEmail } from './validation';
import { getHomeRouteForRole } from '@/lib/routeGuards';

function loginErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Invalid email or password. Please check your credentials.';
    case 'ACCOUNT_DEACTIVATED':
      return 'This admin account is deactivated. Contact system administrator.';
    case 'RATE_LIMITED':
      return 'Too many sign-in attempts. Please try again after a few minutes.';
    case 'VALIDATION_FAILED':
      return 'Please check email and password formatting, then try again.';
    case 'NETWORK_ERROR':
      return 'Network connection error or backend server offline. Try again.';
    default:
      return 'Sign-in failed. Please check your credentials and backend server connection.';
  }
}

interface AdminLoginFormProps {
  initialEmail?: string;
  initialPassword?: string;
}

export function AdminLoginForm({
  initialEmail = '',
  initialPassword = '',
}: AdminLoginFormProps) {
  const { isConnected } = useConnectivity();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const { data: dynamicRoles = [] } = useGetAdminRolesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const DEFAULT_ROLE_OPTIONS: AdminRoleOption[] = [
    { key: 'SUPER_ADMIN', role: 'SUPER_ADMIN', label: 'Super Admin', defaultEmail: 'admin@foodie.local' },
    { key: 'AUDITOR', role: 'AUDITOR', label: 'Compliance Auditor', defaultEmail: 'auditor@foodie.local' },
    { key: 'FINANCE_ADMIN', role: 'FINANCE_ADMIN', label: 'Finance Admin', defaultEmail: 'finance@foodie.local' },
    { key: 'OPERATIONS_ADMIN', role: 'OPERATIONS_ADMIN', label: 'Operations Admin', defaultEmail: 'ops@foodie.local' },
    { key: 'RESTAURANT_MANAGER', role: 'RESTAURANT_MANAGER', label: 'Restaurant Manager', defaultEmail: 'manager@foodie.local' },
    { key: 'SUPPORT_AGENT', role: 'SUPPORT_AGENT', label: 'Support Agent', defaultEmail: 'support@foodie.local' },
    { key: 'DARKSTORE_ADMIN', role: 'DARKSTORE_ADMIN', label: 'Darkstore Admin', defaultEmail: 'darkstore@foodie.local' },
  ];

  const roleOptions: AdminRoleOption[] = dynamicRoles.length > 0 ? dynamicRoles : DEFAULT_ROLE_OPTIONS;
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('SUPER_ADMIN');

  useEffect(() => {
    if (selectedRoleKey !== 'SUPER_ADMIN' && !roleOptions.some((r) => r.key === selectedRoleKey || r.role === selectedRoleKey)) {
      setSelectedRoleKey('SUPER_ADMIN');
    }
  }, [roleOptions, selectedRoleKey]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'error' | 'info';
  } | null>(null);

  const currentRoleInfo =
    roleOptions.find((r) => r.key === selectedRoleKey || r.role === selectedRoleKey) ||
    roleOptions[0] ||
    DEFAULT_ROLE_OPTIONS[0];

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRoleKey(roleKey);
    const opt = roleOptions.find((r) => r.key === roleKey || r.role === roleKey);
    let targetEmail = opt?.defaultEmail;
    if (!targetEmail && opt?.zoneId) {
      const zLower = (opt.zoneId + ' ' + (opt.zoneName || '')).toLowerCase();
      if (zLower.includes('bangalore') || zLower.includes('bengaluru')) {
        targetEmail = 'ops@foodie.local';
      } else if (zLower.includes('tumkur') || zLower.includes('tumakuru')) {
        targetEmail = 'finance@foodie.local';
      }
    }
    if (targetEmail) {
      setEmail(targetEmail);
    }
    setEmailError(undefined);
    setPasswordError(undefined);
    setInlineError(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(undefined);
    setPasswordError(undefined);
    setInlineError(null);
    setToast(null);

    if (!isConnected) {
      const offlineMsg = 'You are offline. Connect to internet to attempt sign-in.';
      setInlineError(offlineMsg);
      setToast({
        message: offlineMsg,
        variant: 'error',
      });
      return;
    }

    let valid = true;
    if (!isValidAdminEmail(email)) {
      setEmailError('Enter a valid admin email address.');
      valid = false;
    }

    if (!isNonEmptyPassword(password)) {
      setPasswordError('Password is required.');
      valid = false;
    }
    if (!valid) return;

    trackAnalyticsEvent('login_submitted');
    trackAnalyticsEvent('admin_auth_attempted');

    try {
      const identity = await login({
        email: email.trim(),
        password,
        deviceInfo: 'Admin Panel',
        expectedZoneId: currentRoleInfo.zoneId || undefined,
      }).unwrap();

      // Determine zone assignment from response identity or email mapping
      const userEmail = email.trim();
      const lowerEmail = userEmail.toLowerCase();
      let finalZoneId = identity.assignedZoneId || (currentRoleInfo.zoneId && currentRoleInfo.role !== 'SUPER_ADMIN' ? currentRoleInfo.zoneId : null);
      if (!finalZoneId && (lowerEmail === 'ops@foodie.local' || lowerEmail === 'blr.admin@foodie.local')) {
        finalZoneId = 'dz-bangalore';
      } else if (!finalZoneId && (lowerEmail === 'finance@foodie.local' || lowerEmail === 'tmk.admin@foodie.local')) {
        finalZoneId = 'dz-tumkur';
      }

      const finalZoneName =
        identity.assignedZoneName ||
        (finalZoneId ? currentRoleInfo.zoneName : null) ||
        (finalZoneId === 'dz-tumkur' ? 'Tumkur Zone' : (finalZoneId === 'dz-bangalore' ? 'Bangalore Zone' : null));

      let backendRole: AdminRole = (identity.role || (finalZoneId ? 'OPS' : (currentRoleInfo.role || 'SUPER_ADMIN'))) as AdminRole;
      if (finalZoneId && backendRole === 'SUPER_ADMIN') {
        backendRole = 'OPS';
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('foodie_admin_role', backendRole);
        sessionStorage.setItem('foodie_admin_role', backendRole);
        document.cookie = `foodie_user_role=${encodeURIComponent(backendRole)}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `foodie_admin_role=${encodeURIComponent(backendRole)}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem('foodie_admin_user_id', identity.userId || '44444444-4444-4444-4444-444444444001');
        sessionStorage.setItem('foodie_admin_user_id', identity.userId || '44444444-4444-4444-4444-444444444001');
        localStorage.setItem('foodie_admin_email', userEmail);
        sessionStorage.setItem('foodie_admin_email', userEmail);

        if (finalZoneId) {
          localStorage.setItem('foodie_active_zone_id', finalZoneId);
          sessionStorage.setItem('foodie_active_zone_id', finalZoneId);
          localStorage.setItem('foodie_user_assigned_zone', finalZoneId);
          sessionStorage.setItem('foodie_user_assigned_zone', finalZoneId);
          localStorage.setItem('foodie_active_zone_name', finalZoneName || finalZoneId);
          sessionStorage.setItem('foodie_active_zone_name', finalZoneName || finalZoneId);
          document.cookie = `foodie_active_zone_id=${encodeURIComponent(finalZoneId)}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `foodie_active_zone_name=${encodeURIComponent(finalZoneName || finalZoneId)}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `foodie_user_assigned_zone=${encodeURIComponent(finalZoneId)}; path=/; max-age=86400; SameSite=Lax`;
        } else {
          localStorage.removeItem('foodie_user_assigned_zone');
          sessionStorage.removeItem('foodie_user_assigned_zone');
          document.cookie = 'foodie_user_assigned_zone=; path=/; max-age=0; SameSite=Lax';
          if (backendRole === 'SUPER_ADMIN') {
            const defaultZoneId = 'ALL';
            const defaultZoneName = 'All Zones (Global View)';
            localStorage.setItem('foodie_active_zone_id', defaultZoneId);
            sessionStorage.setItem('foodie_active_zone_id', defaultZoneId);
            localStorage.setItem('foodie_active_zone_name', defaultZoneName);
            sessionStorage.setItem('foodie_active_zone_name', defaultZoneName);
            document.cookie = `foodie_active_zone_id=${encodeURIComponent(defaultZoneId)}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `foodie_active_zone_name=${encodeURIComponent(defaultZoneName)}; path=/; max-age=86400; SameSite=Lax`;
          }
        }
      }

      dispatch(
        setSession({
          userId: identity.userId || '44444444-4444-4444-4444-444444444001',
          role: backendRole,
          userType: 'ADMIN',
          fullName:
            identity.fullName ||
            (finalZoneId
              ? `${finalZoneName} Admin`
              : (backendRole === 'AUDITOR'
              ? 'Compliance Auditor'
              : backendRole === 'SUPER_ADMIN'
              ? 'Super Admin'
              : currentRoleInfo.label || 'Admin Operator')),
          email: userEmail,
        }),
      );

      trackAnalyticsEvent('admin_auth_succeeded', { role: backendRole });
      if (finalZoneId) {
        window.location.href = '/dashboard';
      } else {
        const redirectPath = getHomeRouteForRole(backendRole);
        window.location.href = redirectPath;
      }
    } catch (err: unknown) {
      trackAnalyticsEvent('admin_auth_failed');
      const errPayload = err as {
        data?: { error?: { code?: string; message?: string } };
        error?: string;
      };
      const errorCode = errPayload?.data?.error?.code || errPayload?.error;
      const message = errPayload?.data?.error?.message || loginErrorMessage(errorCode);
      setInlineError(message);
      setToast({
        message,
        variant: 'error',
      });
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
      noValidate
      suppressHydrationWarning
    >
      {/* Heading & Subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 30px)',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          Sign In to Foodie Admin
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: 14,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Authorized administrators can sign in to access portal operations.
        </p>
      </div>

      {/* Admin Role Selector Box */}
      <div className="foodie-role-container">
        <label htmlFor="admin-role-select" className="foodie-role-label">
          <span>SELECT ADMIN ROLE</span>
          <span
            style={{
              fontSize: 11,
              color: '#0284C7',
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: 'normal',
            }}
          >
            Role-Based Access
          </span>
        </label>

        <select
          id="admin-role-select"
          value={selectedRoleKey}
          onChange={(e) => handleRoleSelect(e.target.value)}
          className="foodie-role-select"
          suppressHydrationWarning
        >
          {roleOptions.map((item) => (
            <option key={item.key || item.role} value={item.key || item.role}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Inline Error Banner */}
      {inlineError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#EF4444',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{inlineError}</span>
        </div>
      )}

      {/* Email & Password Input Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Email Field */}
        <div>
          <label
            htmlFor="admin-email-input"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              marginBottom: 6,
            }}
          >
            Admin Email
          </label>
          <input
            id="admin-email-input"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Enter your admin email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(undefined);
            }}
            disabled={isLoading}
            aria-label="Email"
            aria-invalid={Boolean(emailError)}
            className={`foodie-input ${emailError ? 'has-error' : ''}`}
            suppressHydrationWarning
          />
          {emailError && (
            <span
              role="alert"
              style={{
                display: 'block',
                fontSize: 12,
                color: '#EF4444',
                fontWeight: 500,
                marginTop: 6,
              }}
            >
              {emailError}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="admin-password-input"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="admin-password-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(undefined);
              }}
              disabled={isLoading}
              aria-label="Password"
              aria-invalid={Boolean(passwordError)}
              className={`foodie-input ${passwordError ? 'has-error' : ''}`}
              style={{ paddingRight: 46 }}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="foodie-password-toggle"
              suppressHydrationWarning
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {passwordError && (
            <span
              role="alert"
              style={{
                display: 'block',
                fontSize: 12,
                color: '#EF4444',
                fontWeight: 500,
                marginTop: 6,
              }}
            >
              {passwordError}
            </span>
          )}
        </div>
      </div>

      {/* Prominent Primary Sign-In Button */}
      <button
        type="submit"
        disabled={isLoading}
        aria-label="Sign in"
        className="foodie-btn-primary"
        suppressHydrationWarning
      >
        {isLoading ? (
          <>
            <svg
              className="foodie-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Authenticating...</span>
          </>
        ) : (
          <span>Sign In as {currentRoleInfo.label}</span>
        )}
      </button>

      {/* Footer Security Notice */}
      <div
        style={{
          marginTop: -2,
          textAlign: 'center',
          fontSize: 12,
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Protected by enterprise role-based access control (RBAC)</span>
      </div>

      {/* Toast Notification */}
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        aria-label="Login message"
        onClose={() => setToast(null)}
      />
    </form>
  );
}
