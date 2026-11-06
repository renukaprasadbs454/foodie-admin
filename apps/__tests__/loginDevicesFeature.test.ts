import {
  parseDeviceFromUserAgent,
  maskIpAddress,
  recordUserLoginDevice,
  getUserLoginDevices,
  logoutAllUserDevices,
  getUserDeviceCounts,
  getUserDeviceAggregate,
  updateLastActiveForUser,
  formatLastUsedDate,
  formatRelativeTime,
  isDeviceOnline,
  getAliasesForUser,
} from '../lib/loginDeviceStore';

describe('Login Devices Feature — Store & Parser Tests', () => {
  describe('User-Agent parser', () => {
    it('detects Chrome on Windows PC', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.os).toBe('Windows 11');
      expect(parsed.browser).toBe('Chrome');
      expect(parsed.deviceName).toBe('Windows PC');
    });

    it('detects Safari on iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.os).toBe('iOS');
      expect(parsed.browser).toBe('Safari');
      expect(parsed.deviceName).toBe('iPhone');
    });

    it('detects Chrome on Android mobile', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.os).toBe('Android');
      expect(parsed.browser).toBe('Chrome');
      expect(parsed.deviceName).toBe('Android Phone');
    });

    it('detects Safari on MacBook Pro', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.os).toBe('macOS');
      expect(parsed.browser).toBe('Safari');
      expect(parsed.deviceName).toBe('MacBook Pro');
    });

    it('detects Edge browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.browser).toBe('Edge');
    });

    it('detects Firefox browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0';
      const parsed = parseDeviceFromUserAgent(ua);
      expect(parsed.browser).toBe('Firefox');
    });
  });

  describe('IP Masking for Security', () => {
    it('masks IPv4 address to first two octets with .xxx.xxx', () => {
      expect(maskIpAddress('192.168.1.100')).toBe('192.168.xxx.xxx');
      expect(maskIpAddress('49.207.215.89')).toBe('49.207.xxx.xxx');
      expect(maskIpAddress('106.51.78.22')).toBe('106.51.xxx.xxx');
    });

    it('handles fallback when IP is empty or invalid', () => {
      expect(maskIpAddress(null)).toBe('192.168.xxx.xxx');
      expect(maskIpAddress('')).toBe('192.168.xxx.xxx');
    });
  });

  describe('Device recording & 10-device limit enforcement', () => {
    const testUserId = `test-user-${Date.now()}`;

    it('records a new device for a user', () => {
      const dev = recordUserLoginDevice({
        userId: testUserId,
        userRole: 'FINANCE',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
        ipAddress: '49.207.215.89',
        location: 'Bengaluru, Karnataka',
      });

      expect(dev.userId).toBe(testUserId);
      expect(dev.deviceName).toBe('Windows PC');
      expect(dev.browser).toBe('Chrome');
      expect(dev.isCurrentActive).toBe(true);

      const list = getUserLoginDevices(testUserId, false);
      expect(list.some((d) => d.id === dev.id)).toBe(true);
    });

    it('updates lastActiveAt when logging in from the same device and browser', () => {
      const dev1 = recordUserLoginDevice({
        userId: testUserId,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1',
        ipAddress: '10.0.0.1',
      });

      const dev2 = recordUserLoginDevice({
        userId: testUserId,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1',
        ipAddress: '10.0.0.2',
      });

      expect(dev2.id).toBe(dev1.id);
      expect(dev2.isCurrentActive).toBe(true);
      expect(dev2.ipAddress).toBe('10.0.0.2');
    });

    it('keeps at most 10 devices per user', () => {
      const floodUserId = `flood-user-${Date.now()}`;
      for (let i = 0; i < 15; i++) {
        recordUserLoginDevice({
          userId: floodUserId,
          userAgent: `CustomDevice/${i} Linux Firefox/${i}.0`,
          ipAddress: `192.168.1.${i}`,
        });
      }

      const list = getUserLoginDevices(floodUserId, false);
      expect(list.length).toBeLessThanOrEqual(10);
    });

    it('masks IP when maskIp is set to true', () => {
      const list = getUserLoginDevices(testUserId, true);
      for (const d of list) {
        expect(d.ipAddress).toContain('xxx');
      }
    });

    it('logs out all devices for a user', () => {
      logoutAllUserDevices(testUserId);
      const list = getUserLoginDevices(testUserId, false);
      for (const d of list) {
        expect(d.isCurrentActive).toBe(false);
        expect(d.logoutAt).toBeTruthy();
      }

      const counts = getUserDeviceCounts(testUserId);
      expect(counts.active).toBe(0);
    });
  });

  describe('Device Aggregation & Aliases Resolution', () => {
    it('resolves aliases between USR-1000 and admin@foodie.local', () => {
      const aliases = getAliasesForUser('USR-1000');
      expect(aliases).toContain('usr-1000');
      expect(aliases).toContain('admin@foodie.local');

      const aggById = getUserDeviceAggregate('USR-1000');
      const aggByEmail = getUserDeviceAggregate('admin@foodie.local');
      expect(aggById.device_count).toBeGreaterThan(0);
      expect(aggById.device_count).toBe(aggByEmail.device_count);
    });

    it('returns aggregated fields matching SELECT COUNT(*), MAX(last_login_at)', () => {
      const agg = getUserDeviceAggregate('USR-1000');
      expect(agg).toHaveProperty('device_count');
      expect(agg).toHaveProperty('last_used');
      expect(agg).toHaveProperty('lastUsedText');
      expect(agg).toHaveProperty('last_active_at');
      expect(agg).toHaveProperty('is_online');
      expect(Array.isArray(agg.devices)).toBe(true);
    });

    it('formats date to DD-MM-YYYY hh:mm A', () => {
      const iso = '2026-11-06T18:43:00.000Z';
      const formatted = formatLastUsedDate(iso);
      expect(formatted).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2} (AM|PM)$/);
    });

    it('formats relative times correctly', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('Just now');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('detects online status within 5 minutes', () => {
      const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      expect(isDeviceOnline(recent)).toBe(true);

      const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isDeviceOnline(old)).toBe(false);
    });

    it('resolves devices for Finance, Operations, Super Admin, and Darkstore Admin', () => {
      // Finance Admin
      const finAliases = getAliasesForUser('USR-7542', 'finance@foodie.local');
      expect(finAliases).toContain('finance@foodie.local');
      const finAgg = getUserDeviceAggregate('USR-7542', 'finance@foodie.local');
      expect(finAgg.device_count).toBeGreaterThan(0);

      // Operations Admin
      const opsAliases = getAliasesForUser('USR-8613', 'ops@foodie.local');
      expect(opsAliases).toContain('ops@foodie.local');
      const opsAgg = getUserDeviceAggregate('USR-8613', 'ops@foodie.local');
      expect(opsAgg.device_count).toBeGreaterThan(0);

      // Super Admin
      const saAgg = getUserDeviceAggregate('USR-7985', 'admin@foodie.local');
      expect(saAgg.device_count).toBeGreaterThan(0);

      // Darkstore Admin
      const darkAgg = getUserDeviceAggregate('USR-4471', 'darkstore@foodie.local');
      expect(darkAgg.device_count).toBeGreaterThan(0);
    });

    it('records device on login and increases count from 0 to 1 and 2 for a new Finance/Ops staff member', () => {
      const newStaffId = `staff-${Date.now()}`;
      const newStaffEmail = `${newStaffId}@foodie.local`;

      // Initially 0 devices
      expect(getUserDeviceAggregate(newStaffId, newStaffEmail).device_count).toBe(0);

      // First login (Windows Desktop)
      recordUserLoginDevice({
        userId: newStaffId,
        userEmail: newStaffEmail,
        userRole: 'FINANCE',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        ipAddress: '10.0.0.1',
      });

      const afterFirstLogin = getUserDeviceAggregate(newStaffId, newStaffEmail);
      expect(afterFirstLogin.device_count).toBe(1);
      expect(afterFirstLogin.is_online).toBe(true);

      // Second login from a different device (iPhone Mobile)
      recordUserLoginDevice({
        userId: newStaffId,
        userEmail: newStaffEmail,
        userRole: 'FINANCE',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
        ipAddress: '10.0.0.2',
      });

      const afterSecondLogin = getUserDeviceAggregate(newStaffId, newStaffEmail);
      expect(afterSecondLogin.device_count).toBe(2);

      // Re-login from same Windows Desktop (no duplicate row, just updates last login/active)
      recordUserLoginDevice({
        userId: newStaffId,
        userEmail: newStaffEmail,
        userRole: 'FINANCE',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        ipAddress: '10.0.0.1',
      });

      const afterReLogin = getUserDeviceAggregate(newStaffId, newStaffEmail);
      expect(afterReLogin.device_count).toBe(2); // Still 2, no duplicates!
    });
  });

  describe('updateLastActive middleware', () => {
    it('updates last_active_at and keeps device online on activity', () => {
      const activeUserId = `active-test-${Date.now()}`;
      recordUserLoginDevice({
        userId: activeUserId,
        userAgent: 'Chrome on Windows',
        ipAddress: '1.2.3.4',
      });

      updateLastActiveForUser(activeUserId, 'Chrome on Windows', '1.2.3.4');
      const devs = getUserLoginDevices(activeUserId);
      expect(devs.length).toBeGreaterThan(0);
      expect(devs[0].isCurrentActive).toBe(true);
    });
  });
});


