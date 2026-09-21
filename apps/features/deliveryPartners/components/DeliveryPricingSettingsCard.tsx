'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'foodie-shared-web';
import {
  useGetDeliveryPricingQuery,
  useUpdateDeliveryPricingMutation,
} from '@/api/endpoints/deliveryPartnersApi';

export interface IncentiveItem {
  id: string;
  title: string;
  icon?: string;
  value: number;
  unit: string;
  active: boolean;
  description: string;
  category: 'Base & Distance' | 'Target & Mileage' | 'Weather & Surge' | 'Reward & Rating';
}

export interface ZoneItem {
  id: string;
  name: string;
  city: string;
  code: string;
  description: string;
}

export interface PayoutStructureConfig {
  minPrice: number;
  moneyPerKm: number;
  incentives: IncentiveItem[];
}

const DEFAULT_INCENTIVES: IncentiveItem[] = [
  {
    id: 'basePay',
    title: 'Base Pay per Order',
    icon: '',
    value: 50,
    unit: '₹ / order',
    active: true,
    description: 'Standard baseline compensation per fulfilled delivery assignment.',
    category: 'Base & Distance',
  },
  {
    id: 'peakHourBonus',
    title: 'Peak Hour Bonus',
    icon: '',
    value: 100,
    unit: '₹ / order',
    active: true,
    description: 'Extra surge payout during high-demand meal hours (12 PM–3 PM & 7 PM–11 PM).',
    category: 'Weather & Surge',
  },
  {
    id: 'dailyTargetBonus',
    title: 'Daily Target Bonus',
    icon: '',
    value: 150,
    unit: '₹ / day',
    active: true,
    description: 'Bonus awarded upon completing 15 or more orders in a single calendar day.',
    category: 'Target & Mileage',
  },
  {
    id: 'weeklyTargetBonus',
    title: 'Weekly Target Bonus',
    icon: '',
    value: 800,
    unit: '₹ / week',
    active: true,
    description: 'Tier-1 weekly payout bonus for completing 80+ deliveries per week.',
    category: 'Target & Mileage',
  },
  {
    id: 'longDistanceBonus',
    title: 'Long-Distance Bonus',
    icon: '',
    value: 15,
    unit: '₹ / extra km',
    active: true,
    description: 'Additional mileage incentive for deliveries exceeding 5 km radius.',
    category: 'Base & Distance',
  },
  {
    id: 'rainBonus',
    title: 'Rain/Bad Weather Bonus',
    icon: '',
    value: 70,
    unit: '₹ / order',
    active: true,
    description: 'Weather surge bonus automatically applied during rain or severe weather.',
    category: 'Weather & Surge',
  },
  {
    id: 'referralBonus',
    title: 'Referral Bonus',
    icon: '',
    value: 500,
    unit: '₹ / referral',
    active: true,
    description: 'Onboarding reward paid after referred delivery partner completes 25 orders.',
    category: 'Reward & Rating',
  },
  {
    id: 'performanceBonus',
    title: 'Performance/Rating Bonus',
    icon: '',
    value: 250,
    unit: '₹ / week',
    active: true,
    description: 'Weekly quality incentive for maintaining customer rating of 4.85+ stars.',
    category: 'Reward & Rating',
  },
];

const INITIAL_ZONES: ZoneItem[] = [
  { id: 'zone-downtown', name: 'Downtown Central', city: 'Tumakuru', code: 'Z-01', description: 'High-density commercial market hub & food streets' },
  { id: 'zone-north', name: 'North Metro Corridor', city: 'Tumakuru', code: 'Z-02', description: 'Highway connecting outer commercial suburbs' },
  { id: 'zone-westside', name: 'Westside Tech & University Hub', city: 'Tumakuru', code: 'Z-03', description: 'University campuses, colleges & technology parks' },
  { id: 'zone-east', name: 'East Suburban Cluster', city: 'Tumakuru', code: 'Z-04', description: 'Residential townships & peripheral gated communities' },
  { id: 'zone-tumakuru-central', name: 'Tumakuru Central Hub', city: 'Tumakuru', code: 'Z-05', description: 'Core city market, railway station & bus terminus' },
  { id: 'zone-bangalore-south', name: 'Bangalore South (Koramangala & HSR)', city: 'Bengaluru', code: 'Z-06', description: 'Prime dining hotspots, cloud kitchen clusters & startups' },
  { id: 'zone-indiranagar', name: 'Indiranagar & CBD Central', city: 'Bengaluru', code: 'Z-07', description: 'High-ticket fine dining & commercial dining corridor' },
  { id: 'zone-whitefield', name: 'Whitefield & ITPL Tech Hub', city: 'Bengaluru', code: 'Z-08', description: 'Extended suburban tech parks and residential high-rises' },
];

export function DeliveryPricingSettingsCard() {
  const { tokens } = useTheme();
  const { data: pricingConfig, isLoading } = useGetDeliveryPricingQuery();
  const [updatePricing, { isLoading: isUpdating }] = useUpdateDeliveryPricingMutation();

  // Mode: Universal Basis vs Zone Basis
  const [pricingBasis, setPricingBasis] = useState<'UNIVERSAL' | 'ZONE'>('UNIVERSAL');

  // Universal Basis State
  const [universalConfig, setUniversalConfig] = useState<PayoutStructureConfig>({
    minPrice: 200,
    moneyPerKm: 25,
    incentives: DEFAULT_INCENTIVES,
  });

  // Zone Basis State
  const [zones, setZones] = useState<ZoneItem[]>(INITIAL_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-downtown');
  const [zoneSearchQuery, setZoneSearchQuery] = useState<string>('');
  const [zoneConfigs, setZoneConfigs] = useState<Record<string, PayoutStructureConfig>>({
    'zone-downtown': { minPrice: 220, moneyPerKm: 28, incentives: DEFAULT_INCENTIVES },
    'zone-north': { minPrice: 200, moneyPerKm: 25, incentives: DEFAULT_INCENTIVES },
    'zone-westside': { minPrice: 190, moneyPerKm: 24, incentives: DEFAULT_INCENTIVES },
    'zone-east': { minPrice: 210, moneyPerKm: 26, incentives: DEFAULT_INCENTIVES },
    'zone-tumakuru-central': { minPrice: 230, moneyPerKm: 30, incentives: DEFAULT_INCENTIVES },
    'zone-bangalore-south': { minPrice: 250, moneyPerKm: 32, incentives: DEFAULT_INCENTIVES },
    'zone-indiranagar': { minPrice: 260, moneyPerKm: 35, incentives: DEFAULT_INCENTIVES },
    'zone-whitefield': { minPrice: 240, moneyPerKm: 30, incentives: DEFAULT_INCENTIVES },
  });

  // New Custom Zone State
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCity, setNewZoneCity] = useState('Tumakuru');

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savedItemsMap, setSavedItemsMap] = useState<Record<string, boolean>>({});

  // Input Focus States
  const [minPriceFocused, setMinPriceFocused] = useState(false);
  const [moneyKmFocused, setMoneyKmFocused] = useState(false);

  // Simulation State
  const [simDistances, setSimDistances] = useState<number[]>([2, 5, 8, 12]);
  const [customTestKm, setCustomTestKm] = useState<number>(10);

  // Initialize from LocalStorage and API
  useEffect(() => {
    try {
      const savedBasis = localStorage.getItem('foodie_pricing_basis');
      if (savedBasis === 'ZONE' || savedBasis === 'UNIVERSAL') {
        setPricingBasis(savedBasis);
      }
      const savedZoneId = localStorage.getItem('foodie_selected_zone_id');
      if (savedZoneId) {
        setSelectedZoneId(savedZoneId);
      }
      const savedUniversal = localStorage.getItem('foodie_universal_pricing_config');
      if (savedUniversal) {
        const parsed = JSON.parse(savedUniversal);
        setUniversalConfig(parsed);
      }
      const savedZoneConfigs = localStorage.getItem('foodie_zone_pricing_configs');
      if (savedZoneConfigs) {
        const parsed = JSON.parse(savedZoneConfigs);
        setZoneConfigs(parsed);
      }
      const savedCustomZones = localStorage.getItem('foodie_custom_zones');
      if (savedCustomZones) {
        const parsed = JSON.parse(savedCustomZones);
        if (Array.isArray(parsed)) {
          setZones(parsed);
        }
      }
    } catch (_e) {
      // Ignore parse errors
    }

    if (pricingConfig) {
      setUniversalConfig((prev) => ({
        ...prev,
        minPrice: pricingConfig.minPricePerDelivery ?? prev.minPrice,
        moneyPerKm: pricingConfig.moneyPerKm ?? prev.moneyPerKm,
      }));
    }
  }, [pricingConfig]);

  // Current Active Configuration (Universal vs Selected Zone)
  const currentConfig: PayoutStructureConfig = useMemo(() => {
    if (pricingBasis === 'UNIVERSAL') {
      return universalConfig;
    }
    const zoneConfig = zoneConfigs[selectedZoneId];
    if (zoneConfig) {
      return zoneConfig;
    }
    return universalConfig;
  }, [pricingBasis, selectedZoneId, universalConfig, zoneConfigs]);

  const activeZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || zones[0];
  }, [zones, selectedZoneId]);

  // Filtered Zones based on Search
  const filteredZones = useMemo(() => {
    const q = zoneSearchQuery.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.city.toLowerCase().includes(q) ||
        z.code.toLowerCase().includes(q) ||
        z.description.toLowerCase().includes(q)
    );
  }, [zones, zoneSearchQuery]);

  // Update Active Config Values
  const handleUpdateMinPrice = (val: number) => {
    if (pricingBasis === 'UNIVERSAL') {
      setUniversalConfig((prev) => ({ ...prev, minPrice: val }));
    } else {
      setZoneConfigs((prev) => ({
        ...prev,
        [selectedZoneId]: {
          ...(prev[selectedZoneId] || universalConfig),
          minPrice: val,
        },
      }));
    }
  };

  const handleUpdateMoneyPerKm = (val: number) => {
    if (pricingBasis === 'UNIVERSAL') {
      setUniversalConfig((prev) => ({ ...prev, moneyPerKm: val }));
    } else {
      setZoneConfigs((prev) => ({
        ...prev,
        [selectedZoneId]: {
          ...(prev[selectedZoneId] || universalConfig),
          moneyPerKm: val,
        },
      }));
    }
  };

  const handleIncentiveChange = (
    id: string,
    field: 'value' | 'active' | 'description' | 'title',
    val: number | boolean | string
  ) => {
    setSavedItemsMap((prev) => ({ ...prev, [id]: false }));
    const updateList = (list: IncentiveItem[]) =>
      list.map((item) => (item.id === id ? { ...item, [field]: val } : item));

    if (pricingBasis === 'UNIVERSAL') {
      setUniversalConfig((prev) => ({
        ...prev,
        incentives: updateList(prev.incentives),
      }));
    } else {
      setZoneConfigs((prev) => {
        const existing = prev[selectedZoneId] || universalConfig;
        return {
          ...prev,
          [selectedZoneId]: {
            ...existing,
            incentives: updateList(existing.incentives),
          },
        };
      });
    }
  };

  const handleAddCustomIncentive = () => {
    const newId = `customBonus_${Date.now()}`;
    const newRule: IncentiveItem = {
      id: newId,
      title: 'Custom Location Surge',
      icon: '',
      value: 50,
      unit: '₹ / order',
      active: true,
      description: `Custom incentive bonus active for ${pricingBasis === 'ZONE' ? activeZone.name : 'all platform orders'}.`,
      category: 'Reward & Rating',
    };

    if (pricingBasis === 'UNIVERSAL') {
      setUniversalConfig((prev) => ({
        ...prev,
        incentives: [...prev.incentives, newRule],
      }));
    } else {
      setZoneConfigs((prev) => {
        const existing = prev[selectedZoneId] || universalConfig;
        return {
          ...prev,
          [selectedZoneId]: {
            ...existing,
            incentives: [...existing.incentives, newRule],
          },
        };
      });
    }
  };

  const handleRemoveIncentive = (id: string) => {
    if (pricingBasis === 'UNIVERSAL') {
      setUniversalConfig((prev) => ({
        ...prev,
        incentives: prev.incentives.filter((i) => i.id !== id),
      }));
    } else {
      setZoneConfigs((prev) => {
        const existing = prev[selectedZoneId] || universalConfig;
        return {
          ...prev,
          [selectedZoneId]: {
            ...existing,
            incentives: existing.incentives.filter((i) => i.id !== id),
          },
        };
      });
    }
  };

  const handleAddCustomZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      alert('Please enter a valid Zone / Location name');
      return;
    }
    const zoneId = `zone-${Date.now()}`;
    const newZone: ZoneItem = {
      id: zoneId,
      name: newZoneName.trim(),
      city: newZoneCity.trim() || 'Tumakuru',
      code: `Z-0${zones.length + 1}`,
      description: `Custom zone location created for ${newZoneName.trim()}`,
    };

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    setSelectedZoneId(zoneId);
    setZoneConfigs((prev) => ({
      ...prev,
      [zoneId]: {
        minPrice: universalConfig.minPrice,
        moneyPerKm: universalConfig.moneyPerKm,
        incentives: [...universalConfig.incentives],
      },
    }));

    try {
      localStorage.setItem('foodie_custom_zones', JSON.stringify(updatedZones));
    } catch (_e) {}

    setIsAddingZone(false);
    setNewZoneName('');
    setToastMsg({ text: `Location "${newZone.name}" created and selected!`, type: 'success' });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentConfig.minPrice < 0 || currentConfig.moneyPerKm < 0) {
      setToastMsg({ text: 'Payout values cannot be negative', type: 'error' });
      return;
    }

    try {
      localStorage.setItem('foodie_pricing_basis', pricingBasis);
      localStorage.setItem('foodie_selected_zone_id', selectedZoneId);
      localStorage.setItem('foodie_universal_pricing_config', JSON.stringify(universalConfig));
      localStorage.setItem('foodie_zone_pricing_configs', JSON.stringify(zoneConfigs));

      // Mark all rules as saved
      const allSavedMap: Record<string, boolean> = {};
      currentConfig.incentives.forEach((item) => (allSavedMap[item.id] = true));
      setSavedItemsMap(allSavedMap);

      if (pricingBasis === 'UNIVERSAL') {
        await updatePricing({
          minPricePerDelivery: Number(universalConfig.minPrice),
          moneyPerKm: Number(universalConfig.moneyPerKm),
        }).unwrap();
        setToastMsg({ text: '🌍 Universal global payout structure & incentives saved successfully!', type: 'success' });
      } else {
        setToastMsg({
          text: `📍 Payout structure & incentives for "${activeZone.name}" (${activeZone.city}) saved successfully!`,
          type: 'success',
        });
      }
      setTimeout(() => setToastMsg(null), 4000);
    } catch (_err) {
      setToastMsg({
        text: `Settings saved locally (${pricingBasis === 'UNIVERSAL' ? 'Universal Global' : activeZone.name})!`,
        type: 'success',
      });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const calculatePayout = (distKm: number): { payout: number; appliedRule: 'MIN_PRICE' | 'PER_KM' } => {
    const feeByKm = distKm * currentConfig.moneyPerKm;
    if (feeByKm > currentConfig.minPrice) {
      return { payout: feeByKm, appliedRule: 'PER_KM' };
    }
    return { payout: currentConfig.minPrice, appliedRule: 'MIN_PRICE' };
  };

  const handleUpdateDistance = (index: number, newKm: number) => {
    setSimDistances((prev) => prev.map((d, idx) => (idx === index ? newKm : d)));
  };

  const handleAddDistanceCard = () => {
    const nextKm = simDistances.length > 0 ? Math.max(...simDistances) + 3 : 5;
    setSimDistances((prev) => [...prev, nextKm]);
  };

  const handleRemoveDistanceCard = (index: number) => {
    if (simDistances.length <= 1) return;
    setSimDistances((prev) => prev.filter((_, idx) => idx !== index));
  };

  const customResult = calculatePayout(customTestKm);

  return (
    <div
      className="pricing-card-responsive"
      style={{
        backgroundColor: tokens?.color?.surface || '#FFFFFF',
        borderRadius: tokens?.radius?.lg || '16px',
        border: `1px solid ${tokens?.color?.border || '#BAE6FD'}`,
        borderTop: '4px solid #0284C7',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: '0 10px 30px rgba(2, 132, 199, 0.05), 0 2px 6px rgba(2, 132, 199, 0.03)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0C4A6E', letterSpacing: '-0.02em' }}>
            Delivery Partner Payout Structure & Incentives
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#0369A1', lineHeight: '1.5' }}>
            Configure guaranteed base payouts, distance rates, and incentives on a universal platform-wide or zone-specific location basis.
          </p>
        </div>

        {/* Universal vs Zone Basis Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F0F9FF',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #BAE6FD',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setPricingBasis('UNIVERSAL')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: pricingBasis === 'UNIVERSAL' ? '#0284C7' : 'transparent',
              color: pricingBasis === 'UNIVERSAL' ? '#FFFFFF' : '#0369A1',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: pricingBasis === 'UNIVERSAL' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            <span>🌍</span> Universal Basis
          </button>

          <button
            type="button"
            onClick={() => setPricingBasis('ZONE')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: pricingBasis === 'ZONE' ? '#0284C7' : 'transparent',
              color: pricingBasis === 'ZONE' ? '#FFFFFF' : '#0369A1',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: pricingBasis === 'ZONE' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            <span>📍</span> Zone Basis
          </button>
        </div>
      </div>

      {/* Zone Search & Location Selector (Rendered only in Zone Basis Mode) */}
      {pricingBasis === 'ZONE' && (
        <div
          style={{
            backgroundColor: '#F0F9FF',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '24px',
            border: '1px solid #BAE6FD',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0C4A6E' }}>📍 Select Operating Zone / Location</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#0284C7', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px' }}>
                {zones.length} Zones Available
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingZone(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              }}
            >
              + Add Custom Location
            </button>
          </div>

          {/* Search Input Bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search zone by name, city, or code (e.g. Tumakuru, Downtown, Koramangala, Indiranagar)..."
              value={zoneSearchQuery}
              onChange={(e) => setZoneSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #BAE6FD',
                fontSize: '0.875rem',
                backgroundColor: '#FFFFFF',
                color: '#0C4A6E',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Zone Chips Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
            {filteredZones.map((z) => {
              const isSelected = selectedZoneId === z.id;
              const hasCustomConfig = !!zoneConfigs[z.id];
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZoneId(z.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0284C7' : '1px solid #BAE6FD',
                    backgroundColor: isSelected ? '#0284C7' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#0C4A6E',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{z.name}</span>
                  <span style={{ fontSize: '0.7rem', opacity: isSelected ? 0.9 : 0.6, fontWeight: 700 }}>
                    ({z.city})
                  </span>
                  {hasCustomConfig && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? '#FFFFFF' : '#0284C7' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Zone Details Card Banner */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '1px solid #BAE6FD',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0C4A6E' }}>
                📍 Configuring Zone: <span style={{ textDecoration: 'underline' }}>{activeZone.name}</span> ({activeZone.code})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0369A1', marginTop: '2px' }}>
                {activeZone.description} · City: {activeZone.city}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD',
                }}
              >
                Base: ₹{currentConfig.minPrice} · ₹{currentConfig.moneyPerKm}/km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mode Status Banner */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          backgroundColor: pricingBasis === 'UNIVERSAL' ? '#E0F2FE' : '#0284C7',
          color: pricingBasis === 'UNIVERSAL' ? '#0284C7' : '#FFFFFF',
          fontSize: '0.8125rem',
          fontWeight: 700,
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          border: '1px solid #BAE6FD',
        }}
      >
        <span>
          {pricingBasis === 'UNIVERSAL'
            ? '🌍 Universal Global Pricing Active: Rules set here apply to all delivery partners and zones across the marketplace.'
            : `📍 Zone Override Active for "${activeZone.name}": Custom payout multipliers apply specifically to deliveries originating in this zone.`}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {pricingBasis === 'UNIVERSAL' ? 'Default Scope' : 'Zone Scope'}
        </span>
      </div>

      {/* Alert Notification Toast */}
      {toastMsg && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: '#0C4A6E',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            border: '1px solid #0284C7',
          }}
        >
          <span>{toastMsg.text}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#0369A1', fontWeight: 600 }}>
          Loading delivery payout & incentive rules...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Main Pricing Rules Inputs */}
          <div className="pricing-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Input Card 1: Minimum Price per Delivery */}
            <div
              style={{
                backgroundColor: '#F0F9FF',
                padding: '20px',
                borderRadius: '14px',
                border: minPriceFocused ? '1px solid #0284C7' : '1px solid #BAE6FD',
                boxShadow: minPriceFocused ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <label
                htmlFor="minPriceInput"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#0C4A6E',
                  marginBottom: '10px',
                }}
              >
                <span>Minimum Price per Delivery</span>
                <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 800, backgroundColor: '#E0F2FE', padding: '2px 8px', borderRadius: '12px' }}>Guaranteed Base</span>
              </label>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: '#FFFFFF',
                    backgroundColor: '#0284C7',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  ₹
                </span>
                <input
                  id="minPriceInput"
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentConfig.minPrice}
                  onFocus={() => setMinPriceFocused(true)}
                  onBlur={() => setMinPriceFocused(false)}
                  onChange={(e) => handleUpdateMinPrice(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #BAE6FD',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#0C4A6E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#0369A1', lineHeight: '1.4' }}>
                Minimum payout assigned to delivery partners even for very short trips.
              </p>
            </div>

            {/* Input Card 2: Money per KM */}
            <div
              style={{
                backgroundColor: '#F0F9FF',
                padding: '20px',
                borderRadius: '14px',
                border: moneyKmFocused ? '1px solid #0284C7' : '1px solid #BAE6FD',
                boxShadow: moneyKmFocused ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <label
                htmlFor="moneyPerKmInput"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#0C4A6E',
                  marginBottom: '10px',
                }}
              >
                <span>Money per KM</span>
                <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 800, backgroundColor: '#E0F2FE', padding: '2px 8px', borderRadius: '12px' }}>Distance Rate</span>
              </label>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: '#FFFFFF',
                    backgroundColor: '#0284C7',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  ₹
                </span>
                <input
                  id="moneyPerKmInput"
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentConfig.moneyPerKm}
                  onFocus={() => setMoneyKmFocused(true)}
                  onBlur={() => setMoneyKmFocused(false)}
                  onChange={(e) => handleUpdateMoneyPerKm(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #BAE6FD',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#0C4A6E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#0369A1', lineHeight: '1.4' }}>
                Per-kilometer payout multiplier applied as distance increases.
              </p>
            </div>
          </div>

          {/* Section: Rider Incentives & Performance Bonus Matrix */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #BAE6FD',
              padding: '20px',
              marginBottom: '28px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0C4A6E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Rider Incentives & Performance Bonus Matrix ({pricingBasis === 'UNIVERSAL' ? 'Universal' : activeZone.name})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#0369A1' }}>
                  Admin Operator Control: Configure custom rule conditions, toggle ON/OFF, and adjust compensation values.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddCustomIncentive}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  + Add Custom Rule
                </button>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BAE6FD' }}>
                  {currentConfig.incentives.filter((i) => i.active).length} of {currentConfig.incentives.length} Active
                </div>
              </div>
            </div>

            {/* Grid of Incentive Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {currentConfig.incentives.map((item) => {
                const isItemSaved = !!savedItemsMap[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: item.active ? '#F0F9FF' : '#F8FAFC',
                      borderRadius: '12px',
                      border: isItemSaved
                        ? '2px solid #0284C7'
                        : item.active
                        ? '1px solid #BAE6FD'
                        : '1px dashed #CBD5E1',
                      padding: '16px',
                      opacity: item.active ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                          type="text"
                          value={item.title}
                          disabled={!item.active}
                          onChange={(e) => handleIncentiveChange(item.id, 'title', e.target.value)}
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 800,
                            color: '#0C4A6E',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            width: '100%',
                            outline: 'none',
                            padding: '2px 0',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {currentConfig.incentives.length > 1 && item.id.startsWith('customBonus_') && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIncentive(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                            title="Remove custom rule"
                          >
                            ✕
                          </button>
                        )}

                        {/* Active Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleIncentiveChange(item.id, 'active', !item.active)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: 'none',
                            backgroundColor: item.active ? '#0284C7' : '#94A3B8',
                            color: '#FFFFFF',
                            fontSize: '0.675rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {item.active ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    {/* Rule Description Textarea */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0369A1', display: 'block', marginBottom: '4px' }}>
                        Rule Condition & Description:
                      </label>
                      <textarea
                        value={item.description}
                        disabled={!item.active}
                        onChange={(e) => handleIncentiveChange(item.id, 'description', e.target.value)}
                        rows={2}
                        placeholder="Type custom rule condition for riders..."
                        style={{
                          width: '100%',
                          fontSize: '0.75rem',
                          color: item.active ? '#0C4A6E' : '#64748B',
                          lineHeight: '1.4',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD',
                          backgroundColor: item.active ? '#FFFFFF' : '#F0F9FF',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Input value */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '0.875rem', color: '#0284C7' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={item.value}
                          disabled={!item.active}
                          onChange={(e) => handleIncentiveChange(item.id, 'value', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '8px 10px 8px 24px',
                            borderRadius: '8px',
                            border: '1px solid #BAE6FD',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            backgroundColor: item.active ? '#FFFFFF' : '#F0F9FF',
                            color: '#0C4A6E',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369A1', minWidth: '70px' }}>
                        {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Payout Simulator Panel */}
          <div
            style={{
              backgroundColor: '#F0F9FF',
              borderRadius: '14px',
              padding: '20px 24px',
              marginBottom: '24px',
              border: '1px solid #BAE6FD',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.975rem', fontWeight: 800, color: '#0C4A6E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Formula & Interactive Payout Simulator ({pricingBasis === 'UNIVERSAL' ? 'Universal' : activeZone.name})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0369A1', marginTop: '2px' }}>
                  Test real-time trip payouts with active rate multipliers
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddDistanceCard}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                    backgroundColor: '#FFFFFF',
                    color: '#0284C7',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Test Distance
                </button>
              </div>
            </div>

            {/* Formula Banner */}
            <div style={{ fontSize: '0.8125rem', color: '#0369A1', marginBottom: '16px', lineHeight: '1.5' }}>
              Payout = <code style={{ backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BAE6FD', fontWeight: 800, color: '#0284C7' }}>
                Max(₹{currentConfig.minPrice.toFixed(2)}, Distance × ₹{currentConfig.moneyPerKm.toFixed(2)}/km)
              </code>
            </div>

            {/* Custom Distance Calculator Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 700, color: '#0C4A6E' }}>
                <span>Operator Quick Test:</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={customTestKm}
                  onChange={(e) => setCustomTestKm(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: '70px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #0284C7',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    color: '#0C4A6E',
                    outline: 'none',
                    textAlign: 'center',
                    backgroundColor: '#F0F9FF',
                  }}
                />
                <span>km distance</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#0369A1' }}>
                  {customResult.appliedRule === 'PER_KM' ? `(${customTestKm} km × ₹${currentConfig.moneyPerKm.toFixed(2)})` : `(Base Guaranteed)`}
                </span>
                <strong style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0284C7' }}>
                  = ₹{customResult.payout.toFixed(2)}
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#E0F2FE',
                    border: '1px solid #BAE6FD',
                    color: '#0284C7',
                  }}
                >
                  {customResult.appliedRule === 'PER_KM' ? 'Per KM Rate' : 'Base Guaranteed'}
                </span>
              </div>
            </div>

            {/* Editable Grid of Test Distances */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              {simDistances.map((dist, idx) => {
                const { payout, appliedRule } = calculatePayout(dist);
                const isPerKm = appliedRule === 'PER_KM';
                return (
                  <div
                    key={`sim-${idx}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      border: '1px solid #BAE6FD',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
                      transition: 'transform 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369A1' }}>Trip:</span>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={dist}
                          onChange={(e) => handleUpdateDistance(idx, Math.max(0, Number(e.target.value)))}
                          style={{
                            width: '48px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            border: '1px solid #BAE6FD',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#0C4A6E',
                            backgroundColor: '#F0F9FF',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369A1' }}>km</span>
                      </div>

                      {simDistances.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDistanceCard(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '0 2px',
                          }}
                          title="Remove test distance"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284C7', margin: '4px 0' }}>
                      ₹{payout.toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#E0F2FE',
                          border: '1px solid #BAE6FD',
                          color: '#0284C7',
                          display: 'inline-block',
                        }}
                      >
                        {isPerKm ? 'Distance Incentive' : 'Base Guaranteed'}
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#0369A1', fontWeight: 700 }}>
                        {isPerKm ? `${dist}×₹${currentConfig.moneyPerKm}` : 'Base'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Submit Button */}
          <div className="save-button-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <button
              type="submit"
              disabled={isUpdating}
              className="save-button-responsive"
              style={{
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '0.9375rem',
                fontWeight: 800,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>
                {isUpdating
                  ? 'Saving...'
                  : pricingBasis === 'UNIVERSAL'
                  ? 'Save Universal Payout Structure'
                  : `Save ${activeZone.name} Payout Structure`}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Add Custom Zone Modal */}
      {isAddingZone && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(12, 74, 110, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: 440,
              maxWidth: '90%',
              padding: 24,
              border: '1px solid #BAE6FD',
              boxShadow: '0 20px 40px rgba(12, 74, 110, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0C4A6E' }}>
                Add New Delivery Zone / Location
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingZone(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomZone} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0C4A6E', marginBottom: 4 }}>
                  Zone / Area Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electronic City Phase 1 or HSR Layout"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #BAE6FD',
                    fontSize: 13,
                    color: '#0C4A6E',
                    backgroundColor: '#F0F9FF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0C4A6E', marginBottom: 4 }}>
                  City / Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tumakuru or Bengaluru"
                  value={newZoneCity}
                  onChange={(e) => setNewZoneCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #BAE6FD',
                    fontSize: 13,
                    color: '#0C4A6E',
                    backgroundColor: '#F0F9FF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddingZone(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #BAE6FD',
                    backgroundColor: '#F0F9FF',
                    color: '#0369A1',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  Create & Select Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 640px) {
          .pricing-card-responsive {
            padding: 16px 14px !important;
          }
          .save-button-container {
            justifyContent: stretch !important;
          }
          .save-button-responsive {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
