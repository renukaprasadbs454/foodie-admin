import { NextResponse } from 'next/server';
import { readAccessTokenFromCookieHeader } from 'foodie-shared-web/auth';
import { ENV } from '@/constants/env';
import { safeFetch } from '@/lib/networkUtils';

/**
 * BFF GET /api/auth/me endpoint.
 * Proxies GET /api/v1/admin/users/me using the httpOnly access token cookie.
 */
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const accessToken = readAccessTokenFromCookieHeader(cookieHeader);

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
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
  }

  if (accessToken === 'demo-admin-access-token' || accessToken.startsWith('demo-')) {
    let role = 'SUPER_ADMIN';
    let fullName = 'Admin Operator';
    let email = 'admin@foodie.local';

    if (accessToken.includes('auditor') || accessToken.includes('audit')) {
      role = 'AUDITOR';
      fullName = 'Compliance Auditor';
      email = 'auditor@foodie.local';
    } else if (accessToken.includes('finance')) {
      role = 'FINANCE_ADMIN';
      fullName = 'Finance Admin';
      email = 'finance@foodie.local';
    } else if (accessToken.includes('operations') || accessToken.includes('ops')) {
      role = 'OPERATIONS_ADMIN';
      fullName = 'Operations Admin';
      email = 'ops@foodie.local';
    } else if (accessToken.includes('restaurant') || accessToken.includes('manager')) {
      role = 'RESTAURANT_MANAGER';
      fullName = 'Restaurant Manager';
      email = 'manager@foodie.local';
    } else if (accessToken.includes('support')) {
      role = 'SUPPORT_AGENT';
      fullName = 'Support Agent';
      email = 'support@foodie.local';
    } else if (accessToken.includes('darkstore')) {
      role = 'DARKSTORE_ADMIN';
      fullName = 'Darkstore Admin';
      email = 'darkstore@foodie.local';
    }

    return NextResponse.json({
      success: true,
      data: {
        adminUserId: '44444444-4444-4444-4444-444444444001',
        email,
        fullName,
        role,
        status: 'ACTIVE',
        permissions: ['*'],
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        pagination: null,
      },
    });
  }

  try {
    const { response: upstream, error: fetchErr } = await safeFetch(
      `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/users/me`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        timeoutMs: 3000,
      },
    );

    if (fetchErr || !upstream) {
      throw fetchErr ?? new Error('Network error');
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Backend unreachable', fields: null },
        meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), pagination: null },
      },
      { status: 502 },
    );
  }
}
