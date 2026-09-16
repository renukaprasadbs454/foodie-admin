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
