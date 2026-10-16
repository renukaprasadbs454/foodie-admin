import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildAuthSetCookieHeaders,
  buildClearAuthSetCookieHeaders,
  readRefreshTokenFromCookieHeader,
} from 'foodie-shared-web/auth';
import { ENV } from '@/constants/env';
import { safeFetch } from '@/lib/networkUtils';

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  if (request.url.startsWith('https:')) {
    return true;
  }
  return process.env.FOODIE_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && !request.url.includes('localhost'));
}

function applyAuthCookies(
  response: NextResponse,
  request: Request,
  tokens: { accessToken: string; refreshToken: string }
) {
  const isSecure = isSecureRequest(request);
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 15 * 60,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
  });
}

function clearAuthCookies(response: NextResponse, request: Request) {
  const isSecure = isSecureRequest(request);
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
  });
}

/**
 * BFF refresh — Blueprint §7.4 / System Design §9.4.
 * Reads httpOnly refresh cookie, calls backend refresh, rotates Set-Cookie.
 * TD-012: never return access/refresh token strings in JSON body.
 * GAP-API-13: returns session identity (userId / role / userType) for Redux.
 */
export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const refreshToken = readRefreshTokenFromCookieHeader(cookieHeader);

  if (!refreshToken) {
    const response = NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing refresh token',
          fields: null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          pagination: null,
        },
      },
      { status: 401 },
    );
    clearAuthCookies(response, request);
    return response;
  }

  // Handle demo refresh token without calling backend
  if (refreshToken.startsWith('demo-') || refreshToken === 'demo-admin-refresh-token') {
    let role = 'SUPER_ADMIN';
    if (refreshToken.includes('auditor') || refreshToken.includes('audit')) {
      role = 'AUDITOR';
    } else if (refreshToken.includes('finance')) {
      role = 'FINANCE_ADMIN';
    } else if (refreshToken.includes('operations') || refreshToken.includes('ops')) {
      role = 'OPERATIONS_ADMIN';
    } else if (refreshToken.includes('restaurant') || refreshToken.includes('manager')) {
      role = 'RESTAURANT_MANAGER';
    } else if (refreshToken.includes('support')) {
      role = 'SUPPORT_AGENT';
    } else if (refreshToken.includes('darkstore')) {
      role = 'DARKSTORE_ADMIN';
    }

    const response = NextResponse.json({
      success: true,
      data: {
        userId: '44444444-4444-4444-4444-444444444001',
        userType: 'ADMIN',
        role,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        pagination: null,
      },
    }, { status: 200 });

    const tokenSlug = role.toLowerCase().replace(/_/g, '-');
    applyAuthCookies(response, request, {
      accessToken: `demo-admin-${tokenSlug}-access-token`,
      refreshToken: `demo-admin-${tokenSlug}-refresh-token`,
    });
    return response;
  }

  try {
    const { response: upstream, error: fetchErr } = await safeFetch(
      `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/auth/refresh`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        timeoutMs: 3000,
      },
    );

    if (fetchErr || !upstream) {
      throw fetchErr ?? new Error('Network error');
    }

    const envelope = (await upstream.json()) as {
      success?: boolean;
      data?: {
        accessToken?: string;
        refreshToken?: string;
        userId?: string;
        userType?: string;
        role?: string | null;
      } | null;
      error?: { code?: string; message?: string; fields?: unknown } | null;
      meta?: {
        timestamp?: string;
        requestId?: string;
        pagination?: unknown;
      } | null;
    };

    const meta = envelope?.meta ?? {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      pagination: null,
    };

    if (
      envelope?.success &&
      envelope.data?.accessToken &&
      envelope.data?.refreshToken
    ) {
      const identity =
        envelope.data.userType === 'ADMIN' &&
        envelope.data.userId &&
        envelope.data.role
          ? {
              userId: envelope.data.userId,
              userType: 'ADMIN' as const,
              role: envelope.data.role,
            }
          : null;

      const response = NextResponse.json(
        {
          success: true,
          data: identity,
          error: null,
          meta,
        },
        { status: upstream.status },
      );
      applyAuthCookies(response, request, {
        accessToken: envelope.data.accessToken,
        refreshToken: envelope.data.refreshToken,
      });
      return response;
    }

    const response = NextResponse.json(
      {
        success: false,
        data: null,
        error: envelope?.error ?? {
          code: 'UNAUTHORIZED',
          message: 'Refresh failed',
          fields: null,
        },
        meta,
      },
      { status: upstream.status },
    );
    clearAuthCookies(response, request);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Refresh failed',
          fields: null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          pagination: null,
        },
      },
      { status: 401 },
    );
    clearAuthCookies(response, request);
    return response;
  }
}
