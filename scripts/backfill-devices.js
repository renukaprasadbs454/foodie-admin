/**
 * Backfill script: manually insert current device for admin users so UI on localhost:3100/users
 * immediately shows active device counts and timestamps.
 *
 * Usage: node scripts/backfill-devices.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SHARED_DEVICES_FILE = path.join(os.tmpdir(), 'foodie_user_login_devices_v2.json');

const now = Date.now();
const min = 60 * 1000;
const hr = 60 * min;

const seedDevices = [
  // USR-1000: Super Admin (2 devices: Active Desktop + Mobile)
  {
    id: 'backfill-sa-desktop',
    user_id: 'USR-1000',
    userId: 'USR-1000',
    role: 'SUPER_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Windows PC',
    deviceName: 'Windows PC',
    browser: 'Chrome 122',
    os: 'Windows 11',
    ip_address: '49.207.215.89',
    ipAddress: '49.207.215.89',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 15 * min).toISOString(),
    loginAt: new Date(now - 15 * min).toISOString(),
    last_active_at: new Date(now - 1 * min).toISOString(),
    lastActiveAt: new Date(now - 1 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },
  {
    id: 'backfill-sa-mobile',
    user_id: 'USR-1000',
    userId: 'USR-1000',
    role: 'SUPER_ADMIN',
    device_type: 'mobile',
    deviceType: 'mobile',
    device_name: 'iPhone 15 Pro',
    deviceName: 'iPhone 15 Pro',
    browser: 'Safari',
    os: 'iOS 17.4',
    ip_address: '157.49.21.104',
    ipAddress: '157.49.21.104',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    last_login_at: new Date(now - 3 * hr).toISOString(),
    loginAt: new Date(now - 3 * hr).toISOString(),
    last_active_at: new Date(now - 45 * min).toISOString(),
    lastActiveAt: new Date(now - 45 * min).toISOString(),
    is_online: false,
    isCurrentActive: false,
    logout_at: null,
  },

  // USR-1001: Platform Admin (1 device)
  {
    id: 'backfill-adm-desktop',
    user_id: 'USR-1001',
    userId: 'USR-1001',
    role: 'ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'MacBook Pro 16',
    deviceName: 'MacBook Pro 16',
    browser: 'Chrome 122',
    os: 'macOS Sonoma',
    ip_address: '106.51.72.190',
    ipAddress: '106.51.72.190',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 25 * min).toISOString(),
    loginAt: new Date(now - 25 * min).toISOString(),
    last_active_at: new Date(now - 2 * min).toISOString(),
    lastActiveAt: new Date(now - 2 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-1002: Operations Admin (2 devices: Mobile + Desktop)
  {
    id: 'backfill-ops-mobile',
    user_id: 'USR-1002',
    userId: 'USR-1002',
    role: 'OPS',
    device_type: 'mobile',
    deviceType: 'mobile',
    device_name: 'Samsung Galaxy S24',
    deviceName: 'Samsung Galaxy S24',
    browser: 'Chrome Mobile',
    os: 'Android 14',
    ip_address: '49.207.215.91',
    ipAddress: '49.207.215.91',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    last_login_at: new Date(now - 20 * min).toISOString(),
    loginAt: new Date(now - 20 * min).toISOString(),
    last_active_at: new Date(now - 3 * min).toISOString(),
    lastActiveAt: new Date(now - 3 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },
  {
    id: 'backfill-ops-desktop',
    user_id: 'USR-1002',
    userId: 'USR-1002',
    role: 'OPS',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Dell XPS 15',
    deviceName: 'Dell XPS 15',
    browser: 'Firefox',
    os: 'Windows 11',
    ip_address: '49.207.215.91',
    ipAddress: '49.207.215.91',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    last_login_at: new Date(now - 4 * hr).toISOString(),
    loginAt: new Date(now - 4 * hr).toISOString(),
    last_active_at: new Date(now - 55 * min).toISOString(),
    lastActiveAt: new Date(now - 55 * min).toISOString(),
    is_online: false,
    isCurrentActive: false,
    logout_at: null,
  },

  // USR-1003: Finance Admin (1 device)
  {
    id: 'backfill-fin-desktop',
    user_id: 'USR-1003',
    userId: 'USR-1003',
    role: 'FINANCE_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'ThinkPad T14',
    deviceName: 'ThinkPad T14',
    browser: 'Edge',
    os: 'Windows 11',
    ip_address: '182.73.19.45',
    ipAddress: '182.73.19.45',
    location: 'Tumkur, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    last_login_at: new Date(now - 10 * min).toISOString(),
    loginAt: new Date(now - 10 * min).toISOString(),
    last_active_at: new Date(now - 2 * min).toISOString(),
    lastActiveAt: new Date(now - 2 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-1004: Support Agent
  {
    id: 'backfill-sup-desktop',
    user_id: 'USR-1004',
    userId: 'USR-1004',
    role: 'SUPPORT_AGENT',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'HP EliteDesk',
    deviceName: 'HP EliteDesk',
    browser: 'Chrome 122',
    os: 'Windows 10',
    ip_address: '182.73.19.50',
    ipAddress: '182.73.19.50',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 50 * min).toISOString(),
    loginAt: new Date(now - 50 * min).toISOString(),
    last_active_at: new Date(now - 4 * min).toISOString(),
    lastActiveAt: new Date(now - 4 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-1006: Bangalore Ops Admin
  {
    id: 'backfill-blr-desktop',
    user_id: 'USR-1006',
    userId: 'USR-1006',
    role: 'OPS',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Dell OptiPlex',
    deviceName: 'Dell OptiPlex',
    browser: 'Chrome 122',
    os: 'Windows 11',
    ip_address: '49.207.215.101',
    ipAddress: '49.207.215.101',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 8 * min).toISOString(),
    loginAt: new Date(now - 8 * min).toISOString(),
    last_active_at: new Date(now - 1 * min).toISOString(),
    lastActiveAt: new Date(now - 1 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-1007: Tumkur Ops Admin
  {
    id: 'backfill-tmk-desktop',
    user_id: 'USR-1007',
    userId: 'USR-1007',
    role: 'OPS',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Lenovo IdeaPad',
    deviceName: 'Lenovo IdeaPad',
    browser: 'Edge',
    os: 'Windows 11',
    ip_address: '182.73.20.12',
    ipAddress: '182.73.20.12',
    location: 'Tumkur, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    last_login_at: new Date(now - 22 * min).toISOString(),
    loginAt: new Date(now - 22 * min).toISOString(),
    last_active_at: new Date(now - 3 * min).toISOString(),
    lastActiveAt: new Date(now - 3 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-7985: Super Admin
  {
    id: 'backfill-7985-desktop',
    user_id: 'USR-7985',
    userId: 'USR-7985',
    role: 'SUPER_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Windows PC',
    deviceName: 'Windows PC',
    browser: 'Chrome 124',
    os: 'Windows 11',
    ip_address: '49.207.215.89',
    ipAddress: '49.207.215.89',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 10 * min).toISOString(),
    loginAt: new Date(now - 10 * min).toISOString(),
    last_active_at: new Date(now - 1 * min).toISOString(),
    lastActiveAt: new Date(now - 1 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-7542: Finance Admin
  {
    id: 'backfill-7542-desktop',
    user_id: 'USR-7542',
    userId: 'USR-7542',
    role: 'FINANCE_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Dell Latitude',
    deviceName: 'Dell Latitude',
    browser: 'Chrome 123',
    os: 'Windows 11',
    ip_address: '106.51.78.22',
    ipAddress: '106.51.78.22',
    location: 'Tumakuru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 40 * min).toISOString(),
    loginAt: new Date(now - 40 * min).toISOString(),
    last_active_at: new Date(now - 2 * min).toISOString(),
    lastActiveAt: new Date(now - 2 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },
  {
    id: 'backfill-7542-mobile',
    user_id: 'USR-7542',
    userId: 'USR-7542',
    role: 'FINANCE_ADMIN',
    device_type: 'mobile',
    deviceType: 'mobile',
    device_name: 'Samsung Galaxy S24',
    deviceName: 'Samsung Galaxy S24',
    browser: 'Chrome Mobile',
    os: 'Android 14',
    ip_address: '157.49.88.19',
    ipAddress: '157.49.88.19',
    location: 'Tumakuru, Karnataka',
    user_agent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    last_login_at: new Date(now - 5 * hr).toISOString(),
    loginAt: new Date(now - 5 * hr).toISOString(),
    last_active_at: new Date(now - 3 * hr).toISOString(),
    lastActiveAt: new Date(now - 3 * hr).toISOString(),
    is_online: false,
    isCurrentActive: false,
    logout_at: null,
  },

  // USR-8613: Operations Admin
  {
    id: 'backfill-8613-desktop',
    user_id: 'USR-8613',
    userId: 'USR-8613',
    role: 'OPERATIONS_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'HP EliteBook',
    deviceName: 'HP EliteBook',
    browser: 'Chrome 124',
    os: 'Windows 11',
    ip_address: '49.207.210.15',
    ipAddress: '49.207.210.15',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 18 * min).toISOString(),
    loginAt: new Date(now - 18 * min).toISOString(),
    last_active_at: new Date(now - 2 * min).toISOString(),
    lastActiveAt: new Date(now - 2 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },
  {
    id: 'backfill-8613-mobile',
    user_id: 'USR-8613',
    userId: 'USR-8613',
    role: 'OPERATIONS_ADMIN',
    device_type: 'mobile',
    deviceType: 'mobile',
    device_name: 'iPhone 15',
    deviceName: 'iPhone 15',
    browser: 'Safari',
    os: 'iOS 17.4',
    ip_address: '157.48.90.11',
    ipAddress: '157.48.90.11',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    last_login_at: new Date(now - 2 * hr).toISOString(),
    loginAt: new Date(now - 2 * hr).toISOString(),
    last_active_at: new Date(now - 40 * min).toISOString(),
    lastActiveAt: new Date(now - 40 * min).toISOString(),
    is_online: false,
    isCurrentActive: false,
    logout_at: null,
  },

  // USR-4471: Darkstore Admin
  {
    id: 'backfill-4471-desktop',
    user_id: 'USR-4471',
    userId: 'USR-4471',
    role: 'DARKSTORE_ADMIN',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Windows PC',
    deviceName: 'Windows PC',
    browser: 'Chrome 122',
    os: 'Windows 11',
    ip_address: '49.207.212.33',
    ipAddress: '49.207.212.33',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 30 * min).toISOString(),
    loginAt: new Date(now - 30 * min).toISOString(),
    last_active_at: new Date(now - 1 * min).toISOString(),
    lastActiveAt: new Date(now - 1 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-8237: Support Agent
  {
    id: 'backfill-8237-desktop',
    user_id: 'USR-8237',
    userId: 'USR-8237',
    role: 'SUPPORT_AGENT',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'Windows PC',
    deviceName: 'Windows PC',
    browser: 'Chrome 122',
    os: 'Windows 11',
    ip_address: '106.51.72.190',
    ipAddress: '106.51.72.190',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    last_login_at: new Date(now - 25 * min).toISOString(),
    loginAt: new Date(now - 25 * min).toISOString(),
    last_active_at: new Date(now - 2 * min).toISOString(),
    lastActiveAt: new Date(now - 2 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-8305: Restaurant Manager
  {
    id: 'backfill-8305-mobile',
    user_id: 'USR-8305',
    userId: 'USR-8305',
    role: 'RESTAURANT_MANAGER',
    device_type: 'mobile',
    deviceType: 'mobile',
    device_name: 'iPhone 15',
    deviceName: 'iPhone 15',
    browser: 'Safari',
    os: 'iOS 17.4',
    ip_address: '157.48.90.10',
    ipAddress: '157.48.90.10',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    last_login_at: new Date(now - 15 * min).toISOString(),
    loginAt: new Date(now - 15 * min).toISOString(),
    last_active_at: new Date(now - 1 * min).toISOString(),
    lastActiveAt: new Date(now - 1 * min).toISOString(),
    is_online: true,
    isCurrentActive: true,
    logout_at: null,
  },

  // USR-9161: Auditor
  {
    id: 'backfill-9161-desktop',
    user_id: 'USR-9161',
    userId: 'USR-9161',
    role: 'AUDITOR',
    device_type: 'desktop',
    deviceType: 'desktop',
    device_name: 'ThinkPad X1',
    deviceName: 'ThinkPad X1',
    browser: 'Firefox',
    os: 'Linux Ubuntu',
    ip_address: '122.172.50.80',
    ipAddress: '122.172.50.80',
    location: 'Bengaluru, Karnataka',
    user_agent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
    userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
    last_login_at: new Date(now - 1 * hr).toISOString(),
    loginAt: new Date(now - 1 * hr).toISOString(),
    last_active_at: new Date(now - 30 * min).toISOString(),
    lastActiveAt: new Date(now - 30 * min).toISOString(),
    is_online: false,
    isCurrentActive: false,
    logout_at: null,
  },
];

function runBackfill() {
  let existing = [];
  try {
    if (fs.existsSync(SHARED_DEVICES_FILE)) {
      const raw = fs.readFileSync(SHARED_DEVICES_FILE, 'utf8');
      existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    }
  } catch (err) {
    existing = [];
  }

  // Merge seed devices by id
  const existingMap = new Map();
  for (const d of existing) {
    if (d && d.id) existingMap.set(d.id, d);
  }

  for (const s of seedDevices) {
    existingMap.set(s.id, s);
  }

  const merged = Array.from(existingMap.values());
  fs.writeFileSync(SHARED_DEVICES_FILE, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`[Backfill Success] Successfully wrote ${merged.length} device entries to:`);
  console.log(`  ${SHARED_DEVICES_FILE}`);
  console.log('\nPopulated users:');
  const userSummary = {};
  for (const d of merged) {
    userSummary[d.user_id] = (userSummary[d.user_id] || 0) + 1;
  }
  for (const [userId, count] of Object.entries(userSummary)) {
    console.log(`  - ${userId}: ${count} device(s)`);
  }
  console.log('\nUI at http://localhost:3100/users will now reflect these devices immediately!');
}

runBackfill();

