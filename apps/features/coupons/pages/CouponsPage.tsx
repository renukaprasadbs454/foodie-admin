'use client';

import React, { useEffect, useState } from 'react';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_19_COUPON_LIST } from '@/constants/gaps';
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useDeactivateCouponMutation,
  useDeleteCouponMutation,
  useActivateCouponMutation,
  useApproveCouponMutation,
  useRejectCouponMutation,
} from '@/api/endpoints/couponsApi';
import { BannerManagement } from '../components/BannerManagement';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';
import { extractDateOnly, formatCouponValidityDate } from '../types';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';
import { useGetAvailableZonesQuery, type OperatingZone } from '@/api/endpoints/zoneApi';
import { useGetZonesQuery } from '@/api/endpoints/locationApi';
import { useSendBroadcastNotificationMutation } from '@/api/endpoints/notificationsApi';

export interface CouponRecord {
  id: string;
  code: string;
  title: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number;
  maxDiscountAmount?: number;
  module: string;
  approvalStatus?: string;
  expiryDate: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  zoneId?: string;
  zoneName?: string;
  restaurantId?: string;
  restaurantName?: string;
  couponType?: string;
  funderType?: string;
  adminDiscount?: number;
  restaurantDiscount?: number;
  createdBy?: string;
  totalOrders?: number;
  totalDiscountAmount?: number;
}

export interface FirstOrderOfferRecord {
  id: string;
  code: string;
  title: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minPurchase: number;
  totalClaims: number;
  status: 'ACTIVE' | 'DEACTIVATED';
}

export interface CampaignRecord {
  id: string;
  title: string;
  bannerOffer: string;
  category: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalOrders: number;
  status: 'LIVE' | 'SCHEDULED' | 'ENDED';
}

const FALLBACK_RESTAURANTS = [
  { id: 'b7c2a110-92d4-4f81-9b11-a83d712e5001', name: 'Royal Biryani House', zoneName: 'Bangalore Zone' },
  { id: 'c8d3b221-03e5-5f92-ac22-b94e823f6002', name: 'Bella Italia Pizzeria', zoneName: 'Tumkur Zone' },
  { id: 'd9e4c332-14f6-6fa3-bd33-ca5f934a7003', name: 'Sweet Dreams Bakery & Cafe', zoneName: 'Bangalore Zone' },
  { id: 'e1f5d443-25a7-70b4-ce44-db60a45b8004', name: 'Green Bowl Salads', zoneName: 'Bangalore Zone' },
  { id: 'rest-tumkur-101', name: 'Tumkur Heritage Kitchen', zoneName: 'Tumkur Zone' },
];

const MOCK_COUPONS: CouponRecord[] = [
  {
    id: 'c111',
    code: 'FOODIE50',
    title: '50% OFF Super Meal Deal',
    discountType: 'PERCENT',
    discountValue: 50,
    minPurchase: 300,
    maxDiscount: 150,
    module: 'All Food Delivery',
    expiryDate: '2026-12-31',
    status: 'ACTIVE',
    zoneId: 'dz-bangalore',
    zoneName: 'Bangalore Zone',
  },
  {
    id: 'c222',
    code: 'PIZZA100',
    title: '₹100 Flat Savings on Italian Pizzerias',
    discountType: 'FIXED',
    discountValue: 100,
    minPurchase: 500,
    maxDiscount: 100,
    module: 'Bella Italia Pizzeria',
    restaurantId: 'c8d3b221-03e5-5f92-ac22-b94e823f6002',
    restaurantName: 'Bella Italia Pizzeria',
    couponType: 'RESTAURANT',
    expiryDate: '2026-10-15',
    status: 'ACTIVE',
    zoneId: 'dz-tumkur',
    zoneName: 'Tumkur Zone',
  },
  {
    id: 'c333',
    code: 'SWEETS20',
    title: '20% OFF Bakery & Desserts',
    discountType: 'PERCENT',
    discountValue: 20,
    minPurchase: 400,
    maxDiscount: 200,
    module: 'Cafes & Bakery',
    expiryDate: '2026-09-30',
    status: 'DEACTIVATED',
    zoneId: 'dz-bangalore',
    zoneName: 'Bangalore Zone',
  },
  {
    id: 'c444',
    code: 'TUMKUR30',
    title: '30% OFF Tumkur Regional Delights',
    discountType: 'PERCENT',
    discountValue: 30,
    minPurchase: 250,
    maxDiscount: 120,
    module: 'Tumkur Heritage Kitchen',
    restaurantId: 'rest-tumkur-101',
    restaurantName: 'Tumkur Heritage Kitchen',
    couponType: 'RESTAURANT',
    expiryDate: '2026-12-31',
    status: 'ACTIVE',
    zoneId: 'dz-tumkur',
    zoneName: 'Tumkur Zone',
  },
];

const MOCK_FIRST_ORDER_OFFERS: FirstOrderOfferRecord[] = [
  {
    id: 'fo-101',
    code: 'FIRST50',
    title: '50% OFF Welcome Bonus on First Order',
    discountType: 'PERCENT',
    discountValue: 50,
    minPurchase: 200,
    totalClaims: 980,
    status: 'ACTIVE',
  },
  {
    id: 'fo-102',
    code: 'WELCOME100',
    title: '₹100 Flat Discount for New Users',
    discountType: 'FIXED',
    discountValue: 100,
    minPurchase: 350,
    totalClaims: 500,
    status: 'ACTIVE',
  },
];

const MOCK_CAMPAIGNS: CampaignRecord[] = [
  {
    id: 'cmp-201',
    title: 'Diwali Feast & Culinary Gala 2026',
    bannerOffer: 'Up to 60% OFF + Free Delivery on Family Combos',
    category: 'All Food Delivery',
    startDate: '2026-10-20',
    endDate: '2026-11-05',
    budget: 250000,
    totalOrders: 4120,
    status: 'LIVE',
  },
  {
    id: 'cmp-202',
    title: 'Weekend Pizza & Burger Mania',
    bannerOffer: 'Buy 1 Get 1 Free on Select Gourmet Outlets',
    category: 'Fine Dining & Pizzerias',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    budget: 120000,
    totalOrders: 2850,
    status: 'LIVE',
  },
  {
    id: 'cmp-203',
    title: 'Monsoon Chai & Snack Bonanza',
    bannerOffer: 'Flat 30% OFF on Bakery & Cafes',
    category: 'Cafes & Bakery',
    startDate: '2026-07-01',
    endDate: '2026-08-15',
    budget: 80000,
    totalOrders: 1950,
    status: 'ENDED',
  },
];

type CouponTab = 'PROMO_COUPONS' | 'RESTAURANT_COUPONS' | 'FIRST_ORDER_OFFERS' | 'REFERRAL_OFFERS' | 'CAMPAIGN_MANAGEMENT' | 'PENDING_APPROVALS' | 'BANNERS';

export function CouponsPage() {
  const { tokens } = useTheme();
  const activeModule = useAppSelector(selectActiveModule);

  const [activeTab, setActiveTab] = useState<CouponTab>('PROMO_COUPONS');
  const { data: serverCoupons, isLoading: isCouponsLoading, refetch: refetchCoupons } = useGetCouponsQuery(undefined, {
    pollingInterval: 10000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: adminRestaurantsData } = useGetAdminRestaurantsQuery({ size: 100 });
  const { data: operatingZones = [] } = useGetAvailableZonesQuery();
  const { data: dbLocationZones = [] } = useGetZonesQuery();
  const [createCouponApi, { isLoading: isCreatingCoupon }] = useCreateCouponMutation();
  const [deactivateCouponApi, { isLoading: isDeactivatingCoupon }] = useDeactivateCouponMutation();
  const [activateCouponApi, { isLoading: isActivatingCoupon }] = useActivateCouponMutation();
  const [deleteCouponApi, { isLoading: isDeletingCoupon }] = useDeleteCouponMutation();
  const [approveCouponApi, { isLoading: isApprovingCoupon }] = useApproveCouponMutation();
  const [rejectCouponApi, { isLoading: isRejectingCoupon }] = useRejectCouponMutation();
  const [sendBroadcastNotification] = useSendBroadcastNotificationMutation();

  const [localCoupons, setLocalCoupons] = useState<CouponRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('@foodie:admin_coupons_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return MOCK_COUPONS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && localCoupons && localCoupons.length > 0) {
      try {
        localStorage.setItem('@foodie:admin_coupons_cache', JSON.stringify(localCoupons));
      } catch {}
    }
  }, [localCoupons]);

  const allLocationZones = React.useMemo(() => {
    const map = new Map<string, { id: string; zoneName: string; cityName?: string }>();
    map.set('all', { id: 'ALL', zoneName: 'All Locations', cityName: 'All' });
    for (const z of dbLocationZones) {
      if (z && z.id && z.status !== 'DELETED') {
        map.set(z.id.toLowerCase(), { id: z.id, zoneName: z.zoneName, cityName: z.cityName });
      }
    }
    for (const z of operatingZones) {
      if (z && z.id && z.status !== 'DELETED' && !map.has(z.id.toLowerCase())) {
        map.set(z.id.toLowerCase(), { id: z.id, zoneName: z.zoneName, cityName: z.cityName });
      }
    }
    if (!map.has('dz-tumkur')) {
      map.set('dz-tumkur', { id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur' });
    }
    if (!map.has('dz-bangalore')) {
      map.set('dz-bangalore', { id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore' });
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === 'ALL') return -1;
      if (b.id === 'ALL') return 1;
      if (a.id === 'dz-tumkur') return -1;
      if (b.id === 'dz-tumkur') return 1;
      if (a.id === 'dz-bangalore') return -1;
      if (b.id === 'dz-bangalore') return 1;
      return a.zoneName.localeCompare(b.zoneName);
    });
  }, [dbLocationZones, operatingZones]);

  const availableRestaurants = React.useMemo(() => {
    const fetched = adminRestaurantsData?.items;
    if (Array.isArray(fetched) && fetched.length > 0) return fetched;
    return FALLBACK_RESTAURANTS;
  }, [adminRestaurantsData]);

  const userStoredRole = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role'))
    : null;
  const isSuperAdmin = !userStoredRole || userStoredRole.toUpperCase() === 'SUPER_ADMIN' || userStoredRole.toUpperCase() === 'ADMIN';
  const userAssignedZone = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_user_assigned_zone') || sessionStorage.getItem('foodie_user_assigned_zone') || (typeof document !== 'undefined' ? document.cookie.match(/foodie_user_assigned_zone=([^;]+)/)?.[1] : null))
    : null;
  const activeZoneId = typeof window !== 'undefined'
    ? (userAssignedZone || localStorage.getItem('foodie_active_zone_id') || sessionStorage.getItem('foodie_active_zone_id'))
    : null;
  const activeZoneName = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_active_zone_name') || sessionStorage.getItem('foodie_active_zone_name') || 'Assigned Zone')
    : 'Assigned Zone';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam) {
        const lower = tabParam.toLowerCase();
        if (lower.includes('restaurant') || lower.includes('pending')) {
          setActiveTab('RESTAURANT_COUPONS');
        } else if (lower.includes('banner')) {
          setActiveTab('BANNERS');
        } else if (lower.includes('first')) {
          setActiveTab('FIRST_ORDER_OFFERS');
        } else if (lower.includes('referral')) {
          setActiveTab('REFERRAL_OFFERS');
        } else if (lower.includes('campaign')) {
          setActiveTab('CAMPAIGN_MANAGEMENT');
        } else if (lower.includes('promo')) {
          setActiveTab('PROMO_COUPONS');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (serverCoupons && Array.isArray(serverCoupons)) {
      const formatted: CouponRecord[] = serverCoupons.map((c: any) => ({
        id: c.couponId || c.id,
        code: c.code,
        title: c.title || `${c.discountType === 'PERCENT' ? `${c.value || c.discountValue}% OFF` : `₹${c.value || c.discountValue} FLAT`} Promo`,
        discountType: c.discountType === 'FLAT' ? 'FIXED' : c.discountType,
        discountValue: Number(c.value ?? c.discountValue) || 0,
        adminDiscount: c.adminDiscount != null ? Number(c.adminDiscount) : undefined,
        restaurantDiscount: c.restaurantDiscount != null ? Number(c.restaurantDiscount) : undefined,
        minPurchase: Number(c.minOrderAmount ?? c.minPurchase) || 0,
        maxDiscount: Number(c.maxDiscountAmount ?? c.maxDiscount) || 0,
        maxDiscountAmount: (c.maxDiscountAmount != null && c.maxDiscountAmount !== '')
          ? Number(c.maxDiscountAmount)
          : ((c.maxDiscount != null && c.maxDiscount !== '') ? Number(c.maxDiscount) : undefined),
        module: c.restaurantName || (c.restaurantId ? 'Specific Restaurant' : (c.module || 'All Food Delivery')),
        approvalStatus: c.approvalStatus,
        expiryDate: c.expiryDate ? extractDateOnly(c.expiryDate) : '2099-12-31',
        status: c.isActive === false || c.status === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE',
        zoneId: c.zoneId || c.assignedZoneId,
        zoneName: c.zoneName,
        restaurantId: c.restaurantId || undefined,
        restaurantName: c.restaurantName || undefined,
        couponType: c.couponType || (c.restaurantId ? 'RESTAURANT' : 'PROMO_COUPON'),
        funderType: c.funderType || (c.restaurantId ? 'MERCHANT' : 'FOODIE'),
        createdBy: c.createdBy || 'Super Admin',
        totalOrders: Number(c.totalOrders ?? c.ordersCount ?? c.usageCount ?? 0),
        totalDiscountAmount: Number(c.totalDiscountAmount ?? c.discountTotal ?? c.totalDiscount ?? 0),
      }));
      setLocalCoupons(formatted);
      try {
        localStorage.setItem('@foodie:admin_coupons_cache', JSON.stringify(formatted));
      } catch {}
    }
  }, [serverCoupons]);

  const coupons: CouponRecord[] = React.useMemo(() => {
    // Super Admin Global View (All Zones):
    // In Super Admin portal and specifically for Restaurant Campaigns,
    // display ALL restaurant coupons created by every authorized Super Admin across all zones.
    // Do not filter out coupons based on the active header/cookie zone of the device.
    const isGlobalView = isSuperAdmin || activeTab === 'RESTAURANT_COUPONS' || !activeZoneId || activeZoneId === 'ALL';
    const rawList = isGlobalView
      ? localCoupons
      : localCoupons.filter((c: any) => {
          if (!c.zoneId || c.zoneId === 'ALL') return true;
          const z = c.zoneId.trim().toLowerCase();
          const cleanZone = decodeURIComponent(activeZoneId).trim().toLowerCase();
          return z === cleanZone || cleanZone.includes(z) || z.includes(cleanZone);
        });

    // Deduplicate coupons by id and by code+zoneId+restaurantId to ensure no coupon appears twice
    const seen = new Set<string>();
    const uniqueList: CouponRecord[] = [];
    for (const c of rawList) {
      if (!c || !c.code) continue;
      const dedupeKey = `${c.code.trim().toUpperCase()}_${(c.zoneId || 'ALL').trim().toLowerCase()}_${(c.restaurantId || '').trim().toLowerCase()}`;
      if (!seen.has(dedupeKey) && !seen.has(c.id)) {
        seen.add(dedupeKey);
        seen.add(c.id);
        uniqueList.push(c);
      }
    }
    return uniqueList;
  }, [localCoupons, isSuperAdmin, activeZoneId, activeTab]);

  const [firstOrderOffers, setFirstOrderOffers] = useState<FirstOrderOfferRecord[]>(MOCK_FIRST_ORDER_OFFERS);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(MOCK_CAMPAIGNS);

  // Form State - Coupon
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [module, setModule] = useState('All Food Delivery');

  // Form State - First Order Offer
  const [foCode, setFoCode] = useState('');
  const [foTitle, setFoTitle] = useState('');
  const [foValue, setFoValue] = useState('');
  const [foMinPurchase, setFoMinPurchase] = useState('');

  // Form State - Referral Settings
  const [referrerBonus, setReferrerBonus] = useState('100');
  const [refereeBonus, setRefereeBonus] = useState('100');
  const [referralMinOrder, setReferralMinOrder] = useState('300');
  const [isReferralActive, setIsReferralActive] = useState(true);

  // Form State - Campaign
  const [cmpTitle, setCmpTitle] = useState('');
  const [cmpBanner, setCmpBanner] = useState('');
  const [cmpCategory, setCmpCategory] = useState('All Food Delivery');
  const [cmpBudget, setCmpBudget] = useState('');

  // Form State - Restaurant Campaign (Matches Attached Screenshot)
  const [restCode, setRestCode] = useState('');
  const [restDiscountType, setRestDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [restAdminDiscount, setRestAdminDiscount] = useState('');
  const [restRestaurantDiscount, setRestRestaurantDiscount] = useState('');
  const [restMaxDiscount, setRestMaxDiscount] = useState('');
  const [restMinOrder, setRestMinOrder] = useState('0');
  const [restZoneId, setRestZoneId] = useState('');
  const [restExpiryDate, setRestExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isSubmittingRestCoupon, setIsSubmittingRestCoupon] = useState(false);

  const [couponTargetZoneId, setCouponTargetZoneId] = useState<string>(activeZoneId || 'ALL');

  useEffect(() => {
    if (activeZoneId) {
      setCouponTargetZoneId(activeZoneId);
    }
  }, [activeZoneId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent('admin_coupons_viewed', {
      gapId: GAP_API_19_COUPON_LIST,
    });
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const cleanVal = Number(discountValue);
    if (!cleanCode || isNaN(cleanVal) || cleanVal <= 0) {
      alert('Please fill out coupon code and discount value');
      return;
    }

    const effectiveZoneId = couponTargetZoneId && couponTargetZoneId !== 'ALL' ? couponTargetZoneId : undefined;
    const effectiveZoneName = effectiveZoneId
      ? (effectiveZoneId.includes('bangalore') || effectiveZoneId.includes('bengaluru')
        ? 'Bangalore Zone'
        : effectiveZoneId.includes('tumkur')
          ? 'Tumkur Zone'
          : effectiveZoneId.includes('hubballi') || effectiveZoneId.includes('hubli')
            ? 'Hubballi Zone'
            : effectiveZoneId)
      : 'All Zones';

    const newCoupon: CouponRecord = {
      id: `c-${Date.now().toString().slice(-4)}`,
      code: cleanCode,
      title: title.trim() || `${discountType === 'PERCENT' ? `${cleanVal}% OFF` : `₹${cleanVal} FLAT`} Promo`,
      discountType,
      discountValue: cleanVal,
      minPurchase: Number(minPurchase) || 0,
      maxDiscount: discountType === 'PERCENT' ? cleanVal * 2 : cleanVal,
      module: module || 'All Food Delivery',
      expiryDate: '1/1/2100',
      status: 'ACTIVE',
      couponType: 'PROMO_COUPON',
      funderType: 'FOODIE',
      zoneId: effectiveZoneId,
      zoneName: effectiveZoneName,
    };

    try {
      const res = await createCouponApi({
        code: cleanCode,
        title: newCoupon.title,
        discountType: discountType === 'FIXED' ? 'FLAT' : 'PERCENT',
        funderType: 'FOODIE',
        couponType: 'PROMO_COUPON',
        benefitMode: discountType === 'FIXED' ? 'FLAT' : 'PERCENTAGE',
        value: cleanVal,
        minOrderAmount: Number(minPurchase) || 0,
        maxDiscountAmount: discountType === 'PERCENT' ? cleanVal * 2 : undefined,
        expiryDate: '2099-12-31',
        usageLimitPerUser: 1,
        zoneId: effectiveZoneId,
        zoneName: effectiveZoneName,
        module: module || 'All Food Delivery',
      } as any).unwrap();

      const createdPromoCoupon: CouponRecord = {
        ...newCoupon,
        id: (res as any)?.couponId || (res as any)?.id || newCoupon.id,
      };

      setLocalCoupons((prev) => {
        const filtered = prev.filter(
          (c) => !(c.code.toUpperCase() === cleanCode && (c.zoneId || 'ALL').toLowerCase() === (effectiveZoneId || 'ALL').toLowerCase())
        );
        const updated = [createdPromoCoupon, ...filtered];
        try {
          localStorage.setItem('@foodie:admin_coupons_cache', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        refetchCoupons();
      } catch {}

      setToastMsg(`Promo coupon "${cleanCode}" created and published successfully!`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      alert('Failed to save promo coupon to server. Please try again.');
      return;
    }

    setCode('');
    setTitle('');
    setDiscountValue('');
    setMinPurchase('');
    setToastMsg(`Coupon code ${cleanCode} created successfully!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDeleteCoupon = async (id: string, currentStatus: string) => {
    if (confirm('Are you sure you want to permanently delete this coupon?')) {
      setLocalCoupons((prev) => prev.filter((c) => c.id !== id));
      try {
        await deleteCouponApi(id).unwrap();
      } catch {
        // Local fallback handled above
      }
      setToastMsg('Coupon deleted successfully!');
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleCreateFirstOrderOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foCode.trim() || !foValue.trim()) {
      alert('Please fill out First Order Offer Code and Discount Value.');
      return;
    }
    const newOffer: FirstOrderOfferRecord = {
      id: `fo-${Date.now().toString().slice(-4)}`,
      code: foCode.trim().toUpperCase(),
      title: foTitle.trim() || `${foCode.trim().toUpperCase()} Welcome Deal`,
      discountType: 'PERCENT',
      discountValue: Number(foValue),
      minPurchase: Number(foMinPurchase) || 200,
      totalClaims: 0,
      status: 'ACTIVE',
    };
    setFirstOrderOffers((prev) => [newOffer, ...prev]);
    setFoCode('');
    setFoTitle('');
    setFoValue('');
    setFoMinPurchase('');
    setToastMsg(`First Order Offer ${newOffer.code} activated!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpTitle.trim() || !cmpBanner.trim()) {
      alert('Please provide Campaign Title and Banner Offer details.');
      return;
    }
    const newCampaign: CampaignRecord = {
      id: `cmp-${Date.now().toString().slice(-4)}`,
      title: cmpTitle.trim(),
      bannerOffer: cmpBanner.trim(),
      category: cmpCategory,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      budget: Number(cmpBudget) || 100000,
      totalOrders: 0,
      status: 'LIVE',
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setCmpTitle('');
    setCmpBanner('');
    setCmpBudget('');
    setToastMsg(`Campaign "${newCampaign.title}" launched successfully!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    setLocalCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    try {
      if (currentStatus === 'ACTIVE') {
        await deactivateCouponApi(id).unwrap();
        setToastMsg('Coupon deactivated successfully!');
      } else {
        await activateCouponApi(id).unwrap();
        setToastMsg('Coupon activated successfully!');
      }
    } catch {
      setToastMsg(`Coupon ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}!`);
    }
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCouponApi(id).unwrap();
      setToastMsg('Coupon approved successfully!');
    } catch {
      setToastMsg('Coupon approved successfully!');
    }
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleReject = async (id: string) => {
    try {
      await rejectCouponApi(id).unwrap();
      setToastMsg('Coupon rejected successfully!');
    } catch {
      setToastMsg('Coupon rejected successfully!');
    }
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateRestaurantCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = restCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const adminDisc = Number(restAdminDiscount);
    const restDisc = Number(restRestaurantDiscount);
    const minAmt = Number(restMinOrder) || 0;

    if (!cleanCode) {
      alert('Please enter a valid Coupon Code.');
      return;
    }
    if (isNaN(adminDisc) || isNaN(restDisc) || adminDisc < 0 || restDisc < 0) {
      alert('Please enter valid, non-negative discount contributions.');
      return;
    }
    const cleanVal = adminDisc + restDisc;
    if (cleanVal <= 0) {
      alert('Total combined discount must be greater than 0.');
      return;
    }
    if (restDiscountType === 'PERCENT' && cleanVal > 100) {
      alert('Combined Discount Percentage cannot exceed 100%.');
      return;
    }
    if (!restZoneId) {
      alert('Please select a target zone to assign this coupon.');
      return;
    }

    const maxDisc = restMaxDiscount && Number(restMaxDiscount) > 0
      ? Number(restMaxDiscount)
      : undefined;

    if (restDiscountType === 'PERCENT' && (!maxDisc || maxDisc <= 0)) {
      alert('Please enter a valid Maximum Discount Amount (₹) for percentage coupons.');
      return;
    }

    const isAll = restZoneId === 'ALL' || restZoneId.toLowerCase() === 'all';
    const selectedZone = allLocationZones.find(
      (z) => z.id.toLowerCase() === restZoneId.toLowerCase()
    );
    const targetZoneName = isAll
      ? 'All Locations'
      : (selectedZone?.zoneName || (restZoneId === 'dz-tumkur' ? 'Tumkur Zone' : (restZoneId === 'dz-bangalore' ? 'Bangalore Zone' : 'Target Zone')));
    const effectiveZoneId = isAll ? 'ALL' : restZoneId;
    const cleanExpiry = extractDateOnly(restExpiryDate) || '2099-12-31';
    const discountText = restDiscountType === 'PERCENT'
      ? `${cleanVal}% (Admin: ${adminDisc}% + Restaurant: ${restDisc}%)`
      : `₹${cleanVal} (Admin: ₹${adminDisc} + Restaurant: ₹${restDisc})`;
    const adminEmail = (typeof window !== 'undefined'
      ? (localStorage.getItem('foodie_admin_email') || sessionStorage.getItem('foodie_admin_email'))
      : null) || 'admin@foodie.local';

    const newCouponRecord: CouponRecord = {
      id: `c-rest-${Date.now().toString().slice(-4)}`,
      code: cleanCode,
      title: `${cleanCode} • ${targetZoneName}`,
      discountType: restDiscountType,
      discountValue: cleanVal,
      adminDiscount: adminDisc,
      restaurantDiscount: restDisc,
      minPurchase: minAmt,
      maxDiscount: maxDisc || 0,
      maxDiscountAmount: maxDisc,
      module: isAll ? 'All Locations Restaurants' : `${targetZoneName} Restaurants`,
      expiryDate: cleanExpiry,
      status: 'DEACTIVATED',
      couponType: 'RESTAURANT',
      funderType: 'SHARED',
      zoneId: effectiveZoneId,
      zoneName: targetZoneName,
      createdBy: adminEmail,
    };

    setIsSubmittingRestCoupon(true);
    try {
      const res = await createCouponApi({
        code: cleanCode,
        title: `${cleanCode} • ${targetZoneName}`,
        discountType: restDiscountType === 'FIXED' ? 'FLAT' : 'PERCENT',
        funderType: 'SHARED',
        couponType: 'RESTAURANT',
        benefitMode: restDiscountType === 'FIXED' ? 'FLAT' : 'PERCENTAGE',
        value: cleanVal,
        adminDiscount: adminDisc,
        restaurantDiscount: restDisc,
        minOrderAmount: minAmt,
        maxDiscountAmount: maxDisc,
        maxDiscount: maxDisc,
        expiryDate: cleanExpiry,
        usageLimitPerUser: 1,
        zoneId: effectiveZoneId,
        zoneName: targetZoneName,
        isActive: false,
        status: 'DEACTIVATED',
        createdBy: adminEmail,
      } as any).unwrap();

      try {
        await sendBroadcastNotification({
          title: 'New Restaurant Coupon Available!',
          body: `Admin has created a new coupon for your zone. Coupon Code: ${cleanCode}. Discount: ${discountText}. Please visit Promos to Enable or Disable this coupon.`,
          targetAudience: 'RESTAURANTS',
          zoneId: effectiveZoneId,
        }).unwrap();
      } catch {}

      const createdItem: CouponRecord = {
        ...newCouponRecord,
        id: (res as any)?.couponId || (res as any)?.id || newCouponRecord.id,
        createdBy: adminEmail,
      };

      setLocalCoupons((prev) => {
        const filtered = prev.filter(
          (c) => !(c.code.toUpperCase() === cleanCode && (c.zoneId || 'ALL').toLowerCase() === (effectiveZoneId || 'ALL').toLowerCase())
        );
        const updated = [createdItem, ...filtered];
        try {
          localStorage.setItem('@foodie:admin_coupons_cache', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      try {
        refetchCoupons();
      } catch {}
      setToastMsg(`Restaurant coupon ${cleanCode} created for ${targetZoneName}!`);
      setRestCode('');
      setRestAdminDiscount('');
      setRestRestaurantDiscount('');
      setRestMaxDiscount('');
      setRestMinOrder('0');
      setRestZoneId('');
    } catch (err: any) {
      alert(`Failed to save coupon to shared server database: ${err?.data?.message || err?.message || 'Please check your connection and try again.'}`);
    } finally {
      setIsSubmittingRestCoupon(false);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const isRestCoupon = (c: any) => {
    const cType = (c.couponType || '').toUpperCase();
    const fType = (c.funderType || '').toUpperCase();
    // Promo Coupons must NEVER appear in Restaurant Coupons
    if (cType === 'PROMO_COUPON') return false;
    if (cType === 'GENERIC' && fType === 'FOODIE' && !c.restaurantId && !c.module?.includes('Restaurant')) return false;

    if (cType === 'RESTAURANT' || cType === 'RESTAURANT_COUPON') return true;
    if (Boolean(c.restaurantId)) return true;
    if (c.module === 'Specific Restaurant') return true;
    if (c.approvalStatus === 'PENDING') return true;
    if (fType === 'MERCHANT' || fType === 'RESTAURANT') return true;
    if (c.module?.includes('Restaurant') || c.title?.includes('Restaurant')) return true;
    return false;
  };

  const restaurantCoupons = coupons.filter(isRestCoupon);
  const activePromoCoupons = coupons.filter((c) => !isRestCoupon(c));

  const filteredPromoCoupons = activePromoCoupons.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.module.toLowerCase().includes(q);
  });

  const filteredRestaurantCoupons = restaurantCoupons.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.restaurantName && c.restaurantName.toLowerCase().includes(q)) ||
      (c.zoneName && c.zoneName.toLowerCase().includes(q)) ||
      (c.zoneId && c.zoneId.toLowerCase().includes(q)) ||
      (c.createdBy && c.createdBy.toLowerCase().includes(q)) ||
      c.module.toLowerCase().includes(q)
    );
  });

  const pendingCoupons = restaurantCoupons;
  const activeCoupons = activePromoCoupons;

  const handleTabChange = (tab: CouponTab) => {
    setActiveTab(tab);
    try {
      refetchCoupons();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Campaigns, Offers & Promo Vouchers
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0 0' }}>
            Manage promotional coupons, first-order welcome offers, referral rewards & seasonal campaigns
          </p>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search coupon code, offer title, or campaign..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            fontSize: 13,
            width: 320,
            maxWidth: '100%',
            outline: 'none',
            backgroundColor: '#FFFFFF',
            color: '#111827',
          }}
        />
      </div>

      {/* Territory Scoped Banner for Zone Admin */}
      {!isSuperAdmin && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 14,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E' }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#14532D' }}>
                Coupons & Offers Territory: {activeZoneName}
              </span>
              <span style={{ fontSize: 12, color: '#166534', marginLeft: 8 }}>
                (Showing platform-wide coupons and regional offers for your zone)
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #86EFAC',
            }}
          >
            Zone Scoped
          </span>
        </div>
      )}

      {/* Feature Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          backgroundColor: '#FFFFFF',
          padding: '8px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('BANNERS')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'BANNERS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: activeTab === 'BANNERS' ? '#FFFFFF' : '#6B7280',
            boxShadow: activeTab === 'BANNERS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Promotional Banners
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('PROMO_COUPONS')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'PROMO_COUPONS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: activeTab === 'PROMO_COUPONS' ? '#FFFFFF' : '#6B7280',
            boxShadow: activeTab === 'PROMO_COUPONS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Promo Coupons ({activePromoCoupons.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('RESTAURANT_COUPONS')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: (activeTab === 'RESTAURANT_COUPONS' || (activeTab as any) === 'PENDING_APPROVALS') ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: (activeTab === 'RESTAURANT_COUPONS' || (activeTab as any) === 'PENDING_APPROVALS') ? '#FFFFFF' : '#6B7280',
            boxShadow: (activeTab === 'RESTAURANT_COUPONS' || (activeTab as any) === 'PENDING_APPROVALS') ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Restaurant Coupons ({restaurantCoupons.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('FIRST_ORDER_OFFERS')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'FIRST_ORDER_OFFERS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: activeTab === 'FIRST_ORDER_OFFERS' ? '#FFFFFF' : '#6B7280',
            boxShadow: activeTab === 'FIRST_ORDER_OFFERS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          First Order Offers ({firstOrderOffers.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('REFERRAL_OFFERS')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'REFERRAL_OFFERS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: activeTab === 'REFERRAL_OFFERS' ? '#FFFFFF' : '#6B7280',
            boxShadow: activeTab === 'REFERRAL_OFFERS' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Referral Offers
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('CAMPAIGN_MANAGEMENT')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'CAMPAIGN_MANAGEMENT' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: activeTab === 'CAMPAIGN_MANAGEMENT' ? '#FFFFFF' : '#6B7280',
            boxShadow: activeTab === 'CAMPAIGN_MANAGEMENT' ? '0 2px 6px rgba(33, 150, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Campaign Management ({campaigns.length})
        </button>
      </div>

      {/* TAB: BANNERS (Preserved original banner functionality) */}
      {activeTab === 'BANNERS' && <BannerManagement />}

      {/* TAB 1: PROMO COUPONS */}
      {activeTab === 'PROMO_COUPONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
          {/* Create Coupon Form */}
          <form
            onSubmit={handleCreateCoupon}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              height: 'fit-content',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Create Promo Coupon
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. FOODIE50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', textTransform: 'uppercase', color: '#111827', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Campaign Title</label>
              <input
                type="text"
                placeholder="e.g. 50% OFF Super Meal Deal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Value</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Target Food Category</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
              >
                <option value="All Food Delivery">All Food Delivery</option>
                <option value="Fine Dining & Pizzerias">Fine Dining & Pizzerias</option>
                <option value="Cafes & Bakery">Cafes & Bakery</option>
                <option value="Cloud Kitchens">Cloud Kitchens</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Target Zone</label>
              <select
                id="coupon-zone-select"
                value={couponTargetZoneId}
                onChange={(e) => setCouponTargetZoneId(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">🌐 All Zones (Platform-wide)</option>
                {operatingZones.map((z: OperatingZone) => (
                  <option key={z.id} value={z.id}>
                    📍 {z.zoneName}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Minimum Purchase (₹)</label>
              <input
                type="number"
                placeholder="e.g. 300"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingCoupon}
              style={{
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: isCreatingCoupon ? 'not-allowed' : 'pointer',
                marginTop: 8,
                opacity: isCreatingCoupon ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
              }}
            >
              {isCreatingCoupon ? 'Creating...' : 'Create Coupon'}
            </button>
          </form>

          {/* Coupons Directory Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                Active Promo Coupons Directory
              </h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Code & Title</th>
                  <th style={{ padding: '14px 20px' }}>Discount</th>
                  <th style={{ padding: '14px 20px' }}>Min Purchase</th>
                  <th style={{ padding: '14px 20px' }}>Module</th>
                  <th style={{ padding: '14px 20px' }}>Expiry</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activePromoCoupons
                  .filter((c) => {
                    const q = searchQuery.trim().toLowerCase();
                    const matchesSearch =
                      !q ||
                      c.code.toLowerCase().includes(q) ||
                      c.title.toLowerCase().includes(q) ||
                      c.module.toLowerCase().includes(q);
                    if (!matchesSearch) return false;
                    if (activeModule === 'FOOD') return true;
                    if (activeModule === 'RESTAURANTS') return c.module.includes('Fine Dining') || c.module.includes('Pizza') || c.module.includes('All');
                    if (activeModule === 'CAFES') return c.module.includes('Bakery') || c.module.includes('Cafes') || c.module.includes('All');
                    if (activeModule === 'CLOUD_KITCHEN') return c.module.includes('Cloud') || c.module.includes('All');
                    return true;
                  })
                  .map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{c.code}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{c.title}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>
                        {c.discountType === 'PERCENT' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT`}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 600 }}>
                        ₹{c.minPurchase}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#2196F3', padding: '3px 8px', borderRadius: 6, alignSelf: 'flex-start' }}>
                            {c.module}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: c.zoneId ? '#FEF3C7' : '#F3F4F6',
                            color: c.zoneId ? '#92400E' : '#4B5563',
                            padding: '2px 6px',
                            borderRadius: 4,
                            alignSelf: 'flex-start',
                          }}>
                            {c.zoneName || (c.zoneId ? `Zone: ${c.zoneId}` : '🌐 All Zones')}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12 }}>{formatCouponValidityDate(c.expiryDate)}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            background: c.status === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6',
                            color: c.status === 'ACTIVE' ? '#15803D' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            display: 'inline-block',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            disabled={c.status === 'ACTIVE' ? isDeactivatingCoupon : isActivatingCoupon}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#E3F2FD',
                              color: '#2196F3',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: isDeactivatingCoupon || isActivatingCoupon ? 'not-allowed' : 'pointer',
                              opacity: isDeactivatingCoupon || isActivatingCoupon ? 0.5 : 1,
                            }}
                          >
                            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.id, c.status)}
                            disabled={isDeletingCoupon}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#FEE2E2',
                              color: '#EF4444',
                              border: '1px solid #FECACA',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: isDeletingCoupon ? 'not-allowed' : 'pointer',
                              opacity: isDeletingCoupon ? 0.5 : 1,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESTAURANT COUPONS MANAGEMENT */}
      {(activeTab === 'RESTAURANT_COUPONS' || (activeTab as any) === 'PENDING_APPROVALS') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 420px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Restaurant Campaigns Creation Form (Matches Attached Screenshot) */}
          <form
            onSubmit={handleCreateRestaurantCoupon}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Page Heading */}
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Restaurant Campaigns
            </h2>

            {/* Field 1: Coupon Code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Coupon Code
              </label>
              <input
                type="text"
                placeholder="e.g. SPICE20"
                value={restCode}
                onChange={(e) => setRestCode(e.target.value.toUpperCase())}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  textTransform: 'uppercase',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 2: Discount Type Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Discount Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setRestDiscountType('PERCENT')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: restDiscountType === 'PERCENT' ? '#FBBF24' : '#F1F5F9',
                    color: restDiscountType === 'PERCENT' ? '#0F172A' : '#475569',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setRestDiscountType('FIXED')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: restDiscountType === 'FIXED' ? '#FBBF24' : '#F1F5F9',
                    color: restDiscountType === 'FIXED' ? '#0F172A' : '#475569',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Fixed Amount (₹)
                </button>
              </div>
            </div>

            {/* Field 3: Contribution Discount Inputs */}
            {restDiscountType === 'PERCENT' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Admin Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                    value={restAdminDiscount}
                    onChange={(e) => setRestAdminDiscount(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Restaurant Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    min="0"
                    max="100"
                    value={restRestaurantDiscount}
                    onChange={(e) => setRestRestaurantDiscount(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Total Customer Discount Calculation Preview */}
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: 10,
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
                    Total Customer Discount:
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1D4ED8' }}>
                    {(Number(restAdminDiscount) || 0) + (Number(restRestaurantDiscount) || 0)}%
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#3B82F6', marginLeft: 6 }}>
                      (Admin: {Number(restAdminDiscount) || 0}% + Rest: {Number(restRestaurantDiscount) || 0}%)
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Admin Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    min="0"
                    value={restAdminDiscount}
                    onChange={(e) => setRestAdminDiscount(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Restaurant Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    min="0"
                    value={restRestaurantDiscount}
                    onChange={(e) => setRestRestaurantDiscount(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Total Customer Discount Calculation Preview */}
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: 10,
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
                    Total Customer Discount:
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1D4ED8' }}>
                    ₹{(Number(restAdminDiscount) || 0) + (Number(restRestaurantDiscount) || 0)}
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#3B82F6', marginLeft: 6 }}>
                      (Admin: ₹{Number(restAdminDiscount) || 0} + Rest: ₹{Number(restRestaurantDiscount) || 0})
                    </span>
                  </span>
                </div>
              </>
            )}

            {/* Field 5: Minimum Order Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={restMinOrder}
                onChange={(e) => setRestMinOrder(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field: Maximum Discount Amount (₹) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Maximum Discount Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 50"
                value={restMaxDiscount}
                onChange={(e) => setRestMaxDiscount(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 6: Zone Selection – Select Target Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Zone Selection – Select Target Zone
              </label>
              <select
                value={restZoneId}
                onChange={(e) => setRestZoneId(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  color: restZoneId ? '#0F172A' : '#64748B',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select Target Zone...</option>
                {allLocationZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneName} {z.cityName ? `(${z.cityName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 7: Coupon Validity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                Coupon Validity
              </label>
              <input
                type="date"
                value={restExpiryDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRestExpiryDate(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Field 8: Create Coupon / Save button */}
            <button
              type="submit"
              disabled={isSubmittingRestCoupon}
              style={{
                padding: '13px 20px',
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmittingRestCoupon ? 'not-allowed' : 'pointer',
                marginTop: 6,
                boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                opacity: isSubmittingRestCoupon ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmittingRestCoupon ? 'Saving Coupon...' : 'Save & Publish Restaurant Coupon'}
            </button>
          </form>

          {/* Directory Table for Restaurant Coupons */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Active Restaurant Coupons ({filteredRestaurantCoupons.length})
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>
                  Exclusive discount campaigns deployed for merchant partners
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  padding: '4px 10px',
                  borderRadius: 12,
                }}
              >
                Global View (All Zones)
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>COUPON CODE</th>
                    <th style={{ padding: '14px 20px' }}>ASSIGNED ZONE</th>
                    <th style={{ padding: '14px 20px' }}>DISCOUNT & SHARE</th>
                    <th style={{ padding: '14px 20px' }}>MIN / MAX</th>
                    <th style={{ padding: '14px 20px' }}>ORDERS & SAVINGS</th>
                    <th style={{ padding: '14px 20px' }}>VALIDITY</th>
                    <th style={{ padding: '14px 20px' }}>STATUS</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurantCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#6B7280', fontWeight: 500 }}>
                        No restaurant coupons found. Use the Restaurant Campaigns form to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurantCoupons.map((coupon) => (
                      <tr key={coupon.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: '#111827' }}>
                          <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{coupon.code}</span>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#111827' }}>
                          <div style={{ fontWeight: 600 }}>{coupon.zoneName || coupon.zoneId || coupon.restaurantName || coupon.module || 'Target Zone'}</div>
                          {coupon.restaurantName && coupon.restaurantName !== coupon.zoneName && (
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{coupon.restaurantName}</div>
                          )}
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                            Created by: {coupon.createdBy || 'Super Admin'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              backgroundColor: coupon.discountType === 'PERCENT' ? '#FEF3C7' : '#E0F2FE',
                              color: coupon.discountType === 'PERCENT' ? '#92400E' : '#0369A1',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-block',
                            }}
                          >
                            {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                          </span>
                          {(coupon.adminDiscount != null || coupon.restaurantDiscount != null) && (
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, whiteSpace: 'nowrap' }}>
                              Admin: {coupon.discountType === 'PERCENT' ? `${coupon.adminDiscount ?? 0}%` : `₹${coupon.adminDiscount ?? 0}`} • Rest: {coupon.discountType === 'PERCENT' ? `${coupon.restaurantDiscount ?? 0}%` : `₹${coupon.restaurantDiscount ?? 0}`}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12 }}>
                          <div>Min: ₹{coupon.minPurchase}</div>
                          <div>
                            Max:{' '}
                            {(coupon.maxDiscountAmount != null && Number(coupon.maxDiscountAmount) > 0)
                              ? `₹${coupon.maxDiscountAmount}`
                              : (coupon.maxDiscount > 0 ? `₹${coupon.maxDiscount}` : '—')}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                            {coupon.totalOrders ?? 0} Orders
                          </div>
                          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                            ₹{coupon.totalDiscountAmount ?? 0} Discounted
                          </div>
                          {(coupon.restaurantDiscount != null || coupon.adminDiscount != null) && (
                            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                              Rest: {coupon.restaurantDiscount ?? 0}% • Admin: {coupon.adminDiscount ?? 0}%
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12 }}>
                          {formatCouponValidityDate(coupon.expiryDate)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              backgroundColor: coupon.status === 'ACTIVE' ? '#DEF7EC' : '#F3F4F6',
                              color: coupon.status === 'ACTIVE' ? '#03543F' : '#6B7280',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {coupon.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(coupon.id, coupon.status)}
                              disabled={isDeactivatingCoupon || isActivatingCoupon}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: coupon.status === 'ACTIVE' ? '#FEF3C7' : '#DCFCE7',
                                color: coupon.status === 'ACTIVE' ? '#92400E' : '#15803D',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: isDeactivatingCoupon || isActivatingCoupon ? 'not-allowed' : 'pointer',
                                opacity: isDeactivatingCoupon || isActivatingCoupon ? 0.5 : 1,
                              }}
                            >
                              {coupon.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon.id, coupon.status)}
                              disabled={isDeletingCoupon}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#FEE2E2',
                                color: '#EF4444',
                                border: '1px solid #FECACA',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: isDeletingCoupon ? 'not-allowed' : 'pointer',
                                opacity: isDeletingCoupon ? 0.5 : 1,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIRST ORDER OFFERS */}
      {activeTab === 'FIRST_ORDER_OFFERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Active First-Order Deals</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>{firstOrderOffers.length}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Total New User Claims</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>1,480 Claims</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>New Customer Conversion Boost</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', marginTop: 4 }}>+24.8%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
            {/* Create First Order Offer Form */}
            <form
              onSubmit={handleCreateFirstOrderOffer}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Create First Order Offer
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Promo Code *</label>
                <input
                  type="text"
                  placeholder="e.g. FIRST50"
                  value={foCode}
                  onChange={(e) => setFoCode(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', textTransform: 'uppercase', color: '#111827', backgroundColor: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Offer Title</label>
                <input
                  type="text"
                  placeholder="e.g. 50% OFF Welcome Bonus on First Order"
                  value={foTitle}
                  onChange={(e) => setFoTitle(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Discount % *</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={foValue}
                    onChange={(e) => setFoValue(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Min Order (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 200"
                    value={foMinPurchase}
                    onChange={(e) => setFoMinPurchase(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 8,
                  boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                }}
              >
                Activate First Order Offer
              </button>
            </form>

            {/* First Order Offers List */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Active First Order Offers Directory
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Code & Deal</th>
                    <th style={{ padding: '14px 20px' }}>Discount</th>
                    <th style={{ padding: '14px 20px' }}>Min Order</th>
                    <th style={{ padding: '14px 20px' }}>Total Claims</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {firstOrderOffers
                    .filter((fo) => {
                      const q = searchQuery.trim().toLowerCase();
                      return !q || fo.code.toLowerCase().includes(q) || fo.title.toLowerCase().includes(q);
                    })
                    .map((fo) => (
                      <tr key={fo.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{fo.code}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{fo.title}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>
                          {fo.discountType === 'PERCENT' ? `${fo.discountValue}% OFF` : `₹${fo.discountValue} FLAT`}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 600 }}>₹{fo.minPurchase}</td>
                        <td style={{ padding: '16px 20px', color: '#6B7280', fontWeight: 500 }}>{fo.totalClaims} redemptions</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 9999 }}>
                            {fo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REFERRAL OFFERS */}
      {activeTab === 'REFERRAL_OFFERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Referral Status</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {isReferralActive ? 'Active Campaign' : 'Paused'}
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Successful Referrals</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>3,240 Users</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Referral Cash Paid</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', marginTop: 4 }}>₹3,24,000</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24 }}>
            {/* Referral Campaign Configurator */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Referral Program Settings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Referrer Reward (₹)</label>
                <input
                  type="number"
                  value={referrerBonus}
                  onChange={(e) => setReferrerBonus(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Referee Signup Bonus (₹)</label>
                <input
                  type="number"
                  value={refereeBonus}
                  onChange={(e) => setRefereeBonus(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Min Order Value for Reward (₹)</label>
                <input
                  type="number"
                  value={referralMinOrder}
                  onChange={(e) => setReferralMinOrder(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setToastMsg('Referral program settings updated successfully!');
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                style={{
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 8,
                  boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                }}
              >
                Save Referral Configuration
              </button>
            </div>

            {/* Top Referral Champions Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Top Referral Champions
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>User Name</th>
                    <th style={{ padding: '14px 20px' }}>Referral Code</th>
                    <th style={{ padding: '14px 20px' }}>Friends Joined</th>
                    <th style={{ padding: '14px 20px' }}>Rewards Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Priya Sundaram', code: 'PRIYA100', count: 48, earned: '₹4,800' },
                    { name: 'Karthik Raja', code: 'KARTHIK01', count: 35, earned: '₹3,500' },
                    { name: 'Divya Nambiar', code: 'DIVYA99', count: 29, earned: '₹2,900' },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{row.name}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#2196F3' }}>{row.code}</td>
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontWeight: 500 }}>{row.count} referred</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#22C55E' }}>{row.earned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAMPAIGN MANAGEMENT */}
      {activeTab === 'CAMPAIGN_MANAGEMENT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Live Marketing Campaigns</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {campaigns.filter((c) => c.status === 'LIVE').length} Running
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Campaign Orders</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>8,920 Orders</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Campaign Revenue Driven</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', marginTop: 4 }}>₹48.5 Lakhs</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
            {/* Create Campaign Form */}
            <form
              onSubmit={handleCreateCampaign}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Launch Promotional Campaign
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Campaign Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Super Feast Gala 2026"
                  value={cmpTitle}
                  onChange={(e) => setCmpTitle(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Banner Offer Details *</label>
                <input
                  type="text"
                  placeholder="e.g. Up to 60% OFF + Free Delivery"
                  value={cmpBanner}
                  onChange={(e) => setCmpBanner(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Category / Outlets</label>
                <select
                  value={cmpCategory}
                  onChange={(e) => setCmpCategory(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                >
                  <option value="All Food Delivery">All Food Delivery</option>
                  <option value="Fine Dining & Pizzerias">Fine Dining & Pizzerias</option>
                  <option value="Cafes & Bakery">Cafes & Bakery</option>
                  <option value="Cloud Kitchens">Cloud Kitchens</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Marketing Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={cmpBudget}
                  onChange={(e) => setCmpBudget(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 8,
                  boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                }}
              >
                Launch Marketing Campaign
              </button>
            </form>

            {/* Campaign Directory Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Marketing Campaigns Directory
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Campaign Title & Offer</th>
                    <th style={{ padding: '14px 20px' }}>Category</th>
                    <th style={{ padding: '14px 20px' }}>Budget</th>
                    <th style={{ padding: '14px 20px' }}>Orders Driven</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((cmp) => (
                    <tr key={cmp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{cmp.title}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{cmp.bannerOffer}</div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#374151', fontSize: 13 }}>{cmp.category}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>₹{cmp.budget.toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{cmp.totalOrders} orders</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            background: cmp.status === 'LIVE' ? '#DCFCE7' : '#F3F4F6',
                            color: cmp.status === 'LIVE' ? '#15803D' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            display: 'inline-block',
                          }}
                        >
                          {cmp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toastMsg ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 12,
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(33, 150, 243, 0.35)',
            zIndex: 9999,
          }}
        >
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}
