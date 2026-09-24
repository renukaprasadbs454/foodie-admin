import { NextResponse } from 'next/server';
import { readAccessTokenFromCookieHeader } from 'foodie-shared-web/auth';
import { ENV } from '@/constants/env';
import { sanitizeBffPathSegments } from '@/lib/bffPath';
import { safeFetch } from '@/lib/networkUtils';

/**
 * Proxy for direct /api/v1/* requests in Next.js.
 * Proxies incoming /api/v1/[...path] requests directly to Spring Boot backend at ENV.apiBaseUrl/api/v1/[...path].
 */
async function proxyApiV1(request: Request, pathSegments: string[]) {
  const cookieHeader = request.headers.get('cookie');
  const authHeader = request.headers.get('authorization');
  const accessToken = readAccessTokenFromCookieHeader(cookieHeader) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  const validated = sanitizeBffPathSegments(pathSegments);
  const targetPath = validated.ok ? validated.targetPath : pathSegments.join('/');

  const incomingUrl = new URL(request.url);
  const targetUrl = `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/${targetPath}${incomingUrl.search}`;

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const idempotency = request.headers.get('idempotency-key');
  if (idempotency) headers.set('Idempotency-Key', idempotency);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = Buffer.from(await request.arrayBuffer());
  }

  try {
    const { response: upstream, error: fetchErr } = await safeFetch(targetUrl, {
      ...init,
      timeoutMs: 5000,
    });

    if (fetchErr) {
      throw fetchErr;
    }

    if (upstream) {
      const body = await upstream.arrayBuffer();
      return new NextResponse(body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Backend unreachable', fields: null },
        meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), pagination: null },
      },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Backend proxy error', fields: null },
        meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), pagination: null },
      },
      { status: 502 }
    );
  }
}

type Ctx = { params: Promise<any> };

export async function GET(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyApiV1(request, path);
}

export async function POST(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyApiV1(request, path);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyApiV1(request, path);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyApiV1(request, path);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyApiV1(request, path);
}
