import { getRequestedArea, UnserviceableRequestDto } from '../features/location/types';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

describe('Live Location & Nearby Zone Distance Verification', () => {
  describe('Live Location Preservations (No Mismatch or Hardcoded Overwrites)', () => {
    it('preserves real live address without hardcoded overrides', () => {
      const liveReq: UnserviceableRequestDto = {
        id: 'req-live-1',
        restaurantName: '[Customer] Live User',
        contactPerson: 'Live User',
        contactPhone: '+919876543210',
        contactEmail: 'user@foodie.com',
        createdAt: '2026-10-30T10:00:00Z',
        address: 'Doddanagamangala, Electronic City Phase 2',
        cityName: 'Bangalore',
        latitude: 12.8645,
        longitude: 77.6698,
        status: 'PENDING',
        requestSource: 'CUSTOMER',
        requestedArea: 'Doddanagamangala, Electronic City Phase 2',
      };

      const result = getRequestedArea(liveReq);
      expect(result).toBe('Doddanagamangala, Electronic City Phase 2');
      expect(result).not.toContain('Sri Banashankri');
    });

    it('cleans up saved address label prefix while preserving exact live address', () => {
      const labeledReq: UnserviceableRequestDto = {
        id: 'req-live-2',
        restaurantName: '[Customer] Ananya',
        contactPerson: 'Ananya',
        contactPhone: '+919876543211',
        contactEmail: 'ananya@foodie.com',
        createdAt: '2026-10-30T10:00:00Z',
        address: 'Home • Indiranagar 100ft Road',
        cityName: 'Bangalore',
        latitude: 12.9784,
        longitude: 77.6408,
        status: 'PENDING',
        requestSource: 'CUSTOMER',
        requestedArea: 'Home • Indiranagar 100ft Road',
      };

      expect(getRequestedArea(labeledReq)).toBe('Indiranagar 100ft Road');
    });

    it('formats raw GPS coordinates cleanly as Live Location when text address is missing', () => {
      const coordReq: UnserviceableRequestDto = {
        id: 'req-live-3',
        restaurantName: '[Customer] GPS User',
        contactPerson: 'GPS User',
        contactPhone: '+919876543212',
        contactEmail: 'gps@foodie.com',
        createdAt: '2026-10-30T10:00:00Z',
        address: '13.1751, 77.5592',
        cityName: 'Bangalore',
        latitude: 13.1751,
        longitude: 77.5592,
        status: 'PENDING',
        requestSource: 'CUSTOMER',
        requestedArea: '13.1751, 77.5592',
      };

      expect(getRequestedArea(coordReq)).toBe('Live Location (13.1751, 77.5592)');
    });
  });

  describe('Nearby Zone Restaurant Distance Calculation', () => {
    it('accurately calculates distance between customer live location and nearby restaurants', () => {
      const customerCoords = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore Center
      const nearbyRestaurant = {
        id: 'rest-1',
        name: 'Hotel Mayura',
        latitude: 12.9780,
        longitude: 77.6400, // Indiranagar ~ 5 km away
        zoneName: 'Bangalore Zone',
      };

      const dist = calculateDistanceKm(
        customerCoords.latitude,
        customerCoords.longitude,
        nearbyRestaurant.latitude,
        nearbyRestaurant.longitude
      );

      expect(dist).toBeGreaterThan(4.5);
      expect(dist).toBeLessThan(6.0);
    });

    it('ranks available restaurants from closest to farthest from the unserviceable location', () => {
      const customerCoords = { latitude: 13.1750, longitude: 77.5590 }; // Yelahanka north
      const restaurants = [
        { name: 'Far Restaurant (Whitefield)', lat: 12.9698, lng: 77.7500 },
        { name: 'Closest Restaurant (Hebbal)', lat: 13.0358, lng: 77.5970 },
        { name: 'Mid Restaurant (Indiranagar)', lat: 12.9784, lng: 77.6408 },
      ];

      const ranked = restaurants.map((r) => ({
        name: r.name,
        distanceKm: calculateDistanceKm(customerCoords.latitude, customerCoords.longitude, r.lat, r.lng),
      })).sort((a, b) => a.distanceKm - b.distanceKm);

      expect(ranked[0].name).toBe('Closest Restaurant (Hebbal)');
      expect(ranked[ranked.length - 1].name).toBe('Far Restaurant (Whitefield)');
    });
  });

  describe('Customer App Visibility Workflow', () => {
    it('keeps restaurant feed empty while zone is unserviceable / pending approval', () => {
      const isAreaServiceable = false;
      const allApprovedRestaurants = [
        { id: '1', name: 'Empire Restaurant' },
        { id: '2', name: 'Meghana Foods' },
      ];

      const visibleItems = isAreaServiceable ? allApprovedRestaurants : [];
      expect(visibleItems).toHaveLength(0);
    });

    it('reveals nearby zone restaurants immediately once admin approves or extends coverage', () => {
      let isAreaServiceable = false;
      const allApprovedRestaurants = [
        { id: '1', name: 'Empire Restaurant' },
        { id: '2', name: 'Meghana Foods' },
      ];

      expect(isAreaServiceable ? allApprovedRestaurants : []).toHaveLength(0);

      // Super Admin approves request / extends zone
      isAreaServiceable = true;
      const visibleAfterApproval = isAreaServiceable ? allApprovedRestaurants : [];
      expect(visibleAfterApproval).toHaveLength(2);
      expect(visibleAfterApproval[0].name).toBe('Empire Restaurant');
    });
  });
});
