import { NextResponse } from 'next/server';
import { readAccessTokenFromCookieHeader } from 'foodie-shared-web/auth';
import { assignDeliveryPartnerToOrder } from '@/lib/deliveryAssignmentStore';

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { id: orderId } = await ctx.params;
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_ORDER_ID', message: 'Order ID is required.' },
        },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'Request body must be valid JSON.' },
        },
        { status: 400 }
      );
    }

    const deliveryPartnerId = body?.deliveryPartnerId;
    if (!deliveryPartnerId || typeof deliveryPartnerId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'deliveryPartnerId is required and must be a string.',
          },
        },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get('cookie');
    const accessToken = readAccessTokenFromCookieHeader(cookieHeader);

    const assignment = await assignDeliveryPartnerToOrder(
      orderId,
      deliveryPartnerId,
      accessToken,
      {
        orderNumber: body?.orderNumber,
        customerAddress: body?.customerAddress,
        restaurantAddress: body?.restaurantAddress,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Order assigned successfully to delivery partner ${assignment.deliveryPartnerName}.`,
        data: {
          orderId: assignment.orderId,
          orderNumber: assignment.orderNumber,
          assignedDeliveryPartnerId: assignment.deliveryPartnerId,
          assignedDeliveryPartnerName: assignment.deliveryPartnerName,
          assignedDeliveryPartnerPhone: assignment.deliveryPartnerPhone,
          status: 'ASSIGNED',
          assignedAt: assignment.assignedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ASSIGNMENT_FAILED',
          message: error?.message || 'Failed to assign delivery partner.',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

