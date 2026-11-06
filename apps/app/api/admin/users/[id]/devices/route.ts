import { NextResponse } from 'next/server';
import { getUserLoginDevices } from '@/lib/loginDeviceStore';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const devices = getUserLoginDevices(decodeURIComponent(id), false);
  return NextResponse.json({
    success: true,
    data: devices,
    error: null,
  });
}

