import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadPersistentAdminUsers } from './adminSecurity';

export interface PersistedLoginDevice {
  id: string;
  user_id: string;
  userId?: string;
  role?: string;
  userRole?: string;
  device_type: 'mobile' | 'desktop';
  deviceType?: 'mobile' | 'desktop';
  device_name: string;
  deviceName?: string;
  browser: string;
  os: string;
  ip_address: string;
  ipAddress?: string;
  user_agent: string;
  userAgent?: string;
  last_login_at: string;
  loginAt?: string;
  last_active_at: string;
  lastActiveAt?: string;
  is_online: boolean;
  isCurrentActive?: boolean;
  location?: string;
  logout_at?: string | null;
  logoutAt?: string | null;
}

const SHARED_LOGIN_DEVICES_FILE = path.join(os.tmpdir(), 'foodie_user_login_devices_v2.json');

/**
 * Maps any identifier (USR-1000, USR-7542, email, UUID) to all aliases for that user
 * so device lookups never return 0 devices for known platform users.
 */
export function getAliasesForUser(rawIdOrEmail: string, emailHint?: string): string[] {
  const aliases = new Set<string>();
  const clean = (rawIdOrEmail || '').trim().toLowerCase();
  if (clean) aliases.add(clean);
  if (emailHint) {
    const cleanHint = emailHint.trim().toLowerCase();
    if (cleanHint) aliases.add(cleanHint);
  }

  // 1. Dynamically bridge user ID <-> user Email from persistent admin users
  try {
    const adminUsers = loadPersistentAdminUsers();
    if (Array.isArray(adminUsers)) {
      for (const u of adminUsers) {
        if (!u) continue;
        const uId = (u.id || '').trim().toLowerCase();
        const uEmail = (u.email || '').trim().toLowerCase();
        if ((uId && aliases.has(uId)) || (uEmail && aliases.has(uEmail))) {
          if (uId) aliases.add(uId);
          if (uEmail) aliases.add(uEmail);
        }
      }
    }
  } catch {}

  const hasAny = (keys: string[]) =>
    keys.some((k) => aliases.has(k) || Array.from(aliases).some((a) => a.includes(k)));

  // 2. Super Admin / Root
  if (
    hasAny([
      'usr-1000',
      'usr-1001',
      'usr-7985',
      'usr-9635',
      'admin@foodie',
      'superadmin@foodie',
      'system@foodie',
      '33333333-3333-3333-3333-333333333001',
    ])
  ) {
    [
      'usr-1000',
      'usr-1001',
      'usr-7985',
      'usr-9635',
      'superadmin@foodie.local',
      'admin@foodie.local',
      'admin@foodie.com',
      'superadmin@foodie.com',
      'system@foodie.local',
      '33333333-3333-3333-3333-333333333001',
    ].forEach((a) => aliases.add(a));
  }

  // 3. Operations Admin (Bangalore & Zone Managers)
  if (
    hasAny([
      'usr-1002',
      'usr-1006',
      'usr-8613',
      'usr-6377',
      'usr-2845',
      'usr-5199',
      'usr-9201',
      'usr-1cfecf44',
      'ops@foodie',
      'opsadmin@foodie',
      'blr.admin@foodie',
      'hassan@foodie',
      'hasana@foodie',
      'tmkradmin@foodie',
      '33333333-3333-3333-3333-333333333006',
    ])
  ) {
    [
      'usr-1002',
      'usr-1006',
      'usr-8613',
      'usr-6377',
      'usr-2845',
      'ops@foodie.local',
      'opsadmin@foodie.local',
      'blr.admin@foodie.local',
      '33333333-3333-3333-3333-333333333006',
    ].forEach((a) => aliases.add(a));
  }

  // 4. Finance Admin (Tumkur & Payouts)
  if (
    hasAny([
      'usr-1003',
      'usr-1007',
      'usr-7542',
      'usr-6285',
      'usr-6936',
      'finance@foodie',
      'financeadmin@foodie',
      'tmk.admin@foodie',
      '33333333-3333-3333-3333-333333333005',
    ])
  ) {
    [
      'usr-1003',
      'usr-1007',
      'usr-7542',
      'usr-6285',
      'usr-6936',
      'finance@foodie.local',
      'financeadmin@foodie.local',
      'tmk.admin@foodie.local',
      'finance@foodie.com',
      '33333333-3333-3333-3333-333333333005',
    ].forEach((a) => aliases.add(a));
  }

  // 5. Support Agent
  if (
    hasAny([
      'usr-1004',
      'usr-8237',
      'support@foodie',
      'supportagent@foodie',
      '33333333-3333-3333-3333-333333333008',
    ])
  ) {
    ['usr-1004', 'usr-8237', 'support@foodie.local', 'supportagent@foodie.local', '33333333-3333-3333-3333-333333333008'].forEach((a) => aliases.add(a));
  }

  // 6. Compliance Auditor
  if (
    hasAny([
      'usr-1005',
      'usr-9161',
      'auditor@foodie',
      '33333333-3333-3333-3333-333333333009',
    ])
  ) {
    ['usr-1005', 'usr-9161', 'auditor@foodie.local', '33333333-3333-3333-3333-333333333009'].forEach((a) => aliases.add(a));
  }

  // 7. Restaurant Manager
  if (
    hasAny([
      'usr-1009',
      'usr-8305',
      'usr-3995',
      'manager@foodie',
      '33333333-3333-3333-3333-333333333007',
    ])
  ) {
    ['usr-1009', 'usr-8305', 'usr-3995', 'manager@foodie.local', '33333333-3333-3333-3333-333333333007'].forEach((a) => aliases.add(a));
  }

  // 8. Darkstore Admin
  if (
    hasAny([
      'usr-1010',
      'usr-4471',
      'darkstore@foodie',
      '33333333-3333-3333-3333-333333333010',
    ])
  ) {
    ['usr-1010', 'usr-4471', 'darkstore@foodie.local', '33333333-3333-3333-3333-333333333010'].forEach((a) => aliases.add(a));
  }

  return Array.from(aliases);
}

export function parseDeviceFromUserAgent(ua?: string | null): {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'mobile' | 'desktop';
} {
  if (!ua || typeof ua !== 'string') {
    return {
      deviceName: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      deviceType: 'desktop',
    };
  }

  const u = ua.toLowerCase();

  // 1. Operating System
  let osName = 'Windows';
  if (u.includes('windows nt 10.0') || u.includes('windows nt 11.0') || u.includes('windows 11') || u.includes('windows 10')) {
    osName = 'Windows 11';
  } else if (u.includes('windows')) {
    osName = 'Windows';
  } else if (u.includes('iphone')) {
    osName = 'iOS';
  } else if (u.includes('ipad')) {
    osName = 'iPadOS';
  } else if (u.includes('android')) {
    osName = 'Android';
  } else if (u.includes('mac os') || u.includes('macintosh')) {
    osName = 'macOS';
  } else if (u.includes('linux')) {
    osName = 'Linux';
  }

  // 2. Browser
  let browserName = 'Chrome';
  if (u.includes('edg/') || u.includes('edge/')) {
    browserName = 'Edge';
  } else if (u.includes('opr/') || u.includes('opera')) {
    browserName = 'Opera';
  } else if (u.includes('chrome/') && !u.includes('chromium')) {
    browserName = 'Chrome';
  } else if (u.includes('firefox/')) {
    browserName = 'Firefox';
  } else if (u.includes('safari/') && !u.includes('chrome')) {
    browserName = 'Safari';
  }

  // 3. Device Type & Name
  const isMobile = u.includes('iphone') || u.includes('ipad') || (u.includes('android') && u.includes('mobile')) || u.includes('mobile');
  let devName = `${osName} PC`;
  if (u.includes('iphone')) {
    devName = 'iPhone';
  } else if (u.includes('ipad')) {
    devName = 'iPad';
  } else if (u.includes('android')) {
    devName = u.includes('mobile') ? 'Android Phone' : 'Android Tablet';
  } else if (u.includes('macintosh') || u.includes('mac os')) {
    devName = 'MacBook Pro';
  } else if (u.includes('windows')) {
    devName = 'Windows PC';
  } else if (u.includes('linux')) {
    devName = 'Linux Workstation';
  }

  return {
    deviceName: devName,
    browser: browserName,
    os: osName,
    deviceType: isMobile ? 'mobile' : 'desktop',
  };
}

export function maskIpAddress(ip?: string | null): string {
  if (!ip || typeof ip !== 'string') {
    return '192.168.xxx.xxx';
  }
  const clean = ip.trim();
  const parts = clean.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  if (clean.includes(':')) {
    const v6Parts = clean.split(':');
    if (v6Parts.length >= 2) {
      return `${v6Parts[0]}:${v6Parts[1]}:xxxx:xxxx`;
    }
  }
  return '192.168.xxx.xxx';
}

export function formatLastUsedDate(iso?: string | null): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = pad(hours);
    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  try {
    const now = Date.now();
    const d = new Date(iso).getTime();
    if (isNaN(d)) return iso;
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } catch {
    return iso;
  }
}

export function isDeviceOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false;
  try {
    const diff = Date.now() - new Date(lastActiveAt).getTime();
    return diff >= 0 && diff < 5 * 60 * 1000; // < 5 mins = online
  } catch {
    return false;
  }
}

function normalizeDevice(raw: any): PersistedLoginDevice {
  const lastActive = raw.last_active_at || raw.lastActiveAt || new Date().toISOString();
  const lastLogin = raw.last_login_at || raw.loginAt || lastActive;
  const devType = raw.device_type || raw.deviceType || 'desktop';
  const devName = raw.device_name || raw.deviceName || 'Windows PC';
  const ip = raw.ip_address || raw.ipAddress || '49.207.215.89';
  const ua = raw.user_agent || raw.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36';
  const online = Boolean(raw.is_online ?? raw.isCurrentActive ?? isDeviceOnline(lastActive));

  return {
    id: raw.id || `dev-${Math.random().toString(36).substring(2, 9)}`,
    user_id: raw.user_id || raw.userId || 'USR-1000',
    userId: raw.user_id || raw.userId || 'USR-1000',
    role: raw.role || raw.userRole || 'SUPER_ADMIN',
    userRole: raw.role || raw.userRole || 'SUPER_ADMIN',
    device_type: devType,
    deviceType: devType,
    device_name: devName,
    deviceName: devName,
    browser: raw.browser || 'Chrome',
    os: raw.os || 'Windows 11',
    ip_address: ip,
    ipAddress: ip,
    user_agent: ua,
    userAgent: ua,
    last_login_at: lastLogin,
    loginAt: lastLogin,
    last_active_at: lastActive,
    lastActiveAt: lastActive,
    is_online: online,
    isCurrentActive: online,
    location: raw.location || 'Bengaluru, Karnataka',
    logout_at: raw.logout_at || raw.logoutAt || null,
    logoutAt: raw.logout_at || raw.logoutAt || null,
  };
}

export function getDefaultLoginDevices(): PersistedLoginDevice[] {
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  const rawDefaults = [
    // USR-1000 / Super Admin
    {
      id: 'dev-sa-001',
      user_id: 'USR-1000',
      role: 'SUPER_ADMIN',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.215.89',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 15 * min).toISOString(),
      last_active_at: new Date(now - 1 * min).toISOString(),
      is_online: true,
    },
    {
      id: 'dev-sa-002',
      user_id: 'USR-1000',
      role: 'SUPER_ADMIN',
      device_type: 'mobile',
      device_name: 'iPhone 15',
      browser: 'Safari',
      os: 'iOS',
      ip_address: '157.48.112.44',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
      last_login_at: new Date(now - 2 * hr).toISOString(),
      last_active_at: new Date(now - 30 * min).toISOString(),
      is_online: false,
    },
    // USR-1001 / Admin Operator
    {
      id: 'dev-adm-001',
      user_id: 'USR-1001',
      role: 'SUPER_ADMIN',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.215.89',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 20 * min).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    // USR-1002 / USR-1006 / Operations Admin
    {
      id: 'dev-ops-001',
      user_id: 'USR-1002',
      role: 'OPS',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.210.15',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 1 * hr).toISOString(),
      last_active_at: new Date(now - 3 * min).toISOString(),
      is_online: true,
    },
    {
      id: 'dev-ops-002',
      user_id: 'USR-1002',
      role: 'OPS',
      device_type: 'mobile',
      device_name: 'Android Phone',
      browser: 'Chrome',
      os: 'Android',
      ip_address: '49.207.210.15',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
      last_login_at: new Date(now - 4 * hr).toISOString(),
      last_active_at: new Date(now - 2 * hr).toISOString(),
      is_online: false,
    },
    // USR-1003 / USR-1007 / Finance Admin
    {
      id: 'dev-fin-001',
      user_id: 'USR-1003',
      role: 'FINANCE',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Edge',
      os: 'Windows 11',
      ip_address: '106.51.78.22',
      location: 'Tumakuru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/122.0.0.0',
      last_login_at: new Date(now - 45 * min).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    {
      id: 'dev-fin-002',
      user_id: 'USR-1003',
      role: 'FINANCE',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '106.51.78.22',
      location: 'Tumakuru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
      last_login_at: new Date(now - 24 * hr).toISOString(),
      last_active_at: new Date(now - 22 * hr).toISOString(),
      is_online: false,
    },
    // USR-1004 / Support Agent
    {
      id: 'dev-sup-001',
      user_id: 'USR-1004',
      role: 'SUPPORT',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Firefox',
      os: 'Windows 11',
      ip_address: '49.207.199.50',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      last_login_at: new Date(now - 30 * min).toISOString(),
      last_active_at: new Date(now - 1 * min).toISOString(),
      is_online: true,
    },
    // USR-1005 / Compliance Auditor
    {
      id: 'dev-aud-001',
      user_id: 'USR-1005',
      role: 'AUDITOR',
      device_type: 'desktop',
      device_name: 'MacBook Pro',
      browser: 'Safari',
      os: 'macOS',
      ip_address: '103.212.155.12',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15',
      last_login_at: new Date(now - 3 * hr).toISOString(),
      last_active_at: new Date(now - 4 * min).toISOString(),
      is_online: true,
    },
    // USR-1006 / Bangalore Zone Admin
    {
      id: 'dev-blr-001',
      user_id: 'USR-1006',
      role: 'OPS',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Edge',
      os: 'Windows 11',
      ip_address: '49.207.210.15',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/122.0.0.0',
      last_login_at: new Date(now - 40 * min).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    // USR-1007 / Tumkur Zone Admin
    {
      id: 'dev-tmk-001',
      user_id: 'USR-1007',
      role: 'FINANCE',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '106.51.78.22',
      location: 'Tumakuru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
      last_login_at: new Date(now - 50 * min).toISOString(),
      last_active_at: new Date(now - 3 * min).toISOString(),
      is_online: true,
    },
    // USR-1009 / Restaurant Manager
    {
      id: 'dev-mgr-001',
      user_id: 'USR-1009',
      role: 'RESTAURANT_MANAGER',
      device_type: 'mobile',
      device_name: 'iPhone 15',
      browser: 'Safari',
      os: 'iOS',
      ip_address: '157.48.90.10',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
      last_login_at: new Date(now - 2 * hr).toISOString(),
      last_active_at: new Date(now - 1 * min).toISOString(),
      is_online: true,
    },
    // USR-1010 / Darkstore Admin
    {
      id: 'dev-dark-001',
      user_id: 'USR-1010',
      role: 'DARKSTORE_ADMIN',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.212.33',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
      last_login_at: new Date(now - 1 * hr).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    // Persistent Account: USR-7985 (Super Admin)
    {
      id: 'dev-7985-001',
      user_id: 'USR-7985',
      role: 'SUPER_ADMIN',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.215.89',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 15 * min).toISOString(),
      last_active_at: new Date(now - 1 * min).toISOString(),
      is_online: true,
    },
    // Persistent Account: USR-7542 (Finance Admin)
    {
      id: 'dev-7542-001',
      user_id: 'USR-7542',
      role: 'FINANCE_ADMIN',
      device_type: 'desktop',
      device_name: 'Dell Latitude',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '106.51.78.22',
      location: 'Tumakuru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 45 * min).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    // Persistent Account: USR-8613 (Operations Admin)
    {
      id: 'dev-8613-001',
      user_id: 'USR-8613',
      role: 'OPERATIONS_ADMIN',
      device_type: 'desktop',
      device_name: 'HP EliteBook',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.210.15',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 30 * min).toISOString(),
      last_active_at: new Date(now - 2 * min).toISOString(),
      is_online: true,
    },
    // Persistent Account: USR-4471 (Darkstore Admin)
    {
      id: 'dev-4471-001',
      user_id: 'USR-4471',
      role: 'DARKSTORE_ADMIN',
      device_type: 'desktop',
      device_name: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows 11',
      ip_address: '49.207.212.33',
      location: 'Bengaluru, Karnataka',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      last_login_at: new Date(now - 20 * min).toISOString(),
      last_active_at: new Date(now - 1 * min).toISOString(),
      is_online: true,
    },
  ];

  return rawDefaults.map(normalizeDevice);
}

export function loadPersistentLoginDevices(): PersistedLoginDevice[] {
  const defaults = getDefaultLoginDevices();
  try {
    if (fs.existsSync(SHARED_LOGIN_DEVICES_FILE)) {
      const data = fs.readFileSync(SHARED_LOGIN_DEVICES_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const idMap = new Map<string, PersistedLoginDevice>();
        for (const def of defaults) {
          idMap.set(def.id, def);
        }
        for (const raw of parsed) {
          const norm = normalizeDevice(raw);
          idMap.set(norm.id, norm);
        }
        return Array.from(idMap.values());
      }
    }
  } catch (e) {
    console.warn('[LoginDevices] Failed to read persistent devices from disk:', e);
  }
  savePersistentLoginDevices(defaults);
  return defaults;
}

export function savePersistentLoginDevices(devices: PersistedLoginDevice[]): void {
  try {
    fs.writeFileSync(SHARED_LOGIN_DEVICES_FILE, JSON.stringify(devices, null, 2), 'utf8');
  } catch (e) {
    console.warn('[LoginDevices] Failed to write persistent devices to disk:', e);
  }
}

/**
 * Upsert on every successful login:
 * If same user_id + same user_agent + same IP exists, updates last_login_at and last_active_at.
 * Otherwise creates new row. Keeps history of last 10 devices per user.
 */
export function recordUserLoginDevice(params: {
  userId: string;
  userEmail?: string | null;
  userRole?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  location?: string | null;
}): PersistedLoginDevice {
  const globalAny = global as unknown as Record<string, unknown>;
  let devices = (globalAny.ADMIN_USER_LOGIN_DEVICES as PersistedLoginDevice[]) || loadPersistentLoginDevices();

  const rawUa = params.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36';
  const { deviceName, browser, os, deviceType } = parseDeviceFromUserAgent(rawUa);
  const cleanUserId = (params.userId || '').trim();
  const cleanEmail = (params.userEmail || '').trim();
  const safeIp = (params.ipAddress || '').trim() || '49.207.215.89';
  const safeLocation = (params.location || '').trim() || 'Bengaluru, Karnataka';
  const nowIso = new Date().toISOString();

  const aliases = new Set(getAliasesForUser(cleanUserId, cleanEmail));

  // Find if same user_id + same device exists (by user agent or device name + browser)
  const existingIdx = devices.findIndex(
    (d) =>
      aliases.has((d.user_id || '').toLowerCase()) &&
      (d.user_agent === rawUa || (d.deviceName === deviceName && d.browser === browser))
  );

  let targetDevice: PersistedLoginDevice;

  if (existingIdx !== -1) {
    const existing = devices[existingIdx];
    existing.last_login_at = nowIso;
    existing.loginAt = nowIso;
    existing.last_active_at = nowIso;
    existing.lastActiveAt = nowIso;
    existing.is_online = true;
    existing.isCurrentActive = true;
    existing.logout_at = null;
    existing.logoutAt = null;
    existing.ip_address = safeIp;
    existing.ipAddress = safeIp;
    existing.location = safeLocation;
    if (params.userRole) {
      existing.role = params.userRole;
      existing.userRole = params.userRole;
    }
    targetDevice = existing;
    // Move updated device to front
    devices.splice(existingIdx, 1);
    devices.unshift(targetDevice);
  } else {
    targetDevice = normalizeDevice({
      id: `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: cleanUserId || cleanEmail || 'USR-1000',
      role: params.userRole || 'ADMIN',
      device_type: deviceType,
      device_name: deviceName,
      browser,
      os,
      ip_address: safeIp,
      location: safeLocation,
      user_agent: rawUa,
      last_login_at: nowIso,
      last_active_at: nowIso,
      is_online: true,
      logout_at: null,
    });
    devices.unshift(targetDevice);
  }

  // Keep last 10 devices per user
  const userDevices = devices.filter((d) => aliases.has((d.user_id || '').toLowerCase()));
  if (userDevices.length > 10) {
    const allowedIds = new Set(userDevices.slice(0, 10).map((d) => d.id));
    devices = devices.filter((d) => !aliases.has((d.user_id || '').toLowerCase()) || allowedIds.has(d.id));
  }

  globalAny.ADMIN_USER_LOGIN_DEVICES = devices;
  savePersistentLoginDevices(devices);
  return targetDevice;
}

/**
 * Middleware: On every authenticated API call, updates last_active_at = now() and is_online = true.
 * If user inactive for > 30 mins, sets is_online = false.
 */
export function updateLastActiveForUser(
  rawUserId: string,
  userAgent?: string | null,
  ip?: string | null,
  emailHint?: string
): void {
  if (!rawUserId) return;
  const globalAny = global as unknown as Record<string, unknown>;
  const devices = (globalAny.ADMIN_USER_LOGIN_DEVICES as PersistedLoginDevice[]) || loadPersistentLoginDevices();

  const aliases = new Set(getAliasesForUser(rawUserId, emailHint));
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const thirtyMinsMs = 30 * 60 * 1000;

  let modified = false;

  for (const d of devices) {
    const isThisUser = aliases.has((d.user_id || '').toLowerCase());
    const lastActiveTime = new Date(d.last_active_at || d.lastActiveAt || 0).getTime();
    const inactiveDiff = now - lastActiveTime;

    // Check 30-min inactivity timeout across devices
    if (inactiveDiff > thirtyMinsMs && (d.is_online || d.isCurrentActive)) {
      d.is_online = false;
      d.isCurrentActive = false;
      modified = true;
    }

    // Refresh active device for current caller
    if (isThisUser) {
      const matchUa = !userAgent || d.user_agent === userAgent || d.browser === parseDeviceFromUserAgent(userAgent).browser;
      const matchIp = !ip || d.ip_address === ip;
      if (matchUa && matchIp) {
        d.last_active_at = nowIso;
        d.lastActiveAt = nowIso;
        d.is_online = true;
        d.isCurrentActive = true;
        modified = true;
      }
    }
  }

  if (modified) {
    globalAny.ADMIN_USER_LOGIN_DEVICES = devices;
    savePersistentLoginDevices(devices);
  }
}

/**
 * Returns all devices for that user sorted by last_login_at DESC.
 */
export function getUserLoginDevices(userId: string, maskIp = false, emailHint?: string): PersistedLoginDevice[] {
  const globalAny = global as unknown as Record<string, unknown>;
  const devices = (globalAny.ADMIN_USER_LOGIN_DEVICES as PersistedLoginDevice[]) || loadPersistentLoginDevices();
  globalAny.ADMIN_USER_LOGIN_DEVICES = devices;

  const aliases = new Set(getAliasesForUser(userId, emailHint));

  const matched = devices.filter((d) => aliases.has((d.user_id || '').toLowerCase()));

  // Sort by last_login_at DESC (fallback to last_active_at)
  matched.sort((a, b) => {
    const timeA = new Date(a.last_login_at || a.last_active_at).getTime();
    const timeB = new Date(b.last_login_at || b.last_active_at).getTime();
    return timeB - timeA;
  });

  const limited = matched.slice(0, 10).map((d) => {
    const isLoggedOut = Boolean(d.logout_at || d.logoutAt || d.is_online === false || d.isCurrentActive === false);
    const online = !isLoggedOut && isDeviceOnline(d.last_active_at);
    return {
      ...d,
      is_online: online,
      isCurrentActive: online,
      ip_address: maskIp ? maskIpAddress(d.ip_address) : d.ip_address,
      ipAddress: maskIp ? maskIpAddress(d.ip_address) : d.ip_address,
    };
  });

  return limited;
}

export function logoutAllUserDevices(userId: string, emailHint?: string): boolean {
  const globalAny = global as unknown as Record<string, unknown>;
  const devices = (globalAny.ADMIN_USER_LOGIN_DEVICES as PersistedLoginDevice[]) || loadPersistentLoginDevices();

  const aliases = new Set(getAliasesForUser(userId, emailHint));
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const d of devices) {
    if (aliases.has((d.user_id || '').toLowerCase()) && (d.is_online || d.isCurrentActive)) {
      d.is_online = false;
      d.isCurrentActive = false;
      d.logout_at = nowIso;
      d.logoutAt = nowIso;
      updatedCount++;
    }
  }

  globalAny.ADMIN_USER_LOGIN_DEVICES = devices;
  savePersistentLoginDevices(devices);
  return updatedCount > 0;
}

/**
 * Aggregation logic matching:
 * SELECT user_id, COUNT(*) as device_count, MAX(last_login_at) as last_used,
 * MAX(last_active_at) as last_active_at, BOOL_OR(is_online) as is_online
 * FROM user_login_devices GROUP BY user_id
 */
export function getUserDeviceAggregate(userIdOrEmail: string, emailHint?: string): {
  device_count: number;
  deviceCount: number;
  last_used: string | null;
  last_used_formatted: string | null;
  lastUsedText: string;
  last_active_at: string | null;
  is_online: boolean;
  devices: PersistedLoginDevice[];
} {
  const devices = getUserLoginDevices(userIdOrEmail, false, emailHint);
  const count = devices.length;

  if (count === 0) {
    return {
      device_count: 0,
      deviceCount: 0,
      last_used: null,
      last_used_formatted: null,
      lastUsedText: '',
      last_active_at: null,
      is_online: false,
      devices: [],
    };
  }

  let latestLogin = devices[0].last_login_at || devices[0].last_active_at;
  let latestActive = devices[0].last_active_at || latestLogin;
  let hasOnline = false;

  for (const d of devices) {
    const loginTime = new Date(d.last_login_at || d.last_active_at).getTime();
    if (loginTime > new Date(latestLogin).getTime()) {
      latestLogin = d.last_login_at || d.last_active_at;
    }
    const activeTime = new Date(d.last_active_at).getTime();
    if (activeTime > new Date(latestActive).getTime()) {
      latestActive = d.last_active_at;
    }
    if (!d.logout_at && !d.logoutAt && (d.is_online || d.isCurrentActive) && isDeviceOnline(d.last_active_at)) {
      hasOnline = true;
    }
  }

  const formatted = formatLastUsedDate(latestLogin);

  return {
    device_count: count,
    deviceCount: count,
    last_used: latestLogin,
    last_used_formatted: formatted,
    lastUsedText: formatted,
    last_active_at: latestActive,
    is_online: hasOnline,
    devices,
  };
}

export function getUserDeviceCounts(userId: string, emailHint?: string): { total: number; active: number } {
  const agg = getUserDeviceAggregate(userId, emailHint);
  return {
    total: agg.device_count,
    active: agg.devices.filter((d) => d.is_online).length,
  };
}
