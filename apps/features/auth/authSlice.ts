import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AdminRole, AuthStatus, UserType } from 'foodie-shared-web';

/**
 * Admin authSlice — Blueprint §11.1 / shared-web AdminSessionIdentity.
 * Identity/session state driven strictly by backend authentication.
 */
export type AuthState = {
  userType: UserType | null;
  userId: string | null;
  role: AdminRole | null;
  fullName?: string | null;
  permissions?: string[];
  authStatus: AuthStatus;
};

function getInitialAuthState(): AuthState {
  if (typeof window !== 'undefined') {
    try {
      const savedRole = localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role');
      const savedUserId = localStorage.getItem('foodie_admin_user_id') || sessionStorage.getItem('foodie_admin_user_id');
      if (savedRole && savedUserId) {
        return {
          userType: 'ADMIN',
          userId: savedUserId,
          role: savedRole as AdminRole,
          fullName: savedRole === 'AUDITOR' ? 'Compliance Auditor' : 'Admin Operator',
          permissions: [],
          authStatus: 'authenticated',
        };
      }
    } catch {
      // ignore storage access errors
    }
  }
  return {
    userType: null,
    userId: null,
    role: null,
    fullName: null,
    permissions: [],
    authStatus: 'unauthenticated',
  };
}

const initialState: AuthState = getInitialAuthState();

export type SetSessionPayload = {
  userId: string;
  role: AdminRole;
  userType?: UserType;
  fullName?: string;
  permissions?: string[];
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<SetSessionPayload>) {
      state.userType = action.payload.userType ?? 'ADMIN';
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.fullName = action.payload.fullName ?? null;
      state.permissions = action.payload.permissions ?? [];
      state.authStatus = 'authenticated';
      if (typeof window !== 'undefined') {
        if (action.payload.role) {
          localStorage.setItem('foodie_admin_role', action.payload.role);
          sessionStorage.setItem('foodie_admin_role', action.payload.role);
        }
        if (action.payload.userId) {
          localStorage.setItem('foodie_admin_user_id', action.payload.userId);
          sessionStorage.setItem('foodie_admin_user_id', action.payload.userId);
        }
      }
    },
    markCookieSessionValid(state) {
      state.authStatus = 'authenticated';
      state.userType = 'ADMIN';
    },
    setAuthStatus(state, action: PayloadAction<AuthStatus>) {
      state.authStatus = action.payload;
    },
    clearSession() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('foodie_admin_role');
        sessionStorage.removeItem('foodie_admin_role');
        localStorage.removeItem('foodie_admin_user_id');
        sessionStorage.removeItem('foodie_admin_user_id');
      }
      return {
        userType: null,
        userId: null,
        role: null,
        fullName: null,
        permissions: [],
        authStatus: 'unauthenticated' as const,
      };
    },
  },
});

export const { setSession, setAuthStatus, markCookieSessionValid, clearSession } =
  authSlice.actions;

export const selectAuthStatus = (state: { auth: AuthState }) =>
  state.auth.authStatus;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.authStatus === 'authenticated';
export const selectAdminRole = (state: { auth: AuthState }) => state.auth.role;
export const selectUserId = (state: { auth: AuthState }) => state.auth.userId;

export default authSlice.reducer;
