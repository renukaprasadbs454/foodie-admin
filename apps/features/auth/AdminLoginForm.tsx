'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Text,
  TextInput,
  Toast,
  trackAnalyticsEvent,
  useConnectivity,
  useTheme,
} from 'foodie-shared-web';
import { useLoginMutation } from '@/api/endpoints/authApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAdminRole, selectAuthStatus, setSession } from './authSlice';
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
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const authStatus = useAppSelector(selectAuthStatus);
  const currentRole = useAppSelector(selectAdminRole);

  const [login, { isLoading }] = useLoginMutation();
  const [selectedRole, setSelectedRole] = useState<string>('SUPER_ADMIN');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'error' | 'info';
  } | null>(null);

  // Automatically enter admin panel if user is already authenticated
  useEffect(() => {
    if (authStatus === 'authenticated' && currentRole) {
      const targetPath = getHomeRouteForRole(currentRole);
      router.replace(targetPath);
    }
  }, [authStatus, currentRole, router]);

  const ROLE_OPTIONS = [
    {
      role: 'SUPER_ADMIN',
      label: 'Super Admin',
    },
    {
      role: 'FINANCE_ADMIN',
      label: 'Finance Admin',
    },
    {
      role: 'OPERATIONS_ADMIN',
      label: 'Operations Admin',
    },
    {
      role: 'RESTAURANT_MANAGER',
      label: 'Restaurant Manager',
    },
    {
      role: 'SUPPORT_AGENT',
      label: 'Support Agent',
    },
    {
      role: 'AUDITOR',
      label: 'Compliance Auditor',
    },
    {
      role: 'DARKSTORE_ADMIN',
      label: 'Darkstore Admin',
    },
  ];

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    setEmailError(undefined);
    setPasswordError(undefined);
    setAuthError(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(undefined);
    setPasswordError(undefined);
    setAuthError(null);
    setToast(null);

    if (!isConnected) {
      setToast({
        message: 'You are offline. Connect to internet to attempt sign-in.',
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
      }).unwrap();

      const backendRole = identity.role || selectedRole;

      dispatch(
        setSession({
          userId: identity.userId,
          role: backendRole as any,
          userType: 'ADMIN',
        }),
      );

      trackAnalyticsEvent('admin_auth_succeeded', { role: backendRole });
      const redirectPath = getHomeRouteForRole(backendRole);
      router.push(redirectPath);
      // Fallback in case Next.js client router requires hard navigation
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = redirectPath;
        }
      }, 100);
    } catch (err: any) {
      trackAnalyticsEvent('admin_auth_failed');
      const errorCode = err?.data?.error?.code || err?.error;
      const message = err?.data?.error?.message || loginErrorMessage(errorCode);
      setAuthError(message);
      setToast({
        message,
        variant: 'error',
      });
    }
  };

  const currentRoleInfo = ROLE_OPTIONS.find((r) => r.role === selectedRole) || ROLE_OPTIONS[0];

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
      noValidate
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Text as="h1" variant="heading1" style={{ fontSize: 24, fontWeight: 800, color: '#09090B' }}>
          Sign In to Admin Panel
        </Text>
        <Text variant="body" color={tokens.color.textSecondary} style={{ fontSize: 13, lineHeight: 1.5 }}>
          Select an admin role and enter your credentials to sign in.
        </Text>
      </div>

      {/* Role Selection Dropdown */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          backgroundColor: '#F4F4F5',
          padding: 16,
          borderRadius: 14,
          border: '1.5px solid #000000',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <label
          htmlFor="admin-role-select"
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#09090B',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Select Admin Role:
        </label>
        <select
          id="admin-role-select"
          value={selectedRole}
          onChange={(e) => handleRoleSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1.5px solid #000000',
            backgroundColor: '#FFFFFF',
            fontSize: 14,
            fontWeight: 800,
            color: '#09090B',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          {ROLE_OPTIONS.map((item) => (
            <option key={item.role} value={item.role}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextInput
          label="Admin Email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder=""
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(undefined);
            setAuthError(null);
          }}
          errorText={emailError}
          aria-label="Email"
          disabled={isLoading}
        />

        <div style={{ position: 'relative' }}>
          <TextInput
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder=""
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(undefined);
              setAuthError(null);
            }}
            errorText={passwordError}
            aria-label="Password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: 12,
              top: 36,
              background: 'none',
              border: 'none',
              color: '#71717A',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Display alert message below the password textfield on incorrect credentials */}
        {authError && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #EF4444',
              borderRadius: 10,
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 2,
            }}
            role="alert"
            aria-live="assertive"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{authError}</span>
          </div>
        )}
      </div>

      <Button
        type="submit"
        label={isLoading ? 'Authenticating...' : `Sign in as ${currentRoleInfo.label}`}
        aria-label="Sign in"
        loading={isLoading}
        disabled={isLoading}
        style={{
          marginTop: 4,
          padding: '12px 20px',
          backgroundColor: '#000000',
          color: '#FFFFFF',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 14,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      />

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
