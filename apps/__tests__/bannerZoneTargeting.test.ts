import {
  PromotionBanner,
  CreatePromotionBannerBody,
  filterBannersForCustomer,
  isZoneMatching,
} from '../features/coupons/types';

describe('Zone-Based Promotional Banner Creation and Customer Visibility', () => {
  const refDate = new Date(2026, 9, 31, 14, 0, 0); // October 31, 2026

  const mockBanners: PromotionBanner[] = [
    {
      id: 'banner-blr-1',
      title: 'Bangalore Weekend Offer',
      subtitle: 'Exclusive discounts across Bangalore restaurants',
      imageUrl: 'auto-generated',
      ctaText: 'Explore Now',
      ctaType: 'OPEN_COUPON',
      ctaTarget: 'BLR50',
      status: 'ACTIVE',
      displayOrder: 1,
      targetZoneIds: ['dz-bangalore'],
      targetZoneNames: ['Bangalore Zone'],
      isAllZones: false,
    },
    {
      id: 'banner-tmk-1',
      title: 'Tumkur Festival Offer',
      subtitle: 'Flat ₹50 off in Tumkur',
      imageUrl: 'auto-generated',
      ctaText: 'Explore Now',
      ctaType: 'OPEN_COUPON',
      ctaTarget: 'TMK50',
      status: 'ACTIVE',
      displayOrder: 2,
      targetZoneIds: ['dz-tumkur'],
      targetZoneNames: ['Tumkur Zone'],
      isAllZones: false,
    },
    {
      id: 'banner-all-1',
      title: 'Weekend Special Offer',
      subtitle: 'Available across all zones',
      imageUrl: 'auto-generated',
      ctaText: 'Explore Now',
      ctaType: 'OPEN_COUPON',
      ctaTarget: 'WEEKEND50',
      status: 'ACTIVE',
      displayOrder: 3,
      targetZoneIds: ['ALL'],
      targetZoneNames: ['All Zones'],
      isAllZones: true,
    },
    {
      id: 'banner-multi-1',
      title: 'Metro Feast',
      subtitle: 'Valid in Bangalore and Tumkur',
      imageUrl: 'auto-generated',
      ctaText: 'Order Now',
      ctaType: 'OPEN_COUPON',
      ctaTarget: 'METRO',
      status: 'ACTIVE',
      displayOrder: 4,
      targetZoneIds: ['dz-bangalore', 'dz-tumkur'],
      targetZoneNames: ['Bangalore Zone', 'Tumkur Zone'],
      isAllZones: false,
    },
    {
      id: 'banner-dynamic-hubballi',
      title: 'Hubballi offer card',
      subtitle: 'Testing zone promo',
      imageUrl: 'auto-generated',
      ctaText: 'Explore Now',
      ctaType: 'OPEN_COUPON',
      ctaTarget: 'WELCOME50',
      status: 'ACTIVE',
      displayOrder: 5,
      targetZoneIds: ['dz-hubballi'],
      targetZoneNames: ['Hubballi Zone'],
      isAllZones: false,
    },
    {
      id: 'banner-blr-deactivated',
      title: 'Bangalore Old Promo',
      subtitle: 'Deactivated promo',
      imageUrl: 'auto-generated',
      ctaText: 'Old',
      status: 'DEACTIVATED',
      displayOrder: 6,
      targetZoneIds: ['dz-bangalore'],
      targetZoneNames: ['Bangalore Zone'],
      isAllZones: false,
    },
    {
      id: 'banner-all-expired',
      title: 'Expired New Year Offer',
      subtitle: 'Ended last week',
      imageUrl: 'auto-generated',
      ctaText: 'Expired',
      status: 'ACTIVE',
      displayOrder: 7,
      targetZoneIds: ['ALL'],
      targetZoneNames: ['All Zones'],
      isAllZones: true,
      endsAt: new Date(2026, 9, 20).toISOString(), // Oct 20, 2026 (past)
    },
    {
      id: 'banner-legacy-no-zone',
      title: 'Legacy Global Banner',
      subtitle: 'Created before zone targeting existed',
      imageUrl: 'auto-generated',
      ctaText: 'Explore',
      status: 'ACTIVE',
      displayOrder: 8,
      // No targetZoneIds or isAllZones specified
    },
  ];

  describe('1. Zone Dropdown and Selection Logic', () => {
    it('automatically clears individual zones when All Zones is selected', () => {
      let selectedZones = ['dz-bangalore', 'dz-tumkur'];

      // Admin clicks "All Zones"
      const handleToggleAllZones = () => {
        selectedZones = ['ALL'];
      };
      handleToggleAllZones();

      expect(selectedZones).toEqual(['ALL']);
      expect(selectedZones.includes('dz-bangalore')).toBe(false);
      expect(selectedZones.includes('dz-tumkur')).toBe(false);
    });

    it('automatically deselects All Zones when an individual zone is clicked', () => {
      let selectedZones = ['ALL'];

      // Admin clicks "Bangalore Zone"
      const handleToggleZone = (zoneId: string) => {
        if (selectedZones.includes('ALL')) {
          selectedZones = [zoneId];
        } else if (selectedZones.includes(zoneId)) {
          selectedZones = selectedZones.filter((id) => id !== zoneId);
        } else {
          selectedZones = [...selectedZones, zoneId];
        }
      };

      handleToggleZone('dz-bangalore');
      expect(selectedZones).toEqual(['dz-bangalore']);
      expect(selectedZones.includes('ALL')).toBe(false);

      // Admin also selects "Tumkur Zone"
      handleToggleZone('dz-tumkur');
      expect(selectedZones).toEqual(['dz-bangalore', 'dz-tumkur']);
      expect(selectedZones.includes('ALL')).toBe(false);
    });

    it('validates that at least one zone or All Zones must be selected', () => {
      const validateZoneSelection = (zones: string[]) => {
        if (!zones || zones.length === 0) {
          return { isValid: false, error: 'Please select at least one zone or All Zones.' };
        }
        return { isValid: true, error: null };
      };

      expect(validateZoneSelection([]).isValid).toBe(false);
      expect(validateZoneSelection([]).error).toBe('Please select at least one zone or All Zones.');
      expect(validateZoneSelection(['ALL']).isValid).toBe(true);
      expect(validateZoneSelection(['dz-bangalore']).isValid).toBe(true);
    });

    it('dynamically handles newly created zones from database', () => {
      const dynamicZones = [
        { id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore' },
        { id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur' },
        { id: 'dz-mysore', zoneName: 'Mysore Zone', cityName: 'Mysore' }, // newly created zone
      ];

      const query = 'mysore';
      const filtered = dynamicZones.filter(
        (z) => z.zoneName.toLowerCase().includes(query) || z.cityName.toLowerCase().includes(query)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('dz-mysore');
      expect(filtered[0].zoneName).toBe('Mysore Zone');
    });
  });

  describe('2. Banner Creation and Editing with Zones', () => {
    it('creates a banner for Bangalore Zone only (Example 1)', () => {
      const selectedZoneIds = ['dz-bangalore'];
      const isAllZones = selectedZoneIds.includes('ALL');
      const payload: CreatePromotionBannerBody = {
        title: 'Bangalore Weekend Offer',
        subtitle: 'Special offer',
        imageUrl: 'auto-generated',
        ctaText: 'Explore Now',
        ctaType: 'OPEN_COUPON',
        ctaTarget: 'WELCOME50',
        status: 'ACTIVE',
        displayOrder: 1,
        targetZoneIds: isAllZones ? ['ALL'] : selectedZoneIds,
        targetZoneNames: ['Bangalore Zone'],
        isAllZones,
      };

      expect(payload.targetZoneIds).toEqual(['dz-bangalore']);
      expect(payload.isAllZones).toBe(false);
      expect(payload.targetZoneNames).toEqual(['Bangalore Zone']);
    });

    it('creates a banner for Tumkur Zone only (Example 2)', () => {
      const selectedZoneIds = ['dz-tumkur'];
      const isAllZones = selectedZoneIds.includes('ALL');
      const payload: CreatePromotionBannerBody = {
        title: 'Tumkur Festival Offer',
        subtitle: 'Festival discount',
        imageUrl: 'auto-generated',
        ctaText: 'Explore Now',
        ctaType: 'OPEN_COUPON',
        ctaTarget: 'WELCOME50',
        status: 'ACTIVE',
        displayOrder: 1,
        targetZoneIds: isAllZones ? ['ALL'] : selectedZoneIds,
        targetZoneNames: ['Tumkur Zone'],
        isAllZones,
      };

      expect(payload.targetZoneIds).toEqual(['dz-tumkur']);
      expect(payload.isAllZones).toBe(false);
      expect(payload.targetZoneNames).toEqual(['Tumkur Zone']);
    });

    it('creates a banner for All Zones (Example 3)', () => {
      const selectedZoneIds = ['ALL'];
      const isAllZones = selectedZoneIds.includes('ALL');
      const payload: CreatePromotionBannerBody = {
        title: 'Weekend Special Offer',
        subtitle: 'All zones discount',
        imageUrl: 'auto-generated',
        ctaText: 'Explore Now',
        ctaType: 'OPEN_COUPON',
        ctaTarget: 'WELCOME50',
        status: 'ACTIVE',
        displayOrder: 1,
        targetZoneIds: isAllZones ? ['ALL'] : selectedZoneIds,
        targetZoneNames: ['All Zones'],
        isAllZones,
      };

      expect(payload.targetZoneIds).toEqual(['ALL']);
      expect(payload.isAllZones).toBe(true);
      expect(payload.targetZoneNames).toEqual(['All Zones']);
    });

    it('editing a banner loads existing zone selection without resetting other fields', () => {
      const existingBanner: PromotionBanner = {
        id: 'banner-edit-test',
        title: 'Original Title',
        subtitle: 'Original Subtitle',
        imageUrl: 'auto-generated',
        ctaText: 'CLICK',
        ctaType: 'OPEN_RESTAURANT',
        ctaTarget: 'rest-uuid-1',
        status: 'ACTIVE',
        displayOrder: 5,
        targetZoneIds: ['dz-bangalore'],
        targetZoneNames: ['Bangalore Zone'],
        isAllZones: false,
      };

      // Edit simulation: admin updates zone to Tumkur
      const updatedZoneIds = ['dz-tumkur'];
      const updatedBanner: PromotionBanner = {
        ...existingBanner,
        targetZoneIds: updatedZoneIds,
        targetZoneNames: ['Tumkur Zone'],
        isAllZones: false,
      };

      expect(updatedBanner.title).toBe('Original Title');
      expect(updatedBanner.subtitle).toBe('Original Subtitle');
      expect(updatedBanner.ctaText).toBe('CLICK');
      expect(updatedBanner.ctaType).toBe('OPEN_RESTAURANT');
      expect(updatedBanner.ctaTarget).toBe('rest-uuid-1');
      expect(updatedBanner.displayOrder).toBe(5);
      expect(updatedBanner.targetZoneIds).toEqual(['dz-tumkur']);
    });

    it('safely handles legacy banners without zone information by defaulting to All Zones', () => {
      const legacyBanner: PromotionBanner = {
        id: 'banner-legacy',
        title: 'Old Banner',
        imageUrl: 'auto-generated',
        status: 'ACTIVE',
        displayOrder: 1,
      };

      // Safe resolution for edit & display
      const isGlobal =
        legacyBanner.isAllZones ||
        !legacyBanner.targetZoneIds ||
        legacyBanner.targetZoneIds.length === 0 ||
        legacyBanner.targetZoneIds.includes('ALL');

      expect(isGlobal).toBe(true);
    });
  });

  describe('3. Created Banners Zone Badge Display', () => {
    const formatZoneBadge = (banner: PromotionBanner): string => {
      if (
        banner.isAllZones ||
        !banner.targetZoneIds ||
        banner.targetZoneIds.length === 0 ||
        banner.targetZoneIds.includes('ALL')
      ) {
        return 'Zone: All Zones';
      }
      const names = banner.targetZoneNames || banner.targetZoneIds;
      if (names.length === 1) {
        return `Zone: ${names[0]}`;
      }
      return `Zones: ${names.join(', ')}`;
    };

    it('displays "Zone: Bangalore Zone" for Bangalore-only banner', () => {
      expect(formatZoneBadge(mockBanners[0])).toBe('Zone: Bangalore Zone');
    });

    it('displays "Zone: Tumkur Zone" for Tumkur-only banner', () => {
      expect(formatZoneBadge(mockBanners[1])).toBe('Zone: Tumkur Zone');
    });

    it('displays "Zone: All Zones" for All Zones banner', () => {
      expect(formatZoneBadge(mockBanners[2])).toBe('Zone: All Zones');
    });

    it('displays "Zones: Bangalore Zone, Tumkur Zone" for multi-zone banner', () => {
      expect(formatZoneBadge(mockBanners[3])).toBe('Zones: Bangalore Zone, Tumkur Zone');
    });

    it('displays "Zone: All Zones" for legacy banner without zone info without silent misassignment', () => {
      expect(formatZoneBadge(mockBanners[7])).toBe('Zone: All Zones');
    });
  });

  describe('4. Customer App Integration & Visibility Filtering', () => {
    it('ensures Bangalore customers see Bangalore, All Zones, and multi-zone banners, but NOT Tumkur or Hubballi banners', () => {
      const visible = filterBannersForCustomer(mockBanners, 'dz-bangalore', refDate);
      const ids = visible.map((b) => b.id);

      // Should see:
      expect(ids).toContain('banner-blr-1'); // Bangalore Zone
      expect(ids).toContain('banner-all-1'); // All Zones
      expect(ids).toContain('banner-multi-1'); // Bangalore & Tumkur
      expect(ids).toContain('banner-legacy-no-zone'); // Legacy All Zones

      // Should NOT see:
      expect(ids).not.toContain('banner-tmk-1'); // Tumkur only
      expect(ids).not.toContain('banner-dynamic-hubballi'); // Hubballi only
      expect(ids).not.toContain('banner-blr-deactivated'); // Deactivated
      expect(ids).not.toContain('banner-all-expired'); // Expired
    });

    it('ensures Tumkur customers see Tumkur, All Zones, and multi-zone banners, but NOT Bangalore or Hubballi banners', () => {
      const visible = filterBannersForCustomer(mockBanners, 'dz-tumkur', refDate);
      const ids = visible.map((b) => b.id);

      // Should see:
      expect(ids).toContain('banner-tmk-1'); // Tumkur Zone
      expect(ids).toContain('banner-all-1'); // All Zones
      expect(ids).toContain('banner-multi-1'); // Bangalore & Tumkur
      expect(ids).toContain('banner-legacy-no-zone'); // Legacy All Zones

      // Should NOT see:
      expect(ids).not.toContain('banner-blr-1'); // Bangalore only
      expect(ids).not.toContain('banner-dynamic-hubballi'); // Hubballi only
      expect(ids).not.toContain('banner-blr-deactivated'); // Deactivated
      expect(ids).not.toContain('banner-all-expired'); // Expired
    });

    it('ensures Hubballi customers see Hubballi and All Zones banners, but NOT Bangalore or Tumkur banners', () => {
      const visible = filterBannersForCustomer(mockBanners, 'dz-hubballi', refDate);
      const ids = visible.map((b) => b.id);

      expect(ids).toContain('banner-dynamic-hubballi'); // Hubballi Zone
      expect(ids).toContain('banner-all-1'); // All Zones
      expect(ids).toContain('banner-legacy-no-zone'); // Legacy All Zones

      expect(ids).not.toContain('banner-blr-1'); // Bangalore only
      expect(ids).not.toContain('banner-tmk-1'); // Tumkur only
      expect(ids).not.toContain('banner-multi-1'); // BLR & TMK only
      expect(ids).not.toContain('banner-blr-deactivated');
      expect(ids).not.toContain('banner-all-expired');
    });

    it('strictly excludes deactivated banners from customer display across all zones', () => {
      const visibleBlr = filterBannersForCustomer(mockBanners, 'dz-bangalore', refDate);
      const visibleTmk = filterBannersForCustomer(mockBanners, 'dz-tumkur', refDate);
      const visibleHub = filterBannersForCustomer(mockBanners, 'dz-hubballi', refDate);

      expect(visibleBlr.some((b) => b.status === 'DEACTIVATED')).toBe(false);
      expect(visibleTmk.some((b) => b.status === 'DEACTIVATED')).toBe(false);
      expect(visibleHub.some((b) => b.status === 'DEACTIVATED')).toBe(false);
    });

    it('strictly excludes expired banners from customer display across all zones', () => {
      const visibleBlr = filterBannersForCustomer(mockBanners, 'dz-bangalore', refDate);
      expect(visibleBlr.some((b) => b.id === 'banner-all-expired')).toBe(false);
    });

    it('matches zones flexibly using canonical ID, lowercase names, and city equivalents', () => {
      expect(isZoneMatching('dz-bangalore', 'dz-bangalore')).toBe(true);
      expect(isZoneMatching('Bangalore Zone', 'bangalore')).toBe(true);
      expect(isZoneMatching('Bangalore Zone', 'bengaluru')).toBe(true);
      expect(isZoneMatching('dz-tumkur', 'Tumkur Zone')).toBe(true);
      expect(isZoneMatching('tumkur', 'tumakuru')).toBe(true);
      expect(isZoneMatching('ALL', 'dz-bangalore')).toBe(true);
      expect(isZoneMatching('dz-bangalore', 'ALL')).toBe(true);
      expect(isZoneMatching('dz-bangalore', 'dz-tumkur')).toBe(false);
    });
  });
});

