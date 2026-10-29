import { NextResponse } from 'next/server';
import { getAssignedOrdersForPartner, getOrderAssignment } from '@/lib/deliveryAssignmentStore';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const deliveryPartnerId = url.searchParams.get('deliveryPartnerId') || '';
    const status = url.searchParams.get('status') || 'ASSIGNED';
    const orderId = url.searchParams.get('orderId') || '';

    if (orderId) {
      const single = getOrderAssignment(orderId);
      return NextResponse.json(
        {
          success: true,
          data: single,
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
    }

    if (!deliveryPartnerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'deliveryPartnerId query parameter is required.',
          },
        },
        { status: 400 }
      );
    }

    const assignedOrders = getAssignedOrdersForPartner(deliveryPartnerId, status);

    return NextResponse.json(
      {
        success: true,
        message: 'Assigned orders fetched successfully.',
        data: assignedOrders,
        meta: {
          total: assignedOrders.length,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
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
          message: error?.message || 'Failed to fetch assigned delivery orders.',
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

