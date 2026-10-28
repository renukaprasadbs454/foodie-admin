'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SocialMediaStudio } from '@/features/social-media/components/SocialMediaStudio';
import { useAppSelector } from '@/store/hooks';
import {
  useGetZonesQuery,
  useUpdateZoneTogglesMutation,
  useGetDeliveryChargesQuery,
  useUpdateDeliveryChargesMutation,
  useGetRadiusSettingsQuery,
  useUpdateRadiusSettingsMutation,
} from '@/api/endpoints/locationApi';
import { useGetAvailableZonesQuery } from '@/api/endpoints/zoneApi';
import {
  useGetZoneSettingsQuery,
  useUpdateZoneSettingsMutation,
  useResetZoneSettingsMutation,
} from '@/api/endpoints/settingsApi';

export type SettingsTab =
  | 'admin-profile'
  | 'page-setup'
  | 'social-media'
  | 'admin-users'
  | 'roles-permissions'
  | 'tax-gst'
  | 'payment-settings'
  | 'app-settings'
  | 'security';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'SUPPORT';
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: string;
  assignedZoneId?: string;
  assignedZoneName?: string;
}

export interface PolicyPageRecord {
  id: string;
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
  status: 'PUBLISHED' | 'DRAFT';
}

export interface ZoneSettingsConfig {
  zoneId: string;
  zoneName?: string;
  cityName?: string;
  // Tax / GST
  gstinNumber: string;
  foodGstRate: string;
  deliveryGstRate: string;
  tcsTaxRate: string;
  // Payment Settings
  cashfreeEnabled: boolean;
  stripeEnabled: boolean;
  codEnabled: boolean;
  codMaxLimit: string;
  // App Settings & Operational Parameters
  minAppVersion: string;
  maxDeliveryRadius: string;
  forceUpdateEnabled: boolean;
  maintenanceMode: boolean;
  // Zone Powers
  customerOrderingEnabled: boolean;
  restaurantEnabled: boolean;
  deliveryPartnerEnabled: boolean;
  // Delivery Charges
  baseDeliveryCharge: string;
  baseDistanceKm: string;
  additionalChargePerKm: string;
  freeDeliveryMinOrder: string;
  nightSurcharge: string;
  surgeMultiplier: string;
  // Metadata
  isCustomOverride?: boolean;
}

const DEFAULT_UNIVERSAL_SETTINGS: ZoneSettingsConfig = {
  zoneId: 'ALL',
  zoneName: 'Platform Universal (All Zones)',
  cityName: 'All Territories',
  gstinNumber: '29AAAAA0000A1Z5',
  foodGstRate: '5.0',
  deliveryGstRate: '18.0',
  tcsTaxRate: '1.0',
  cashfreeEnabled: true,
  stripeEnabled: true,
  codEnabled: true,
  codMaxLimit: '2000',
  minAppVersion: 'v2.4.0',
  maxDeliveryRadius: '15',
  forceUpdateEnabled: true,
  maintenanceMode: false,
  customerOrderingEnabled: true,
  restaurantEnabled: true,
  deliveryPartnerEnabled: true,
  baseDeliveryCharge: '35.00',
  baseDistanceKm: '3.00',
  additionalChargePerKm: '10.00',
  freeDeliveryMinOrder: '499.00',
  nightSurcharge: '25.00',
  surgeMultiplier: '1.15',
  isCustomOverride: false,
};

const INITIAL_ZONE_SETTINGS: Record<string, ZoneSettingsConfig> = {
  ALL: DEFAULT_UNIVERSAL_SETTINGS,
  'dz-bengaluru-zone': {
    zoneId: 'dz-bengaluru-zone',
    zoneName: 'Bengaluru zone',
    cityName: 'Bangalore',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: true,
    codEnabled: true,
    codMaxLimit: '2500',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '50',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '40.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '12.00',
    freeDeliveryMinOrder: '599.00',
    nightSurcharge: '30.00',
    surgeMultiplier: '1.20',
    isCustomOverride: true,
  },
  'dz-bangalore': {
    zoneId: 'dz-bangalore',
    zoneName: 'Bangalore Zone',
    cityName: 'Bangalore',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: true,
    codEnabled: true,
    codMaxLimit: '2500',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '25',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '40.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '12.00',
    freeDeliveryMinOrder: '599.00',
    nightSurcharge: '30.00',
    surgeMultiplier: '1.20',
    isCustomOverride: true,
  },
  'dz-tumkur-zone': {
    zoneId: 'dz-tumkur-zone',
    zoneName: 'Tumkur zone',
    cityName: 'Tumakuru',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: false,
    codEnabled: true,
    codMaxLimit: '1500',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '100',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '30.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '8.00',
    freeDeliveryMinOrder: '399.00',
    nightSurcharge: '20.00',
    surgeMultiplier: '1.00',
    isCustomOverride: true,
  },
  'dz-tumkur': {
    zoneId: 'dz-tumkur',
    zoneName: 'Tumkur Zone',
    cityName: 'Tumkur',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: false,
    codEnabled: true,
    codMaxLimit: '1500',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '20',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '30.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '8.00',
    freeDeliveryMinOrder: '399.00',
    nightSurcharge: '20.00',
    surgeMultiplier: '1.00',
    isCustomOverride: true,
  },
  'dz-hassan-zone': {
    zoneId: 'dz-hassan-zone',
    zoneName: 'Hassan zone',
    cityName: 'Hassan',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: false,
    codEnabled: true,
    codMaxLimit: '1200',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '80',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '30.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '8.00',
    freeDeliveryMinOrder: '399.00',
    nightSurcharge: '20.00',
    surgeMultiplier: '1.00',
    isCustomOverride: true,
  },
  'dz-hubballi-zone': {
    zoneId: 'dz-hubballi-zone',
    zoneName: 'Hubballi zone',
    cityName: 'Hubballi',
    gstinNumber: '29AAAAA0000A1Z5',
    foodGstRate: '5.0',
    deliveryGstRate: '18.0',
    tcsTaxRate: '1.0',
    cashfreeEnabled: true,
    stripeEnabled: false,
    codEnabled: true,
    codMaxLimit: '1500',
    minAppVersion: 'v2.4.0',
    maxDeliveryRadius: '10',
    forceUpdateEnabled: true,
    maintenanceMode: false,
    customerOrderingEnabled: true,
    restaurantEnabled: true,
    deliveryPartnerEnabled: true,
    baseDeliveryCharge: '32.00',
    baseDistanceKm: '3.00',
    additionalChargePerKm: '9.00',
    freeDeliveryMinOrder: '449.00',
    nightSurcharge: '20.00',
    surgeMultiplier: '1.05',
    isCustomOverride: true,
  },
};

const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'u-101',
    name: 'Preethi Shree D',
    email: 'preethishreed@gmail.com',
    role: 'SUPER_ADMIN',
    department: 'Executive Leadership',
    status: 'ACTIVE',
    lastLogin: 'Just now',
    assignedZoneId: 'ALL',
    assignedZoneName: 'Global View (All Zones)',
  },
  {
    id: 'u-102',
    name: 'Rajesh Kumar',
    email: 'rajesh.ops@foodie.com',
    role: 'OPS',
    department: 'Dispatch & Fleet Operations',
    status: 'ACTIVE',
    lastLogin: '2 hours ago',
    assignedZoneId: 'dz-bengaluru-zone',
    assignedZoneName: 'Bengaluru zone',
  },
  {
    id: 'u-103',
    name: 'Ananya Varma',
    email: 'ananya.fin@foodie.com',
    role: 'FINANCE',
    department: 'Accounts & Merchant Settlements',
    status: 'ACTIVE',
    lastLogin: '1 day ago',
    assignedZoneId: 'ALL',
    assignedZoneName: 'Global View (All Zones)',
  },
  {
    id: 'u-104',
    name: 'Suresh Patel',
    email: 'suresh.sup@foodie.com',
    role: 'SUPPORT',
    department: 'Customer Care & Complaints',
    status: 'ACTIVE',
    lastLogin: '3 days ago',
    assignedZoneId: 'dz-tumkur-zone',
    assignedZoneName: 'Tumkur zone',
  },
];

const INITIAL_POLICY_PAGES: PolicyPageRecord[] = [
  {
    id: 'page-terms',
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    content:
      'Foodie Hyperlocal operates as an intermediary marketplace connecting customers, multi-vendor food merchants, cloud kitchens, and independent delivery partners. All users agree to adhere to platform code of conduct. Restaurants agree to maintain active FSSAI licenses.',
    lastUpdated: 'August 24, 2026',
    status: 'PUBLISHED',
  },
  {
    id: 'page-privacy',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content:
      'All mobile app & web traffic is encrypted using TLS 1.3 protocol. User credentials and transaction logs are stored in encrypted database clusters. Driver KYC documents are stored in secure S3 buckets.',
    lastUpdated: 'August 24, 2026',
    status: 'PUBLISHED',
  },
  {
    id: 'page-cancellation',
    slug: 'cancellation-and-refund-policy',
    title: 'Cancellation & Refund Policy',
    content:
      'Cancellation refunds requested before kitchen food preparation starts are credited to Foodie Pay Wallet within 60 seconds. Post-preparation cancellations incur a nominal 50% kitchen compensation charge.',
    lastUpdated: 'August 24, 2026',
    status: 'PUBLISHED',
  },
  {
    id: 'page-delivery',
    slug: 'delivery-policy',
    title: 'Delivery Policy',
    content:
      'Standard delivery radius is capped at zone-defined operational boundaries from restaurant location to ensure food fresh-temperature standards. Target delivery time is calculated dynamically based on Google Maps traffic API.',
    lastUpdated: 'August 24, 2026',
    status: 'PUBLISHED',
  },
];

export function SettingsPage() {
  const searchParams = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const initialTab = (searchParams?.get('tab') as SettingsTab) || 'admin-profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 0. Zone Context & Live Territory Data
  const { data: dbLocationZones = [] } = useGetZonesQuery();
  const { data: availableZonesApi = [] } = useGetAvailableZonesQuery();
  const [updateZoneToggles] = useUpdateZoneTogglesMutation();
  const [updateRadiusSettings] = useUpdateRadiusSettingsMutation();

  const userAssignedZoneCookie = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_user_assigned_zone') ||
        sessionStorage.getItem('foodie_user_assigned_zone') ||
        (typeof document !== 'undefined' ? document.cookie.match(/foodie_user_assigned_zone=([^;]+)/)?.[1] : null))
    : null;

  const userAssignedZoneName = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_active_zone_name') ||
        sessionStorage.getItem('foodie_active_zone_name') ||
        (typeof document !== 'undefined' ? decodeURIComponent(document.cookie.match(/foodie_active_zone_name=([^;]+)/)?.[1] || '') : null))
    : null;

  const userStoredRole = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role') || authState.role)
    : authState.role;

  const hasAssignedZone = Boolean(userAssignedZoneCookie && userAssignedZoneCookie !== 'ALL');
  const isSuperAdmin = !hasAssignedZone && Boolean(!userStoredRole || userStoredRole.toUpperCase() === 'SUPER_ADMIN');
  const isZoneAdmin = !isSuperAdmin && hasAssignedZone;
  const lockedZoneId = isZoneAdmin ? userAssignedZoneCookie : null;
  const lockedZoneName = isZoneAdmin ? (userAssignedZoneName || userAssignedZoneCookie) : null;

  // Compile combined available operating zones
  const availableZones = useMemo(() => {
    const map = new Map<string, { id: string; name: string; city?: string; radiusKm?: number }>();
    if (Array.isArray(dbLocationZones)) {
      dbLocationZones.forEach((z: any) => {
        if (z && z.id) {
          map.set(z.id.toLowerCase(), {
            id: z.id,
            name: z.zoneName || z.cityName || z.id,
            city: z.cityName,
            radiusKm: z.radiusKm,
          });
        }
      });
    }
    if (Array.isArray(availableZonesApi)) {
      availableZonesApi.forEach((z: any) => {
        if (z && z.id && !map.has(z.id.toLowerCase())) {
          map.set(z.id.toLowerCase(), {
            id: z.id,
            name: z.zoneName || z.cityName || z.id,
            city: z.cityName,
            radiusKm: z.radiusKm,
          });
        }
      });
    }
    if (!map.has('dz-bengaluru-zone') && !map.has('dz-bangalore')) {
      map.set('dz-bengaluru-zone', { id: 'dz-bengaluru-zone', name: 'Bengaluru zone', city: 'Bangalore', radiusKm: 50 });
    }
    if (!map.has('dz-tumkur-zone') && !map.has('dz-tumkur')) {
      map.set('dz-tumkur-zone', { id: 'dz-tumkur-zone', name: 'Tumkur zone', city: 'Tumakuru', radiusKm: 100 });
    }
    return Array.from(map.values());
  }, [dbLocationZones, availableZonesApi]);

  // Selected Zone state
  const initialZone = lockedZoneId || (searchParams?.get('zone') || 'ALL');
  const [selectedZone, setSelectedZone] = useState<string>(initialZone);

  useEffect(() => {
    if (isZoneAdmin && lockedZoneId) {
      setSelectedZone(lockedZoneId);
    }
  }, [isZoneAdmin, lockedZoneId]);

  const selectedZoneDisplayName = useMemo(() => {
    if (selectedZone === 'ALL') return 'Platform Universal (All Zones)';
    const found = availableZones.find((z) => z.id.toLowerCase() === selectedZone.toLowerCase());
    return found ? found.name : (lockedZoneName || selectedZone);
  }, [selectedZone, availableZones, lockedZoneName]);

  const activeZoneObj = useMemo(() => {
    if (selectedZone === 'ALL') return null;
    return availableZones.find((z) => z.id.toLowerCase() === selectedZone.toLowerCase()) || null;
  }, [selectedZone, availableZones]);

  // Master Zone Settings Store
  const [zoneSettingsStore, setZoneSettingsStore] = useState<Record<string, ZoneSettingsConfig>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('foodie_zone_settings_store');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...INITIAL_ZONE_SETTINGS, ...parsed };
        }
      } catch {}
    }
    return INITIAL_ZONE_SETTINGS;
  });

  const { data: bffZoneSettings } = useGetZoneSettingsQuery(
    { zoneId: selectedZone },
    { refetchOnMountOrArgChange: true }
  );
  const [updateZoneSettingsApi] = useUpdateZoneSettingsMutation();
  const [resetZoneSettingsApi] = useResetZoneSettingsMutation();

  const { data: dbDeliveryCharges } = useGetDeliveryChargesQuery(
    selectedZone !== 'ALL' ? { zoneId: selectedZone } : undefined,
    { refetchOnMountOrArgChange: true }
  );
  const [updateDeliveryChargesApi] = useUpdateDeliveryChargesMutation();

  const activeZoneConfig = useMemo(() => {
    return (
      zoneSettingsStore[selectedZone] ||
      (bffZoneSettings as unknown as ZoneSettingsConfig) ||
      zoneSettingsStore['ALL'] ||
      DEFAULT_UNIVERSAL_SETTINGS
    );
  }, [zoneSettingsStore, selectedZone, bffZoneSettings]);

  // Form input states
  const [gstinNumber, setGstinNumber] = useState(activeZoneConfig.gstinNumber);
  const [foodGstRate, setFoodGstRate] = useState(activeZoneConfig.foodGstRate);
  const [deliveryGstRate, setDeliveryGstRate] = useState(activeZoneConfig.deliveryGstRate);
  const [tcsTaxRate, setTcsTaxRate] = useState(activeZoneConfig.tcsTaxRate);

  const [cashfreeEnabled, setCashfreeEnabled] = useState(activeZoneConfig.cashfreeEnabled);
  const [stripeEnabled, setStripeEnabled] = useState(activeZoneConfig.stripeEnabled);
  const [codEnabled, setCodEnabled] = useState(activeZoneConfig.codEnabled);
  const [codMaxLimit, setCodMaxLimit] = useState(activeZoneConfig.codMaxLimit);

  const [minAppVersion, setMinAppVersion] = useState(activeZoneConfig.minAppVersion);
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState(activeZoneConfig.maxDeliveryRadius);
  const [forceUpdateEnabled, setForceUpdateEnabled] = useState(activeZoneConfig.forceUpdateEnabled);
  const [maintenanceMode, setMaintenanceMode] = useState(activeZoneConfig.maintenanceMode);

  const [customerOrderingEnabled, setCustomerOrderingEnabled] = useState(activeZoneConfig.customerOrderingEnabled ?? true);
  const [restaurantEnabled, setRestaurantEnabled] = useState(activeZoneConfig.restaurantEnabled ?? true);
  const [deliveryPartnerEnabled, setDeliveryPartnerEnabled] = useState(activeZoneConfig.deliveryPartnerEnabled ?? true);

  const [baseDeliveryCharge, setBaseDeliveryCharge] = useState(activeZoneConfig.baseDeliveryCharge || '35.00');
  const [baseDistanceKm, setBaseDistanceKm] = useState(activeZoneConfig.baseDistanceKm || '3.00');
  const [additionalChargePerKm, setAdditionalChargePerKm] = useState(activeZoneConfig.additionalChargePerKm || '10.00');
  const [freeDeliveryMinOrder, setFreeDeliveryMinOrder] = useState(activeZoneConfig.freeDeliveryMinOrder || '499.00');
  const [nightSurcharge, setNightSurcharge] = useState(activeZoneConfig.nightSurcharge || '25.00');
  const [surgeMultiplier, setSurgeMultiplier] = useState(activeZoneConfig.surgeMultiplier || '1.15');

  useEffect(() => {
    const cfg = zoneSettingsStore[selectedZone] ||
      (bffZoneSettings as unknown as ZoneSettingsConfig) ||
      zoneSettingsStore['ALL'] ||
      DEFAULT_UNIVERSAL_SETTINGS;

    setGstinNumber(cfg.gstinNumber);
    setFoodGstRate(cfg.foodGstRate);
    setDeliveryGstRate(cfg.deliveryGstRate);
    setTcsTaxRate(cfg.tcsTaxRate);

    setCashfreeEnabled(cfg.cashfreeEnabled);
    setStripeEnabled(cfg.stripeEnabled);
    setCodEnabled(cfg.codEnabled);
    setCodMaxLimit(cfg.codMaxLimit);

    setMinAppVersion(cfg.minAppVersion);
    setMaxDeliveryRadius(
      activeZoneObj?.radiusKm ? String(activeZoneObj.radiusKm) : cfg.maxDeliveryRadius
    );
    setForceUpdateEnabled(cfg.forceUpdateEnabled);
    setMaintenanceMode(cfg.maintenanceMode);

    setCustomerOrderingEnabled(cfg.customerOrderingEnabled ?? true);
    setRestaurantEnabled(cfg.restaurantEnabled ?? true);
    setDeliveryPartnerEnabled(cfg.deliveryPartnerEnabled ?? true);

    if (dbDeliveryCharges) {
      setBaseDeliveryCharge(String(dbDeliveryCharges.baseCharge ?? cfg.baseDeliveryCharge));
      setBaseDistanceKm(String(dbDeliveryCharges.baseDistanceKm ?? cfg.baseDistanceKm));
      setAdditionalChargePerKm(String(dbDeliveryCharges.additionalChargePerKm ?? cfg.additionalChargePerKm));
      setFreeDeliveryMinOrder(String(dbDeliveryCharges.freeDeliveryMinOrder ?? cfg.freeDeliveryMinOrder));
      setNightSurcharge(String(dbDeliveryCharges.nightSurcharge ?? cfg.nightSurcharge));
      setSurgeMultiplier(String(dbDeliveryCharges.surgeMultiplier ?? cfg.surgeMultiplier));
    } else {
      setBaseDeliveryCharge(cfg.baseDeliveryCharge || '35.00');
      setBaseDistanceKm(cfg.baseDistanceKm || '3.00');
      setAdditionalChargePerKm(cfg.additionalChargePerKm || '10.00');
      setFreeDeliveryMinOrder(cfg.freeDeliveryMinOrder || '499.00');
      setNightSurcharge(cfg.nightSurcharge || '25.00');
      setSurgeMultiplier(cfg.surgeMultiplier || '1.15');
    }
  }, [selectedZone, zoneSettingsStore, bffZoneSettings, dbDeliveryCharges, activeZoneObj]);

  React.useEffect(() => {
    const tabParam = searchParams?.get('tab') as SettingsTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Admin Profile State
  const [profileName, setProfileName] = useState(() => authState.fullName || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_fullname') || sessionStorage.getItem('foodie_admin_fullname')) : null) || 'Admin Operator');
  const [profileEmail, setProfileEmail] = useState(() => authState.email || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_email') || sessionStorage.getItem('foodie_admin_email')) : null) || 'admin@foodie.local');
  const [profilePhone, setProfilePhone] = useState(() => authState.phone || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_phone') || sessionStorage.getItem('foodie_admin_phone')) : null) || '+91 98765 43210');
  const [assignedRole, setAssignedRole] = useState(() => authState.role || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null) || 'SUPER_ADMIN');

  useEffect(() => {
    if (authState.fullName) setProfileName(authState.fullName);
    if (authState.email) setProfileEmail(authState.email);
    if (authState.phone) setProfilePhone(authState.phone);
    if (authState.role) setAssignedRole(authState.role);
  }, [authState]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin Users State
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'SUPPORT'>('OPS');
  const [newAdminDept, setNewAdminDept] = useState('Operations');
  const [newAdminZone, setNewAdminZone] = useState('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userZoneFilter, setUserZoneFilter] = useState('ALL');

  // Roles & Permissions Matrix State
  const [permissions, setPermissions] = useState({
    SUPER_ADMIN: { dashboard: true, restaurants: true, deliveryKyc: true, refunds: true, commissions: true, auditLogs: true },
    OPS: { dashboard: true, restaurants: true, deliveryKyc: true, refunds: true, commissions: false, auditLogs: false },
    FINANCE: { dashboard: true, restaurants: false, deliveryKyc: false, refunds: true, commissions: true, auditLogs: false },
    SUPPORT: { dashboard: true, restaurants: false, deliveryKyc: false, refunds: false, commissions: false, auditLogs: false },
  });

  // Security State
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [require2FA, setRequire2FA] = useState(true);
  const [ipWhitelisting, setIpWhitelisting] = useState(false);

  // Policy Pages
  const [policyPages, setPolicyPages] = useState<PolicyPageRecord[]>(INITIAL_POLICY_PAGES);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('page-terms');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');

  const selectedPolicy = policyPages.find((p) => p.id === selectedPolicyId) || policyPages[0];

  React.useEffect(() => {
    if (selectedPolicy) {
      setEditTitle(selectedPolicy.title);
      setEditContent(selectedPolicy.content);
    }
  }, [selectedPolicyId]);

  const isCurrentZoneOverridden = useMemo(() => {
    if (selectedZone === 'ALL') return false;
    return Boolean(zoneSettingsStore[selectedZone]?.isCustomOverride);
  }, [selectedZone, zoneSettingsStore]);

  const handleResetToUniversal = async () => {
    if (selectedZone === 'ALL') return;
    const universal = zoneSettingsStore['ALL'] || DEFAULT_UNIVERSAL_SETTINGS;
    const reverted: ZoneSettingsConfig = {
      ...universal,
      zoneId: selectedZone,
      zoneName: selectedZoneDisplayName,
      isCustomOverride: false,
    };

    setGstinNumber(reverted.gstinNumber);
    setFoodGstRate(reverted.foodGstRate);
    setDeliveryGstRate(reverted.deliveryGstRate);
    setTcsTaxRate(reverted.tcsTaxRate);
    setCashfreeEnabled(reverted.cashfreeEnabled);
    setStripeEnabled(reverted.stripeEnabled);
    setCodEnabled(reverted.codEnabled);
    setCodMaxLimit(reverted.codMaxLimit);
    setMinAppVersion(reverted.minAppVersion);
    setMaxDeliveryRadius(reverted.maxDeliveryRadius);
    setForceUpdateEnabled(reverted.forceUpdateEnabled);
    setMaintenanceMode(reverted.maintenanceMode);
    setCustomerOrderingEnabled(reverted.customerOrderingEnabled);
    setRestaurantEnabled(reverted.restaurantEnabled);
    setDeliveryPartnerEnabled(reverted.deliveryPartnerEnabled);
    setBaseDeliveryCharge(reverted.baseDeliveryCharge);
    setBaseDistanceKm(reverted.baseDistanceKm);
    setAdditionalChargePerKm(reverted.additionalChargePerKm);
    setFreeDeliveryMinOrder(reverted.freeDeliveryMinOrder);
    setNightSurcharge(reverted.nightSurcharge);
    setSurgeMultiplier(reverted.surgeMultiplier);

    const updatedStore = {
      ...zoneSettingsStore,
      [selectedZone]: reverted,
    };
    setZoneSettingsStore(updatedStore);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodie_zone_settings_store', JSON.stringify(updatedStore));
    }

    try {
      await resetZoneSettingsApi({ zoneId: selectedZone }).unwrap();
    } catch {}

    setToastMessage('🔄 Settings for ' + selectedZoneDisplayName + ' reset to Universal Platform Defaults.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const updatedConfig: ZoneSettingsConfig = {
      zoneId: selectedZone,
      zoneName: selectedZoneDisplayName,
      cityName: activeZoneObj?.city,
      gstinNumber,
      foodGstRate,
      deliveryGstRate,
      tcsTaxRate,
      cashfreeEnabled,
      stripeEnabled,
      codEnabled,
      codMaxLimit,
      minAppVersion,
      maxDeliveryRadius,
      forceUpdateEnabled,
      maintenanceMode,
      customerOrderingEnabled,
      restaurantEnabled,
      deliveryPartnerEnabled,
      baseDeliveryCharge,
      baseDistanceKm,
      additionalChargePerKm,
      freeDeliveryMinOrder,
      nightSurcharge,
      surgeMultiplier,
      isCustomOverride: selectedZone !== 'ALL',
    };

    const updatedStore = {
      ...zoneSettingsStore,
      [selectedZone]: updatedConfig,
    };
    setZoneSettingsStore(updatedStore);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodie_zone_settings_store', JSON.stringify(updatedStore));
      localStorage.setItem('foodie_settings_' + selectedZone, JSON.stringify(updatedConfig));
    }

    if (activeTab === 'page-setup' && selectedPolicyId) {
      setPolicyPages((prev) =>
        prev.map((p) =>
          p.id === selectedPolicyId
            ? {
                ...p,
                title: editTitle,
                content: editContent,
                lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              }
            : p
        )
      );
    }

    try {
      await updateZoneSettingsApi(updatedConfig).unwrap();

      const parsedBase = Number(baseDeliveryCharge) || 35;
      const parsedDist = Number(baseDistanceKm) || 3;
      const parsedAddKm = Number(additionalChargePerKm) || 10;
      const parsedFreeMin = Number(freeDeliveryMinOrder) || 499;
      const parsedNight = Number(nightSurcharge) || 25;
      const parsedSurge = Number(surgeMultiplier) || 1.15;

      await updateDeliveryChargesApi({
        zoneId: selectedZone !== 'ALL' ? selectedZone : undefined,
        baseCharge: parsedBase,
        baseDistanceKm: parsedDist,
        additionalChargePerKm: parsedAddKm,
        freeDeliveryMinOrder: parsedFreeMin,
        nightSurcharge: parsedNight,
        surgeMultiplier: parsedSurge,
      }).unwrap();

      if (maxDeliveryRadius) {
        const radiusNum = Number(maxDeliveryRadius);
        if (!isNaN(radiusNum) && radiusNum > 0) {
          await updateRadiusSettings({
            maxDeliveryRadius: radiusNum,
            customerSearchRadius: Math.max(5, radiusNum * 0.7),
            driverDispatchRadius: Math.max(3, radiusNum * 0.4),
            distanceCalculationMode: 'GPS_ROAD',
          }).unwrap();
        }
      }

      if (selectedZone !== 'ALL' && activeZoneObj) {
        await updateZoneToggles({
          id: selectedZone,
          customerOrderingEnabled,
          restaurantEnabled,
          deliveryPartnerEnabled,
        }).unwrap();
      }
    } catch {}

    setSaving(false);
    setToastMessage(
      selectedZone === 'ALL'
        ? '🌐 Platform Universal Settings updated and saved successfully!'
        : '📍 Settings for "' + selectedZoneDisplayName + '" saved & applied successfully!'
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddPolicyPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim() || !newPageContent.trim()) {
      alert('Please fill out Title and Content for the new policy page.');
      return;
    }

    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newPage: PolicyPageRecord = {
      id: 'page-' + Date.now(),
      slug,
      title: newPageTitle.trim(),
      content: newPageContent.trim(),
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      status: 'PUBLISHED',
    };

    setPolicyPages((prev) => [...prev, newPage]);
    setSelectedPolicyId(newPage.id);
    setIsAddPageModalOpen(false);
    setNewPageTitle('');
    setNewPageContent('');
    setToastMessage('Policy Page "' + newPage.title + '" created & published!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      alert('Please fill out Name and Email for the new admin.');
      return;
    }
    const zoneObj = availableZones.find((z) => z.id === newAdminZone);
    const newUser: AdminUserRecord = {
      id: 'u-' + Date.now(),
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      role: newAdminRole,
      department: newAdminDept.trim() || 'Operations',
      status: 'ACTIVE',
      lastLogin: 'Never',
      assignedZoneId: newAdminZone,
      assignedZoneName: newAdminZone === 'ALL' ? 'Global View (All Zones)' : (zoneObj?.name || newAdminZone),
    };
    setAdminUsers((prev) => [...prev, newUser]);
    setNewAdminName('');
    setNewAdminEmail('');
    setIsAddUserModalOpen(false);
    setToastMessage('New Admin user successfully created with assigned zone!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredAdminUsers = useMemo(() => {
    if (userZoneFilter === 'ALL') return adminUsers;
    return adminUsers.filter(
      (u) => u.assignedZoneId === userZoneFilter || u.assignedZoneId === 'ALL' || !u.assignedZoneId
    );
  }, [adminUsers, userZoneFilter]);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            padding: '14px 24px',
            borderRadius: 14,
            boxShadow: '0 12px 28px rgba(16, 185, 129, 0.35)',
            fontSize: 14,
            fontWeight: 700,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
              Control Center Settings
            </h1>
            {isSuperAdmin ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#F0FDF4',
                  color: '#166534',
                  border: '1px solid #BBF7D0',
                  padding: '4px 10px',
                  borderRadius: 9999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>👑</span>
                <span>Super Admin: Global Config Authority</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  padding: '4px 10px',
                  borderRadius: 9999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>📍</span>
                <span>Operating Territory: {selectedZoneDisplayName}</span>
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>
            Configure zone-scoped tax compliance, payment gateways & COD rules, delivery charges & operational parameters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedZone !== 'ALL' && isSuperAdmin && (
            <button
              type="button"
              onClick={handleResetToUniversal}
              style={{
                padding: '9px 16px',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                border: '1px solid #D1D5DB',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              title="Reset current zone fields to match Universal Platform Defaults"
            >
              <span>🔄</span>
              <span>Reset to Defaults</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #2196F3 0%, #00B4D8 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <span>💾</span>
            <span>{saving ? 'Saving...' : selectedZone === 'ALL' ? 'Save Universal Settings' : 'Save ' + selectedZoneDisplayName + ' Settings'}</span>
          </button>
        </div>
      </div>

      {/* ZONE SCOPE SELECTOR BAR */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: selectedZone === 'ALL' ? '#E0F2FE' : '#FEF3C7',
              color: selectedZone === 'ALL' ? '#0284C7' : '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {selectedZone === 'ALL' ? '🌐' : '📍'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                {selectedZone === 'ALL' ? 'Platform Universal Scope' : 'Zone Territory: ' + selectedZoneDisplayName}
              </span>
              {selectedZone === 'ALL' ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  GLOBAL BASELINE
                </span>
              ) : isCurrentZoneOverridden ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  ZONE CUSTOM OVERRIDE ACTIVE
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    border: '1px solid #FDE68A',
                    padding: '2px 8px',
                    borderRadius: 9999,
                  }}
                >
                  INHERITING PLATFORM DEFAULTS
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748B' }}>
              {selectedZone === 'ALL'
                ? 'Changes saved here serve as global defaults across all operational delivery territories.'
                : 'Changes saved here apply exclusively to ' + selectedZoneDisplayName + '. Other zones remain unaffected.'}
            </p>
          </div>
        </div>

        {/* Zone Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isSuperAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="settingsZoneSelect" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                Active Operating Scope:
              </label>
              <select
                id="settingsZoneSelect"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: selectedZone === 'ALL' ? '#F0F9FF' : '#FFFBEB',
                  color: selectedZone === 'ALL' ? '#0369A1' : '#92400E',
                  border: selectedZone === 'ALL' ? '1px solid #BAE6FD' : '1px solid #FDE68A',
                  padding: '8px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 260,
                }}
              >
                <option value="ALL">🌐 Platform Universal (All Zones)</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    📍 {z.name} ({z.city || z.id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '8px 14px',
                borderRadius: 10,
              }}
              title="Zone territory locked to your operational credentials"
            >
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                {selectedZoneDisplayName}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar & Settings Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: 24 }}>
        {/* Settings Navigation Sidebar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            height: 'fit-content',
          }}
        >
          {[
            { id: 'admin-profile', label: 'Admin Profile', zoneScoped: false },
            { id: 'tax-gst', label: 'Tax / GST', zoneScoped: true },
            { id: 'payment-settings', label: 'Payment Settings', zoneScoped: true },
            { id: 'app-settings', label: 'App Settings & Operations', zoneScoped: true },
            { id: 'social-media', label: 'Social Media', zoneScoped: false },
            { id: 'roles-permissions', label: 'Roles & Permissions', zoneScoped: false },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: isActive ? '#E0F2FE' : 'transparent',
                  color: isActive ? '#0284C7' : '#4B5563',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderLeft: isActive ? '4px solid #0284C7' : '4px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.zoneScoped && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: isActive ? '#BAE6FD' : '#F1F5F9',
                      color: isActive ? '#0369A1' : '#64748B',
                      padding: '2px 6px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Zone
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Settings Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Admin Profile */}
          {activeTab === 'admin-profile' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Personal Admin Profile
                </h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: 6 }}>
                  ACCOUNT LEVEL
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact Phone</label>
                  <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Assigned System Role</label>
                  <input type="text" value={assignedRole + ' (Active Session)'} readOnly style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#6B7280', fontWeight: 600, fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20, marginTop: 10 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 14px 0' }}>Password & Security Credentials</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Current Password</label>
                    <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>New Password</label>
                    <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Confirm New Password</label>
                    <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Tax / GST (ZONE-SCOPED) */}
          {activeTab === 'tax-gst' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Tax & GST Compliance Rules</h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      📍 {selectedZoneDisplayName}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Define jurisdiction tax identifiers, food order GST slabs, delivery service taxation, and TCS deduction for this zone.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedZone !== 'ALL' && (
                    <button
                      type="button"
                      onClick={handleResetToUniversal}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: '#F8FAFC',
                        color: '#64748B',
                        border: '1px solid #E2E8F0',
                        padding: '6px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      Copy from Universal
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Zone Registered GSTIN
                  </label>
                  <input
                    type="text"
                    value={gstinNumber}
                    onChange={(e) => setGstinNumber(e.target.value)}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    State GSTIN for merchant invoices originating from {selectedZoneDisplayName}.
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Food Order GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodGstRate}
                    onChange={(e) => setFoodGstRate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    Standard food items GST (CGST + SGST applied on item subtotal).
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Delivery Service GST (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={deliveryGstRate}
                    onChange={(e) => setDeliveryGstRate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    Logistics & delivery fee service tax rate for this zone.
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    TCS Withholding Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tcsTaxRate}
                    onChange={(e) => setTcsTaxRate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                  />
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                    Tax Collected at Source deducted during merchant settlements.
                  </span>
                </div>
              </div>

              {/* Live Zone Tax Breakdown Simulation */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    Zone Effective Tax Sample (₹500 Food Subtotal + ₹40 Delivery)
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Food GST: ₹{(500 * (Number(foodGstRate) || 5) / 100).toFixed(2)} • Delivery GST: ₹{(40 * (Number(deliveryGstRate) || 18) / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Total Customer Taxes</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    ₹{((500 * (Number(foodGstRate) || 5) / 100) + (40 * (Number(deliveryGstRate) || 18) / 100)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Payment Settings (ZONE-SCOPED) */}
          {activeTab === 'payment-settings' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Payment Gateways & COD Rules</h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      📍 {selectedZoneDisplayName}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Control payment gateway routing and set zone-specific Cash on Delivery (COD) availability and threshold limits.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: cashfreeEnabled ? '#F0FDF4' : '#F9FAFB' }}>
                  <input type="checkbox" checked={cashfreeEnabled} onChange={(e) => setCashfreeEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10B981' }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enable Cashfree Gateway (UPI, Netbanking, Rupay & Cards)</span>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Recommended primary Indian domestic payment gateway for this zone.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: stripeEnabled ? '#EFF6FF' : '#F9FAFB' }}>
                  <input type="checkbox" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#2563EB' }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enable Stripe Gateway (International Cards & Tourists)</span>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Allows international customers in this zone to pay via global credit cards.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: codEnabled ? '#FEF9C3' : '#F9FAFB' }}>
                  <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#CA8A04' }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enable Cash on Delivery (COD) for this Zone</span>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {codEnabled
                        ? 'Cash on delivery is active. Customers can pay rider cash upon arrival.'
                        : '⚠️ COD is disabled for this zone. All orders must be prepaid online to eliminate rejection risk.'}
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Max Order Limit for Cash on Delivery in {selectedZoneDisplayName} (₹)
                </label>
                <input
                  type="number"
                  value={codMaxLimit}
                  onChange={(e) => setCodMaxLimit(e.target.value)}
                  disabled={!codEnabled}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    fontSize: 13,
                    color: '#111827',
                    backgroundColor: codEnabled ? '#FFFFFF' : '#F3F4F6',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                  Orders with total cart value above this amount must be paid online. Helps mitigate high-ticket cancellation risk.
                </span>
              </div>
            </div>
          )}

          {/* 7. App Settings & Operational Parameters (ZONE-SCOPED) */}
          {activeTab === 'app-settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card 1: Operational Parameters */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Customer App & Operational Parameters</h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #DBEAFE',
                        }}
                      >
                        📍 {selectedZoneDisplayName}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      Configure minimum mobile app versions, delivery radius boundaries, and emergency zone maintenance switches.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Minimum Required App Version
                    </label>
                    <input
                      type="text"
                      value={minAppVersion}
                      onChange={(e) => setMinAppVersion(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                    />
                    <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                      Users with builds below this version will receive an update prompt.
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Max Operating Delivery Radius in {selectedZoneDisplayName} (KM)
                    </label>
                    <input
                      type="number"
                      value={maxDeliveryRadius}
                      onChange={(e) => setMaxDeliveryRadius(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                    />
                    <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                      Restaurants and delivery partners are matched strictly within this radius.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={forceUpdateEnabled} onChange={(e) => setForceUpdateEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#2196F3' }} />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enforce Mandatory App Update Alert</span>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Blocks outdated apps until customer updates from Play Store / App Store.</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      padding: '12px 14px',
                      borderRadius: 12,
                      backgroundColor: maintenanceMode ? '#FEF2F2' : '#F9FAFB',
                      border: maintenanceMode ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#EF4444' }}
                    />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: maintenanceMode ? '#B91C1C' : '#111827' }}>
                        Enable Emergency Maintenance Mode for {selectedZoneDisplayName}
                      </span>
                      <div style={{ fontSize: 12, color: maintenanceMode ? '#991B1B' : '#6B7280' }}>
                        {maintenanceMode
                          ? '⚠️ ACTIVE: ' + selectedZoneDisplayName + ' is currently offline. Customers will see a localized maintenance banner.'
                          : 'Temporarily pause order intake for this zone during severe weather, curfew, or localized outages.'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 2: Operating Zone Powers (Live synchronized with backend) */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Operational Service Powers for {selectedZoneDisplayName}
                  </h3>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Instantly toggle ordering, kitchen acceptance, and delivery dispatching specifically for {selectedZoneDisplayName}.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      backgroundColor: customerOrderingEnabled ? '#F0FDF4' : '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={customerOrderingEnabled}
                      onChange={(e) => setCustomerOrderingEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#16A34A' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Customer Ordering</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{customerOrderingEnabled ? 'Active' : 'Disabled'}</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      backgroundColor: restaurantEnabled ? '#F0FDF4' : '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={restaurantEnabled}
                      onChange={(e) => setRestaurantEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#16A34A' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Restaurant Orders</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{restaurantEnabled ? 'Active' : 'Disabled'}</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      backgroundColor: deliveryPartnerEnabled ? '#F0FDF4' : '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={deliveryPartnerEnabled}
                      onChange={(e) => setDeliveryPartnerEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#16A34A' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Delivery Dispatch</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{deliveryPartnerEnabled ? 'Active' : 'Disabled'}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 3: Zone Delivery Charges & Pricing (Live backend synced) */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                      Delivery Charges & Fee Rules for {selectedZoneDisplayName}
                    </h3>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      Synchronized with Spring Boot backend delivery pricing service (/api/v1/admin/location/delivery-charges).
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Base Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={baseDeliveryCharge}
                      onChange={(e) => setBaseDeliveryCharge(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Base Distance (KM)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={baseDistanceKm}
                      onChange={(e) => setBaseDistanceKm(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Extra Charge / KM (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={additionalChargePerKm}
                      onChange={(e) => setAdditionalChargePerKm(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Free Delivery Min Order (₹)
                    </label>
                    <input
                      type="number"
                      value={freeDeliveryMinOrder}
                      onChange={(e) => setFreeDeliveryMinOrder(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Night Surcharge (₹)
                    </label>
                    <input
                      type="number"
                      value={nightSurcharge}
                      onChange={(e) => setNightSurcharge(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Surge Multiplier (e.g. 1.15)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={surgeMultiplier}
                      onChange={(e) => setSurgeMultiplier(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Roles & Permissions */}
          {activeTab === 'roles-permissions' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Role-Based Access Control (RBAC)</h3>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Configure permissions matrix for SUPER_ADMIN, OPS, FINANCE, and SUPPORT roles</div>
              </div>

              <div style={{ borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 16px' }}>System Permission Scope</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>SUPER_ADMIN</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>OPS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>FINANCE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>SUPPORT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Access Executive Dashboard & Analytics', key: 'dashboard' },
                      { label: 'Approve / Suspend Restaurants', key: 'restaurants' },
                      { label: 'Verify Deliveryman KYC & Documents', key: 'deliveryKyc' },
                      { label: 'Issue Payment Refunds & Payouts', key: 'refunds' },
                      { label: 'Manage Commission Rates & Rules', key: 'commissions' },
                      { label: 'View System Audit Logs', key: 'auditLogs' },
                    ].map((perm) => (
                      <tr key={perm.key} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500, color: '#111827' }}>{perm.label}</td>
                        {(['SUPER_ADMIN', 'OPS', 'FINANCE', 'SUPPORT'] as const).map((r) => (
                          <td key={r} style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={permissions[r][perm.key as keyof typeof permissions['SUPER_ADMIN']]}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setPermissions((prev) => ({
                                  ...prev,
                                  [r]: { ...prev[r], [perm.key]: val },
                                }));
                              }}
                              style={{ width: 16, height: 16, accentColor: '#2196F3' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. Security */}
          {activeTab === 'security' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Security, Sessions & IP Rules</h3>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin Inactivity Timeout (Minutes)</label>
                <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} style={{ width: '100%', maxWidth: 300, padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={require2FA} onChange={(e) => setRequire2FA(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#2196F3' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enforce Two-Factor Authentication (2FA)</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Require 2FA verification for all SUPER_ADMIN and FINANCE logins.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ipWhitelisting} onChange={(e) => setIpWhitelisting(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#2196F3' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Restrict Console Access to Whitelisted IP Ranges</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Block access from unapproved external networks.</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD ADMIN USER MODAL */}
      {isAddUserModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <form
            onSubmit={handleAddAdminUser}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Add New Admin User
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', fontWeight: 600 }}
              >
                ×
              </button>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. john@foodie.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Assigned Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', outline: 'none' }}
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="OPS">OPS</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="SUPPORT">SUPPORT</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Assigned Zone
                </label>
                <select
                  value={newAdminZone}
                  onChange={(e) => setNewAdminZone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', outline: 'none' }}
                >
                  <option value="ALL">Global (All Zones)</option>
                  {availableZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Department
              </label>
              <input
                type="text"
                placeholder="e.g. Customer Dispatch"
                value={newAdminDept}
                onChange={(e) => setNewAdminDept(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                style={{ padding: '10px 18px', backgroundColor: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
              >
                Create Admin
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* ADD POLICY PAGE MODAL */}
      {isAddPageModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <form
            onSubmit={handleAddPolicyPage}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Create Custom Policy Document
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', fontWeight: 600 }}
              >
                ×
              </button>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Page Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Monsoon Safety & Operational Guidelines"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                Policy Content *
              </label>
              <textarea
                required
                rows={8}
                placeholder="Type policy documentation..."
                value={newPageContent}
                onChange={(e) => setNewPageContent(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, lineHeight: 1.5, outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                style={{ padding: '10px 18px', backgroundColor: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
              >
                Publish Page
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
