import { NextResponse } from 'next/server';
import { readAccessTokenFromCookieHeader } from 'foodie-shared-web/auth';
import { getOnlineDeliveryPartners } from '@/lib/deliveryAssignmentStore';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') || '';
    const cookieHeader = request.headers.get('cookie');
    const accessToken = readAccessTokenFromCookieHeader(cookieHeader);

    const partners = await getOnlineDeliveryPartners(accessToken);

    // If status=online is requested, ensure partners are filtered
    const result = statusParam.toLowerCase() === 'online'
      ? partners.filter((p) => p.isOnline)
      : partners;

    return NextResponse.json(
      {
        success: true,
        message: 'Online delivery partners fetched successfully.',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          pagination: {
            page: 0,
            size: result.length,
            totalElements: result.length,
            totalPages: 1,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error?.message || 'Failed to fetch online delivery partners.',
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

