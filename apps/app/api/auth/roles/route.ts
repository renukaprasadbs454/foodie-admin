import { NextResponse } from 'next/server';
import { ENV } from '@/constants/env';
import { safeFetch } from '@/lib/networkUtils';

export interface AdminRoleOption {
  key: string;
  role: string;
  label: string;
  zoneId?: string | null;
  zoneName?: string | null;
  defaultEmail?: string | null;
}

function formatZoneAdminLabel(zoneName: string): string {
  if (!zoneName || !zoneName.trim()) {
    return 'Zone Admin';
  }
  const clean = zoneName.trim();
  const lower = clean.toLowerCase();
  if (lower.endsWith('zone admin') || lower.endsWith('admin')) {
    return clean;
  }
  if (lower.endsWith('zone')) {
    return `${clean} Admin`;
  }
  return `${clean} Zone Admin`;
}

export async function GET() {
  const backendUrl = ENV.apiBaseUrl.replace(/\/$/, '');

  // 1. Attempt to fetch live dynamic roles from backend
  try {
    const { response: upstream } = await safeFetch(`${backendUrl}/api/v1/auth/admin-roles`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: 3000,
    });

    if (upstream && upstream.ok) {
      const json = await upstream.json();
      const rawData = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      if (rawData.length > 0) {
        const globalAny = global as unknown as Record<string, unknown>;
        const usersStore = (globalAny.ADMIN_USERS_STORE as any[]) || [];
        const combined = [...rawData];
        for (const u of usersStore) {
          if (u.assignedZoneId) {
            const label = formatZoneAdminLabel(u.assignedZoneName || u.assignedZoneId);
            if (!combined.some((item: any) => item.label === label || item.zoneId === u.assignedZoneId)) {
              combined.push({
                key: `ZONE_ADMIN_${u.assignedZoneId}`,
                role: u.role || 'OPS',
                label,
                zoneId: u.assignedZoneId,
                zoneName: u.assignedZoneName || u.assignedZoneId,
                defaultEmail: u.email || null,
              });
            }
          }
        }
        return NextResponse.json({
          success: true,
          data: combined,
          error: null,
          meta: json?.meta || { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), pagination: null },
        }, { status: 200 });
      }
    }
  } catch {
    // Upstream unavailable, use fallback
  }

  // 2. Fallback dynamic role derivation using global stores
  const globalAny = global as unknown as Record<string, unknown>;
  const usersStore = (globalAny.ADMIN_USERS_STORE as any[]) || [];

  const defaultBangalore = {
    id: 'dz-bangalore',
    zoneName: 'Bangalore Zone',
  };
  const defaultTumkur = {
    id: 'dz-tumkur',
    zoneName: 'Tumkur Zone',
  };

  const zonesMap = new Map<string, { id: string; zoneName: string }>();
  zonesMap.set('dz-bangalore', defaultBangalore);
  zonesMap.set('dz-tumkur', defaultTumkur);

  // Collect any custom zones created in ADMIN_USERS_STORE
  for (const u of usersStore) {
    if (u.assignedZoneId) {
      const cleanId = u.assignedZoneId.trim().toLowerCase();
      if (!zonesMap.has(cleanId)) {
        zonesMap.set(cleanId, {
          id: u.assignedZoneId.trim(),
          zoneName: u.assignedZoneName || u.assignedZoneId.trim(),
        });
      }
    }
  }

  // Collect from location history if available
  const loginHistory = (globalAny.ADMIN_ZONE_LOGIN_HISTORY as any[]) || [];
  for (const h of loginHistory) {
    if (h.zoneId) {
      const cleanId = h.zoneId.trim().toLowerCase();
      if (!zonesMap.has(cleanId)) {
        zonesMap.set(cleanId, {
          id: h.zoneId.trim(),
          zoneName: h.zoneName || h.zoneId.trim(),
        });
      }
    }
  }

  const sortedZones = Array.from(zonesMap.values()).sort((a, b) => {
    if (a.id.toLowerCase() === 'dz-bangalore') return -1;
    if (b.id.toLowerCase() === 'dz-bangalore') return 1;
    if (a.id.toLowerCase() === 'dz-tumkur') return -1;
    if (b.id.toLowerCase() === 'dz-tumkur') return 1;
    return a.zoneName.localeCompare(b.zoneName);
  });

  const options: AdminRoleOption[] = [];

  // Option 1: Super Admin
  options.push({
    key: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    zoneId: null,
    zoneName: null,
    defaultEmail: 'admin@foodie.local',
  });

  // Dynamic Zone Admins in format "[Zone Name] Admin"
  for (const z of sortedZones) {
    const userForZone = usersStore.find(
      (u) => u.assignedZoneId && u.assignedZoneId.toLowerCase() === z.id.toLowerCase()
    );
    const role = userForZone?.role || 'OPS';
    const email = userForZone?.email || (z.id === 'dz-bangalore' ? 'ops@foodie.local' : (z.id === 'dz-tumkur' ? 'finance@foodie.local' : null));

    options.push({
      key: `ZONE_ADMIN_${z.id}`,
      role,
      label: formatZoneAdminLabel(z.zoneName),
      zoneId: z.id,
      zoneName: z.zoneName,
      defaultEmail: email,
    });
  }

  // Existing Standard Roles
  options.push({ key: 'AUDITOR', role: 'AUDITOR', label: 'Compliance Auditor', defaultEmail: 'auditor@foodie.local' });
  options.push({ key: 'FINANCE_ADMIN', role: 'FINANCE_ADMIN', label: 'Finance Admin', defaultEmail: 'finance@foodie.local' });
  options.push({ key: 'OPERATIONS_ADMIN', role: 'OPERATIONS_ADMIN', label: 'Operations Admin', defaultEmail: 'ops@foodie.local' });
  options.push({ key: 'RESTAURANT_MANAGER', role: 'RESTAURANT_MANAGER', label: 'Restaurant Manager', defaultEmail: 'manager@foodie.local' });
  options.push({ key: 'SUPPORT_AGENT', role: 'SUPPORT_AGENT', label: 'Support Agent', defaultEmail: 'support@foodie.local' });
  options.push({ key: 'DARKSTORE_ADMIN', role: 'DARKSTORE_ADMIN', label: 'Darkstore Admin', defaultEmail: 'darkstore@foodie.local' });

  return NextResponse.json({
    success: true,
    data: options,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      pagination: null,
    },
  }, { status: 200 });
}
