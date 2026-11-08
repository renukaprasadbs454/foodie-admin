/**
 * P2-ADM-05 coupon shapes — CreateCouponRequestDto / CouponResponseDto /
 * DeactivateCouponResponseDto (§13.4 / §13.5).
 */

export const DISCOUNT_TYPES = ['FLAT', 'PERCENT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface CreateCouponBody {
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  value: number;
  adminDiscount?: number;
  restaurantDiscount?: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  expiryDate: string;
  usageLimitTotal?: number;
  usageLimitPerUser: number;
  restaurantId?: string;
  zoneId?: string;
  zoneName?: string;
  funderType?: string;
  couponType?: string;
  benefitMode?: string;
  approvalStatus?: string;
  title?: string;
  module?: string;
}

export interface Coupon {
  couponId: string;
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  funderType?: string;
  couponType?: string;
  benefitMode?: string;
  approvalStatus?: string;
  value: number | string;
  adminDiscount?: number | null;
  restaurantDiscount?: number | null;
  minOrderAmount: number | string;
  maxDiscountAmount?: number | string | null;
  expiryDate?: string | null;
  usageLimitTotal?: number | null;
  usageLimitPerUser: number;
  restaurantId?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  isAllZones?: boolean;
  isActive: boolean;
  title?: string;
  module?: string;
};

export type DeactivateCouponResult = {
  couponId: string;
  isActive: boolean;
};

export interface PromotionBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaType?: string;
  ctaTarget?: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'DRAFT' | 'ARCHIVED';
  displayOrder: number;
  startsAt?: string;
  endsAt?: string;
  targetZoneIds?: string[];
  targetZoneNames?: string[];
  isAllZones?: boolean;
  couponId?: string;
  campaignId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePromotionBannerBody {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaType?: string;
  ctaTarget?: string;
  status?: string;
  displayOrder: number;
  startsAt?: string;
  endsAt?: string;
  targetZoneIds?: string[];
  targetZoneNames?: string[];
  isAllZones?: boolean;
  couponId?: string;
  campaignId?: string;
}

export function isZoneMatching(bannerTargetZone: string, customerZone: string): boolean {
  if (!bannerTargetZone || !customerZone) return false;
  const cleanTarget = bannerTargetZone.trim().toLowerCase();
  const cleanCustomer = customerZone.trim().toLowerCase();
  if (cleanTarget === 'all' || cleanCustomer === 'all') return true;
  if (cleanTarget === cleanCustomer) return true;

  const isTargetBlr = cleanTarget.includes('bangalore') || cleanTarget.includes('bengaluru') || cleanTarget.includes('blr');
  const isCustomerBlr = cleanCustomer.includes('bangalore') || cleanCustomer.includes('bengaluru') || cleanCustomer.includes('blr');
  if (isTargetBlr && isCustomerBlr) return true;

  const isTargetTmk = cleanTarget.includes('tumkur') || cleanTarget.includes('tumakuru') || cleanTarget.includes('tmk');
  const isCustomerTmk = cleanCustomer.includes('tumkur') || cleanCustomer.includes('tumakuru') || cleanCustomer.includes('tmk');
  if (isTargetTmk && isCustomerTmk) return true;

  const isTargetHub = cleanTarget.includes('hubballi') || cleanTarget.includes('hubli') || cleanTarget.includes('hbl');
  const isCustomerHub = cleanCustomer.includes('hubballi') || cleanCustomer.includes('hubli') || cleanCustomer.includes('hbl');
  if (isTargetHub && isCustomerHub) return true;

  const isTargetMys = cleanTarget.includes('mysore') || cleanTarget.includes('mysuru');
  const isCustomerMys = cleanCustomer.includes('mysore') || cleanCustomer.includes('mysuru');
  if (isTargetMys && isCustomerMys) return true;

  const isTargetHas = cleanTarget.includes('hassan');
  const isCustomerHas = cleanCustomer.includes('hassan');
  if (isTargetHas && isCustomerHas) return true;

  const strip = (s: string) => s.replace(/^dz-/, '').replace(/-zone$/, '').replace(/\s+zone$/i, '').trim();
  if (strip(cleanTarget) === strip(cleanCustomer)) return true;

  return false;
}

export function filterBannersForCustomer(
  banners: PromotionBanner[],
  customerZoneId?: string | null,
  now: Date = new Date()
): PromotionBanner[] {
  const currentTime = now.getTime();

  return banners.filter((banner) => {
    // 1. Must be active
    if (banner.status !== 'ACTIVE') return false;

    // 2. Expiry check
    if (banner.endsAt) {
      const endTime = new Date(banner.endsAt).getTime();
      if (!isNaN(endTime) && currentTime > endTime) return false;
    }

    // 3. Start time check
    if (banner.startsAt) {
      const startTime = new Date(banner.startsAt).getTime();
      if (!isNaN(startTime) && currentTime < startTime) return false;
    }

    // 4. Zone Targeting check
    // If banner targets All Zones (or has empty/undefined targetZoneIds for legacy global banners)
    const isGlobal =
      banner.isAllZones === true ||
      !banner.targetZoneIds ||
      banner.targetZoneIds.length === 0 ||
      banner.targetZoneIds.includes('ALL');

    if (isGlobal) {
      return true;
    }

    // If customer zone is unknown/unassigned, only show global banners
    if (!customerZoneId) {
      return false;
    }

    // Check if customer's zone matches any assigned target zone
    const targetIds = banner.targetZoneIds || [];
    const targetNames = banner.targetZoneNames || [];
    const allTargets = [...targetIds, ...targetNames];

    return allTargets.some((target) => isZoneMatching(target, customerZoneId));
  });
}

const CODE_RE = /^[A-Z0-9_]{3,30}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCouponUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function isDiscountType(value: string): value is DiscountType {
  return (DISCOUNT_TYPES as readonly string[]).includes(value);
}

export type CreateCouponFormInput = {
  code: string;
  discountType: string;
  value?: string;
  adminDiscount?: string;
  restaurantDiscount?: string;
  minOrderAmount: string;
  maxDiscountAmount?: string;
  expiryDate: string;
  usageLimitTotal?: string;
  usageLimitPerUser: string;
  restaurantId?: string;
  zoneId?: string;
  zoneName?: string;
};

export function validateCreateCoupon(
  input: CreateCouponFormInput,
): { ok: true; body: CreateCouponBody } | { ok: false; message: string } {
  const code = input.code.trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      message: 'Code must match A–Z / 0–9 / _ and be 3–30 characters.',
    };
  }
  if (!isDiscountType(input.discountType)) {
    return { ok: false, message: 'Discount type must be FLAT or PERCENT.' };
  }

  let adminDiscount: number | undefined;
  let restaurantDiscount: number | undefined;
  if (input.adminDiscount != null && input.adminDiscount.trim() !== '') {
    adminDiscount = Number(input.adminDiscount);
    if (!Number.isFinite(adminDiscount) || adminDiscount < 0) {
      return { ok: false, message: 'Admin discount must be ≥ 0.' };
    }
  }
  if (input.restaurantDiscount != null && input.restaurantDiscount.trim() !== '') {
    restaurantDiscount = Number(input.restaurantDiscount);
    if (!Number.isFinite(restaurantDiscount) || restaurantDiscount < 0) {
      return { ok: false, message: 'Restaurant discount must be ≥ 0.' };
    }
  }

  let value: number;
  if (adminDiscount != null || restaurantDiscount != null) {
    value = (adminDiscount || 0) + (restaurantDiscount || 0);
  } else {
    value = Number(input.value);
  }

  if (!Number.isFinite(value) || value < 0.01) {
    return { ok: false, message: 'Value must be at least 0.01.' };
  }
  if (input.discountType === 'PERCENT' && value > 100) {
    return { ok: false, message: 'Percent value cannot exceed 100.' };
  }
  const minOrderAmount = Number(input.minOrderAmount);
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    return { ok: false, message: 'Minimum order amount must be ≥ 0.' };
  }

  let maxDiscountAmount: number | undefined;
  if (input.maxDiscountAmount && input.maxDiscountAmount.trim()) {
    maxDiscountAmount = Number(input.maxDiscountAmount);
    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0) {
      return { ok: false, message: 'Max discount must be greater than 0 when set.' };
    }
  } else {
    maxDiscountAmount = undefined;
  }
  if (input.discountType === 'PERCENT') {
    if (maxDiscountAmount == null || maxDiscountAmount <= 0) {
      return {
        ok: false,
        message: 'Max discount is required for PERCENT coupons.',
      };
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) {
    return { ok: false, message: 'Expiry date must be YYYY-MM-DD (future).' };
  }
  const today = new Date();
  const todayIso = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
  if (input.expiryDate <= todayIso) {
    return { ok: false, message: 'Expiry date must be in the future.' };
  }

  const usageLimitPerUser = Number(input.usageLimitPerUser);
  if (!Number.isInteger(usageLimitPerUser) || usageLimitPerUser < 1) {
    return { ok: false, message: 'Usage limit per user must be an integer ≥ 1.' };
  }

  let usageLimitTotal: number | undefined;
  if (input.usageLimitTotal && input.usageLimitTotal.trim()) {
    usageLimitTotal = Number(input.usageLimitTotal);
    if (!Number.isInteger(usageLimitTotal) || usageLimitTotal < 1) {
      return { ok: false, message: 'Usage limit total must be an integer ≥ 1.' };
    }
  } else {
    usageLimitTotal = undefined;
  }

  let restaurantId: string | undefined;
  if (input.restaurantId && input.restaurantId.trim()) {
    if (!UUID_RE.test(input.restaurantId.trim())) {
      return { ok: false, message: 'Restaurant ID must be a valid UUID when set.' };
    }
    restaurantId = input.restaurantId.trim();
  } else {
    restaurantId = undefined;
  }

  let zoneId: string | undefined;
  if (input.zoneId && input.zoneId.trim()) {
    zoneId = input.zoneId.trim();
  }

  return {
    ok: true,
    body: {
      code,
      discountType: input.discountType,
      value,
      adminDiscount,
      restaurantDiscount,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate: input.expiryDate,
      usageLimitTotal,
      usageLimitPerUser,
      restaurantId,
      zoneId,
      zoneName: input.zoneName,
    },
  };
}

/**
 * Preserves the exact calendar date (YYYY-MM-DD) from user input or server payload
 * without applying unintended UTC/local timezone conversion shifts.
 */
export function extractDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  const s = String(dateStr).trim();

  // 1. Matches YYYY-MM-DD (e.g. 2026-12-03 or 2026-12-03T23:59:59Z)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 2. Matches DD-MM-YYYY (e.g. 03-12-2026)
  const dmyMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. Matches D/M/YYYY or M/D/YYYY from legacy string
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    let [, p1, p2, y] = slashMatch;
    let day = p1;
    let month = p2;
    if (Number(p1) <= 12 && Number(p2) > 12) {
      day = p2;
      month = p1;
    }
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return s;
}

/**
 * Formats coupon validity date to standard DD-MM-YYYY display format
 * without timezone modification.
 */
export function formatCouponValidityDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const s = String(dateStr).trim();

  // 1. Matches YYYY-MM-DD (or YYYY-MM-DDTHH:mm:ss...)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // 2. Matches DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // 3. Matches D/M/YYYY or M/D/YYYY from legacy
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    let [, p1, p2, y] = slashMatch;
    let day = p1;
    let month = p2;
    if (Number(p1) <= 12 && Number(p2) > 12) {
      day = p2;
      month = p1;
    }
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${y}`;
  }

  return s;
}

/**
 * Checks whether a coupon is a Promo Coupon (direct customer distribution).
 * Promo Coupons are funded by FOODIE, have couponType PROMO_COUPON (or GENERIC),
 * are not assigned to a specific restaurant, and never go through restaurant approval.
 */
export function isPromoCoupon(coupon: any): boolean {
  if (!coupon || typeof coupon !== 'object') return false;
  const cType = String(coupon.couponType || '').toUpperCase();
  const fType = String(coupon.funderType || '').toUpperCase();
  if (cType === 'PROMO_COUPON') return true;
  if (cType === 'RESTAURANT' || cType === 'RESTAURANT_COUPON') return false;
  if (coupon.restaurantId) return false;
  if (fType === 'MERCHANT' || fType === 'RESTAURANT') return false;
  if (coupon.module === 'Specific Restaurant' || (coupon.module && coupon.module.includes('Restaurant'))) {
    return false;
  }
  return fType === 'FOODIE' || cType === 'GENERIC';
}

/**
 * Checks whether a coupon is a Restaurant Coupon (distributed to restaurant panel for enable/disable).
 */
export function isRestaurantCoupon(coupon: any): boolean {
  if (!coupon || typeof coupon !== 'object') return false;
  if (isPromoCoupon(coupon)) return false;
  const cType = String(coupon.couponType || '').toUpperCase();
  const fType = String(coupon.funderType || '').toUpperCase();
  if (cType === 'RESTAURANT' || cType === 'RESTAURANT_COUPON') return true;
  if (coupon.restaurantId) return true;
  if (fType === 'MERCHANT' || fType === 'RESTAURANT') return true;
  if (coupon.module === 'Specific Restaurant') return true;
  if (coupon.module && coupon.module.includes('Restaurant')) return true;
  return false;
}

/**
 * Checks whether a restaurant coupon has been manually enabled for a specific restaurant.
 * Zone-wise coupons reach assigned restaurants with DISABLED status by default and are never automatically enabled.
 */
export function isCouponEnabledForRestaurant(coupon: any, restaurantId: string): boolean {
  if (!coupon || !restaurantId) return false;

  const cleanRest = restaurantId.trim().toLowerCase();

  // 1. Explicit per-restaurant status in restaurantStatuses map
  if (coupon.restaurantStatuses && typeof coupon.restaurantStatuses === 'object') {
    const val = coupon.restaurantStatuses[cleanRest] ?? coupon.restaurantStatuses[restaurantId];
    if (typeof val === 'boolean') {
      return val;
    }
  }

  // 2. Explicitly enabled list
  if (Array.isArray(coupon.enabledRestaurantIds)) {
    const isExplicitlyEnabled = coupon.enabledRestaurantIds.some(
      (id: string) => typeof id === 'string' && id.trim().toLowerCase() === cleanRest
    );
    if (isExplicitlyEnabled) return true;
    return false;
  }

  // 3. Explicitly disabled list
  if (Array.isArray(coupon.disabledRestaurantIds)) {
    const isExplicitlyDisabled = coupon.disabledRestaurantIds.some(
      (id: string) => typeof id === 'string' && id.trim().toLowerCase() === cleanRest
    );
    if (isExplicitlyDisabled) return false;
  }

  // 4. Specific single-restaurant coupon
  if (coupon.restaurantId && coupon.restaurantId.trim().toLowerCase() === cleanRest) {
    return coupon.isActive === true && coupon.status !== 'DEACTIVATED' && coupon.status !== 'DISABLED';
  }

  // 5. Zone-wise / global restaurant coupon:
  // Must reach restaurants with DISABLED status by default. Never make automatically enabled.
  return false;
}

/**
 * Filters coupons for Customer App according to zone eligibility:
 * - Scenario A (Tumkur): Tumkur customers see Tumkur promo coupons + All Zones promo coupons.
 * - Scenario B (Bangalore): Bangalore customers see Bangalore promo coupons + All Zones promo coupons.
 * - Scenario C (All Zones): All customers across all zones see All Zones promo coupons.
 */
export function filterCouponsForCustomerDirect(
  coupons: any[],
  customerZone?: string | null,
  targetRestaurantId?: string | null
): any[] {
  if (!Array.isArray(coupons)) return [];
  const cleanCustomerZone = customerZone ? customerZone.trim() : '';
  const cleanTargetRest = targetRestaurantId ? targetRestaurantId.trim().toLowerCase() : '';

  return coupons.filter((coupon) => {
    if (!coupon) return false;

    // 1. Promo Coupon Flow (Direct Customer App distribution)
    if (isPromoCoupon(coupon)) {
      if (coupon.isActive === false) return false;

      const isGlobal =
        !coupon.zoneId ||
        coupon.zoneId === 'ALL' ||
        coupon.isAllZones === true ||
        (coupon.zoneName && coupon.zoneName.toLowerCase().includes('all'));

      if (isGlobal) {
        return true;
      }

      if (!cleanCustomerZone) {
        return false;
      }

      return (
        isZoneMatching(coupon.zoneId, cleanCustomerZone) ||
        Boolean(coupon.zoneName && isZoneMatching(coupon.zoneName, cleanCustomerZone))
      );
    }

    // 2. Restaurant Coupon Flow
    if (isRestaurantCoupon(coupon)) {
      if (cleanTargetRest) {
        // Dedicated to a different restaurant
        if (coupon.restaurantId && coupon.restaurantId.trim().toLowerCase() !== cleanTargetRest) {
          return false;
        }
        // "Only after a restaurant enables it, the coupon should appear to customers selecting that specific restaurant.
        // If disabled, it must not appear or be applicable at checkout."
        if (!isCouponEnabledForRestaurant(coupon, cleanTargetRest)) {
          return false;
        }
      } else {
        // No specific restaurant selected
        if (coupon.isActive === false) return false;
        if (Array.isArray(coupon.enabledRestaurantIds) && coupon.enabledRestaurantIds.length === 0) {
          return false;
        }
      }

      if (cleanCustomerZone && coupon.zoneId && coupon.zoneId !== 'ALL' && !coupon.isAllZones) {
        return (
          isZoneMatching(coupon.zoneId, cleanCustomerZone) ||
          Boolean(coupon.zoneName && isZoneMatching(coupon.zoneName, cleanCustomerZone))
        );
      }
      return true;
    }

    return false;
  });
}

/**
 * Filters coupons for Restaurant Panel Promos:
 * Promo Coupons must NEVER be returned to any Restaurant Panel.
 */
export function filterCouponsForRestaurantPanel(
  coupons: any[],
  restaurantId: string,
  restaurantZone?: string | null
): any[] {
  if (!Array.isArray(coupons) || !restaurantId) return [];
  const cleanRest = restaurantId.trim().toLowerCase();
  const cleanZone = restaurantZone ? restaurantZone.trim() : '';

  return coupons
    .filter((coupon) => {
      // 1. Promo Coupons MUST NEVER appear in Restaurant Panel
      if (isPromoCoupon(coupon)) {
        return false;
      }

      // 2. Must be a valid Restaurant Coupon
      if (!isRestaurantCoupon(coupon)) {
        return false;
      }

      // 3. Direct restaurant match
      if (coupon.restaurantId && coupon.restaurantId.trim().toLowerCase() === cleanRest) {
        return true;
      }

      // 4. Assigned to a different restaurant
      if (coupon.restaurantId && coupon.restaurantId.trim().toLowerCase() !== cleanRest) {
        return false;
      }

      // 5. Zone-wise coupon
      if (coupon.zoneId && cleanZone) {
        if (
          isZoneMatching(coupon.zoneId, cleanZone) ||
          Boolean(coupon.zoneName && isZoneMatching(coupon.zoneName, cleanZone))
        ) {
          return true;
        }
      }

      // 6. Global restaurant coupon (All Locations)
      if (!coupon.zoneId || coupon.zoneId === 'ALL' || coupon.isAllZones === true) {
        return true;
      }

      return false;
    })
    .map((coupon) => {
      const isEnabled = isCouponEnabledForRestaurant(coupon, cleanRest);
      return {
        ...coupon,
        restaurantId: coupon.restaurantId || restaurantId,
        isActive: isEnabled,
        status: isEnabled ? 'ACTIVE' : 'DEACTIVATED',
      };
    });
}

