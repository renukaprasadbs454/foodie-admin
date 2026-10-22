jest.mock('foodie-shared-web', () => ({
  createBaseApi: (config: any) => ({
    injectEndpoints: (options: any) => {
      const endpoints = options.endpoints({
        query: (def: any) => ({ ...def, type: 'query', initiate: jest.fn() }),
        mutation: (def: any) => ({ ...def, type: 'mutation', initiate: jest.fn() }),
      });
      return { endpoints };
    },
  }),
}));

import { deliveryPartnersApi } from '../api/endpoints/deliveryPartnersApi';

function convert24to12(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

describe('Delivery Shift Management & API Integration', () => {
  describe('deliveryPartnersApi shift endpoints', () => {
    it('defines getAdminShifts query with correct BFF url', () => {
      const endpoint = deliveryPartnersApi.endpoints.getAdminShifts;
      expect(endpoint).toBeDefined();
      expect((endpoint as any).query()).toBe('/api/bff/admin/shifts');
    });

    it('supports zoneId query parameter for getAdminShifts', () => {
      const endpoint = deliveryPartnersApi.endpoints.getAdminShifts;
      expect(endpoint).toBeDefined();
      expect((endpoint as any).query({ zoneId: 'dz-bangalore' })).toBe('/api/bff/admin/shifts?zoneId=dz-bangalore');
      expect((endpoint as any).query({ zoneId: 'dz-tumkur' })).toBe('/api/bff/admin/shifts?zoneId=dz-tumkur');
      expect((endpoint as any).query({ zoneId: 'ALL' })).toBe('/api/bff/admin/shifts');
    });

    it('defines createDeliveryShift mutation with zoneId and zoneName', () => {
      const endpoint = deliveryPartnersApi.endpoints.createDeliveryShift;
      expect(endpoint).toBeDefined();
      const mutationQuery = (endpoint as any).query({
        shiftName: 'Morning',
        startTime: '06:00 AM',
        endTime: '12:00 PM',
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
      });
      expect(mutationQuery.url).toBe('/api/bff/admin/shifts');
      expect(mutationQuery.method).toBe('POST');
      expect(mutationQuery.body.shiftName).toBe('Morning');
      expect(mutationQuery.body.zoneId).toBe('dz-bangalore');
      expect(mutationQuery.body.zoneName).toBe('Bangalore Zone');
    });

    it('defines updateDeliveryShift mutation with shiftId, payload, and PUT method', () => {
      const endpoint = deliveryPartnersApi.endpoints.updateDeliveryShift;
      expect(endpoint).toBeDefined();
      const mutationQuery = (endpoint as any).query({
        shiftId: 'shift-1234',
        data: {
          shiftName: 'Tumkur Evening Updated',
          startTime: '05:00 PM',
          endTime: '10:00 PM',
          status: 'ACTIVE',
          zoneId: 'dz-tumkur',
          zoneName: 'Tumkur Zone',
        },
      });
      expect(mutationQuery.url).toBe('/api/bff/admin/shifts/shift-1234');
      expect(mutationQuery.method).toBe('PUT');
      expect(mutationQuery.body.shiftName).toBe('Tumkur Evening Updated');
      expect(mutationQuery.body.zoneId).toBe('dz-tumkur');
      expect(mutationQuery.body.status).toBe('ACTIVE');
    });

    it('defines deleteDeliveryShift mutation with correct BFF url', () => {
      const endpoint = deliveryPartnersApi.endpoints.deleteDeliveryShift;
      expect(endpoint).toBeDefined();
      const mutationQuery = (endpoint as any).query('test-shift-uuid');
      expect(mutationQuery.url).toBe('/api/bff/admin/shifts/test-shift-uuid');
      expect(mutationQuery.method).toBe('DELETE');
    });
  });

  describe('Shift form validation rules', () => {
    const validateShift = (shiftName: string, startTime: string, endTime: string) => {
      const name = shiftName.trim();
      const start = startTime.trim();
      const end = endTime.trim();

      if (!name) return { valid: false, error: 'Please enter a Shift Name.' };
      if (!start) return { valid: false, error: 'Please specify a Start Time.' };
      if (!end) return { valid: false, error: 'Please specify an End Time.' };
      if (start.toLowerCase() === end.toLowerCase()) {
        return { valid: false, error: 'Start Time and End Time cannot be equal.' };
      }
      return { valid: true, error: null };
    };

    it('validates required shift name', () => {
      const res = validateShift('   ', '06:00 AM', '12:00 PM');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Please enter a Shift Name.');
    });

    it('validates required start time', () => {
      const res = validateShift('Morning Rush', '', '12:00 PM');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Please specify a Start Time.');
    });

    it('validates required end time', () => {
      const res = validateShift('Morning Rush', '06:00 AM', '');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Please specify an End Time.');
    });

    it('rejects identical start and end times', () => {
      const res = validateShift('Morning Rush', '06:00 AM', '06:00 am');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Start Time and End Time cannot be equal.');
    });

    it('accepts valid shift parameters', () => {
      const res = validateShift('Morning Rush', '06:00 AM', '12:00 PM');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });
  });

  describe('convert24to12 helper', () => {
    it('converts morning hours correctly', () => {
      expect(convert24to12('06:00')).toBe('06:00 AM');
      expect(convert24to12('09:30')).toBe('09:30 AM');
    });

    it('converts noon and afternoon hours correctly', () => {
      expect(convert24to12('12:00')).toBe('12:00 PM');
      expect(convert24to12('13:15')).toBe('01:15 PM');
      expect(convert24to12('23:45')).toBe('11:45 PM');
    });

    it('converts midnight correctly', () => {
      expect(convert24to12('00:00')).toBe('12:00 AM');
    });

    it('handles empty input gracefully', () => {
      expect(convert24to12('')).toBe('');
    });
  });

  describe('Strict Zone Session & Territory Shift Scoping (Dynamic Zone Isolation)', () => {
    const mockShifts = [
      {
        shiftId: 's1',
        shiftName: 'Bangalore Morning',
        startTime: '06:00 AM',
        endTime: '12:00 PM',
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
        status: 'ACTIVE',
      },
      {
        shiftId: 's2',
        shiftName: 'Bangalore Evening',
        startTime: '05:00 PM',
        endTime: '11:00 PM',
        zoneId: 'dz-bangalore',
        zoneName: 'Bangalore Zone',
        status: 'ACTIVE',
      },
      {
        shiftId: 's3',
        shiftName: 'Tumkur Day Slot',
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        zoneId: 'dz-tumkur',
        zoneName: 'Tumkur Zone',
        status: 'ACTIVE',
      },
      {
        shiftId: 's4',
        shiftName: 'Mysore Night Shift',
        startTime: '08:00 PM',
        endTime: '02:00 AM',
        zoneId: 'dz-mysore',
        zoneName: 'Mysore Zone',
        status: 'ACTIVE',
      },
    ];

    const filterShiftsByZone = (shifts: any[], isSuperAdmin: boolean, selectedZone: string | null) => {
      const targetZone = !isSuperAdmin
        ? selectedZone
        : selectedZone && selectedZone !== 'ALL'
        ? selectedZone
        : null;

      if (!targetZone) {
        return shifts;
      }

      const cleanTarget = targetZone.trim().toLowerCase();
      const normTarget = cleanTarget.startsWith('dz-') ? cleanTarget.substring(3) : cleanTarget;

      return shifts.filter((s: any) => {
        if (!s.zoneId) return false;
        const z = s.zoneId.trim().toLowerCase();
        const normZ = z.startsWith('dz-') ? z.substring(3) : z;
        return z === cleanTarget || normZ === normTarget;
      });
    };

    it('Super Admin with ALL views shifts across all zones', () => {
      const result = filterShiftsByZone(mockShifts, true, 'ALL');
      expect(result).toHaveLength(4);
    });

    it('Tumkur Zone Admin strictly sees only Tumkur shifts (no cross-zone leakage)', () => {
      const result = filterShiftsByZone(mockShifts, false, 'dz-tumkur');
      expect(result).toHaveLength(1);
      expect(result[0].shiftName).toBe('Tumkur Day Slot');
      expect(result[0].zoneId).toBe('dz-tumkur');
    });

    it('Bangalore Zone Admin strictly sees only Bangalore shifts', () => {
      const result = filterShiftsByZone(mockShifts, false, 'dz-bangalore');
      expect(result).toHaveLength(2);
      const names = result.map((s) => s.shiftName);
      expect(names).toContain('Bangalore Morning');
      expect(names).toContain('Bangalore Evening');
      expect(names).not.toContain('Tumkur Day Slot');
      expect(names).not.toContain('Mysore Night Shift');
    });

    it('Mysore Zone Admin strictly sees only Mysore shifts dynamically without hardcoded names', () => {
      const result = filterShiftsByZone(mockShifts, false, 'dz-mysore');
      expect(result).toHaveLength(1);
      expect(result[0].shiftName).toBe('Mysore Night Shift');
    });

    it('Super Admin selecting Tumkur filters strictly to Tumkur shifts', () => {
      const result = filterShiftsByZone(mockShifts, true, 'dz-tumkur');
      expect(result).toHaveLength(1);
      expect(result[0].shiftName).toBe('Tumkur Day Slot');
    });

    it('Super Admin selecting Mysore filters strictly to Mysore shifts', () => {
      const result = filterShiftsByZone(mockShifts, true, 'dz-mysore');
      expect(result).toHaveLength(1);
      expect(result[0].shiftName).toBe('Mysore Night Shift');
    });
  });
});
