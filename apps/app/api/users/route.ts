import { NextResponse } from 'next/server';
import { loadPersistentAdminUsers } from '@/lib/adminSecurity';
import { getUserDeviceAggregate, getUserDeviceCounts, isDeviceOnline } from '@/lib/loginDeviceStore';

export async function GET() {
  const users = loadPersistentAdminUsers();
  const safeUsers = users.map(({ passwordHash: _, ...rest }) => {
    const agg = getUserDeviceAggregate(rest.id, rest.email);
    const counts = getUserDeviceCounts(rest.id, rest.email);
    const isOnline = agg.is_online || (agg.last_active_at ? isDeviceOnline(agg.last_active_at) : false);
    return {
      ...rest,
      device_count: agg.device_count,
      loginDevicesCount: agg.device_count,
      activeDevicesCount: isOnline ? Math.max(counts.active, 1) : counts.active,
      last_used: agg.last_used,
      last_used_formatted: agg.last_used_formatted || agg.lastUsedText,
      lastUsedText: agg.lastUsedText,
      last_active_at: agg.last_active_at,
      is_online: isOnline,
      devices: agg.devices,
    };
  });
  return NextResponse.json({
    success: true,
    data: safeUsers,
    error: null,
  });
}

