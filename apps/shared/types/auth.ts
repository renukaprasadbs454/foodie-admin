/**
 * Admin session types — Blueprint §11.1 / §12.1 / System Design §6.4 / §7.1.
 * Admin NEVER holds accessToken or refreshToken in client JS or Redux.
 */
export type UserType = 'ADMIN';

export type AdminRole =
  | 'OPS'
  | 'OPERATIONS_ADMIN'
  | 'FINANCE'
  | 'FINANCE_ADMIN'
  | 'SUPPORT'
  | 'SUPPORT_AGENT'
  | 'SUPER_ADMIN'
  | 'AUDITOR'
  | 'RESTAURANT_MANAGER'
  | 'DARKSTORE_ADMIN';

export type AuthStatus =
  | 'idle'
  | 'authenticating'
  | 'authenticated'
  | 'unauthenticated';

/** Client-visible session identity only — no token fields. */
export type AdminSessionIdentity = {
  userType: UserType;
  userId: string;
  role: AdminRole;
  authStatus: AuthStatus;
};
