'use client';

import React, { useState } from 'react';
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
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [selectedRole, setSelectedRole] = useState<string>('SUPER_ADMIN');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [toast, setToast] = useState<{
    message: string;
    variant: 'error' | 'info';
  } | null>(null);

  const ROLE_OPTIONS = [
    {
      role: 'SUPER_ADMIN',
      label: 'Super Admin',
      defaultEmail: 'admin@foodie.local',
    },
    {
      role: 'AUDITOR',
      label: 'Compliance Auditor',
      defaultEmail: 'auditor@foodie.local',
    },
    {
      role: 'FINANCE_ADMIN',
      label: 'Finance Admin',
      defaultEmail: 'finance@foodie.local',
    },
    {
      role: 'OPERATIONS_ADMIN',
      label: 'Operations Admin',
      defaultEmail: 'ops@foodie.local',
    },
    {
      role: 'RESTAURANT_MANAGER',
      label: 'Restaurant Manager',
      defaultEmail: 'manager@foodie.local',
    },
    {
      role: 'SUPPORT_AGENT',
      label: 'Support Agent',
      defaultEmail: 'support@foodie.local',
    },
    {
      role: 'DARKSTORE_ADMIN',
      label: 'Darkstore Admin',
      defaultEmail: 'darkstore@foodie.local',
    },
  ];

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    setEmailError(undefined);
    setPasswordError(undefined);
    const matched = ROLE_OPTIONS.find((r) => r.role === roleKey);
    if (matched) {
      setEmail(matched.defaultEmail);
      setPassword('ChangeMe@123');
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(undefined);
    setPasswordError(undefined);
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
        role: selectedRole as any,
      } as any).unwrap();

      const backendRole = selectedRole || identity.role || 'SUPER_ADMIN';

      if (typeof window !== 'undefined') {
        localStorage.setItem('foodie_admin_role', backendRole);
        sessionStorage.setItem('foodie_admin_role', backendRole);
        localStorage.setItem('foodie_admin_user_id', identity.userId || '44444444-4444-4444-4444-444444444001');
        sessionStorage.setItem('foodie_admin_user_id', identity.userId || '44444444-4444-4444-4444-444444444001');
      }

      dispatch(
        setSession({
          userId: identity.userId || '44444444-4444-4444-4444-444444444001',
          role: backendRole as any,
          userType: 'ADMIN',
          fullName: backendRole === 'AUDITOR' ? 'Compliance Auditor' : 'Admin Operator',
        }),
      );

      trackAnalyticsEvent('admin_auth_succeeded', { role: backendRole });
      const redirectPath = getHomeRouteForRole(backendRole);
      window.location.href = redirectPath;
    } catch (err: any) {
      trackAnalyticsEvent('admin_auth_failed');
      const errorCode = err?.data?.error?.code || err?.error;
      const message = err?.data?.error?.message || loginErrorMessage(errorCode);
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

      {/* Role Selection Dropdown & Quick Chips */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#F4F4F5',
          padding: 16,
          borderRadius: 14,
          border: '1.5px solid #000000',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        </div>

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

        {/* Quick Role Select Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {ROLE_OPTIONS.map((r) => {
            const isSel = selectedRole === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleRoleSelect(r.role)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: isSel ? '1px solid #000000' : '1px solid #D4D4D8',
                  backgroundColor: isSel ? '#000000' : '#FFFFFF',
                  color: isSel ? '#FFFFFF' : '#3F3F46',
                  fontSize: 11,
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextInput
          label="Admin Email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder=""
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
