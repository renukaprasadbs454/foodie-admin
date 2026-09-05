import { NextResponse } from 'next/server';
import { readAccessTokenFromCookieHeader } from 'foodie-shared-web/auth';
import { ENV } from '@/constants/env';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const accessToken = readAccessTokenFromCookieHeader(cookieHeader);

    const { search } = new URL(req.url);
    const targetUrl = `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/customers${search}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(targetUrl, {
      headers,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Failed to fetch customer data' } },
      { status: 502 }
    );
  }

}

export async function PATCH(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const accessToken = readAccessTokenFromCookieHeader(cookieHeader);

    const body = await req.json();
    const { id, accountStatus, reason } = body;
    const targetUrl = `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/customers/${id}/status`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(targetUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ accountStatus, reason }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Failed to update customer status' } },
      { status: 502 }
    );
  }
}
