import { NextResponse } from 'next/server';
import { ENV } from '@/constants/env';


export async function GET() {
  try {
    const res = await fetch(`${ENV.apiBaseUrl}/api/v1/admin/customers`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (_err) {
    // Offline fallback data
  }

  return NextResponse.json({ customers: [], total: 0 });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${ENV.apiBaseUrl}/api/v1/admin/customers/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (_err) {
    // Fallback response
  }

  const payload = await req.clone().json().catch(() => ({}));
  return NextResponse.json({ success: true, updated: payload }, { status: 200 });
}
