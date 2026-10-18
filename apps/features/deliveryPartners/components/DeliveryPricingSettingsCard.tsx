'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'foodie-shared-web';
import {
  useGetDeliveryPricingQuery,
  useUpdateDeliveryPricingMutation,
} from '@/api/endpoints/deliveryPartnersApi';

export interface IncentiveMilestone {
  trips: number;
  reward: number;
}

export interface IncentiveCondition {
  id: string;
  type?: 'LOGIN_SLOT' | 'ORDER_REJECTION' | 'MINIMUM_DELIVERIES' | 'CUSTOM';
  title: string;
  timeSlot?: string;
  duration?: string;
  minDurationMinutes?: number;
  maxRejections?: number;
  subtext?: string;
  value?: string;
}

export interface IncentiveItem {
  id: string;
  title: string;
  icon?: string;
  value: number;
  unit: string;
  active: boolean;
  description: string;
  category: 'Base & Distance' | 'Target & Mileage' | 'Weather & Surge' | 'Reward & Rating';
  targetCount?: number;
  milestones?: IncentiveMilestone[];
  conditions?: IncentiveCondition[];
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
    description: 'Bonus awarded upon completing daily order targets.',
    category: 'Target & Mileage',
    targetCount: 15,
    milestones: [
      { trips: 6, reward: 50 },
      { trips: 9, reward: 75 },
      { trips: 13, reward: 120 },
      { trips: 18, reward: 190 },
    ],
    conditions: [
      {
        id: 'loginSlot',
        type: 'LOGIN_SLOT',
        title: 'Mandatory Login: Complete below slot',
        timeSlot: '7pm - 12am',
        duration: '4h 30m',
        minDurationMinutes: 270,
      },
      {
        id: 'orderRejection',
        type: 'ORDER_REJECTION',
        title: 'Other condition',
        value: 'Do not reject',
        subtext: 'more than 1 order',
        maxRejections: 1,
      },
    ],
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
    targetCount: 80,
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
    targetCount: 25,
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

export function DeliveryPricingSettingsCard() {
  const { tokens } = useTheme();
  const { data: pricingConfig, isLoading } = useGetDeliveryPricingQuery();
  const [updatePricing, { isLoading: isUpdating }] = useUpdateDeliveryPricingMutation();

  // Universal Configuration State
  const [universalConfig, setUniversalConfig] = useState<PayoutStructureConfig>({
    minPrice: 200,
    moneyPerKm: 25,
    incentives: DEFAULT_INCENTIVES,
  });

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savedItemsMap, setSavedItemsMap] = useState<Record<string, boolean>>({});

  // Input Focus States
  const [minPriceFocused, setMinPriceFocused] = useState(false);
  const [moneyKmFocused, setMoneyKmFocused] = useState(false);

  // Simulation State
  const [simDistances, setSimDistances] = useState<number[]>([2, 5, 8, 12]);
  const [customTestKm, setCustomTestKm] = useState<number>(10);

  // Saved baseline values loaded from backend database
  const [savedMinPrice, setSavedMinPrice] = useState<number | null>(null);
  const [savedMoneyPerKm, setSavedMoneyPerKm] = useState<number | null>(null);

  // Form input string state (what admin types)
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [moneyPerKmInput, setMoneyPerKmInput] = useState<string>('');

  // Initialize from LocalStorage and Backend API
  useEffect(() => {
    try {
      // Clean up legacy zone-based keys from local storage
      localStorage.removeItem('foodie_pricing_basis');
      localStorage.removeItem('foodie_selected_zone_id');
      localStorage.removeItem('foodie_zone_pricing_configs');
      localStorage.removeItem('foodie_custom_zones');

      const savedUniversal = localStorage.getItem('foodie_universal_pricing_config');
      if (savedUniversal) {
        const parsed = JSON.parse(savedUniversal);
        setUniversalConfig(parsed);
      }
    } catch (_e) {
      // Ignore parse errors
    }

    if (pricingConfig) {
      const bMin = pricingConfig.minPricePerDelivery ?? 201.5;
      const bKm = pricingConfig.moneyPerKm ?? 25.5;

      setSavedMinPrice(bMin);
      setSavedMoneyPerKm(bKm);

      setMinPriceInput((prev) => (prev === '' ? String(bMin) : prev));
      setMoneyPerKmInput((prev) => (prev === '' ? String(bKm) : prev));

      if (pricingConfig.universalConfig) {
        const uIncentives = Array.isArray(pricingConfig.universalConfig.incentives)
          ? pricingConfig.universalConfig.incentives
          : [];
        const mergedIncentives = DEFAULT_INCENTIVES.map((defItem) => {
          const match = uIncentives.find((i: IncentiveItem) => i.id === defItem.id);
          return match ? { ...defItem, ...match } : defItem;
        });
        const customIncentives = uIncentives.filter(
          (i: IncentiveItem) => !DEFAULT_INCENTIVES.some((d) => d.id === i.id)
        );

        setUniversalConfig({
          minPrice: pricingConfig.universalConfig.minPrice ?? bMin,
          moneyPerKm: pricingConfig.universalConfig.moneyPerKm ?? bKm,
          incentives: [...mergedIncentives, ...customIncentives],
        });
      } else {
        setUniversalConfig((prev) => ({
          ...prev,
          minPrice: bMin,
          moneyPerKm: bKm,
        }));
      }
    }
  }, [pricingConfig]);

  const parsedMinPrice = parseFloat(minPriceInput);
  const parsedMoneyPerKm = parseFloat(moneyPerKmInput);

  const isMinPriceValid = !isNaN(parsedMinPrice) && parsedMinPrice >= 0;
  const isMoneyPerKmValid = !isNaN(parsedMoneyPerKm) && parsedMoneyPerKm >= 0;

  const hasUnsavedChanges = useMemo(() => {
    if (savedMinPrice === null || savedMoneyPerKm === null) return false;
    return (
      (isMinPriceValid && parsedMinPrice !== savedMinPrice) ||
      (isMoneyPerKmValid && parsedMoneyPerKm !== savedMoneyPerKm)
    );
  }, [savedMinPrice, savedMoneyPerKm, parsedMinPrice, parsedMoneyPerKm, isMinPriceValid, isMoneyPerKmValid]);

  // Current Active Configuration (Platform Universal)
  const currentConfig: PayoutStructureConfig = universalConfig;

  // Update Active Config Values
  const handleUpdateMinPrice = (valStr: string) => {
    setMinPriceInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0) {
      setUniversalConfig((prev) => ({ ...prev, minPrice: num }));
    }
  };

  const handleUpdateMoneyPerKm = (valStr: string) => {
    setMoneyPerKmInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0) {
      setUniversalConfig((prev) => ({ ...prev, moneyPerKm: num }));
    }
  };

  const handleIncentiveChange = async (
    id: string,
    field: 'value' | 'active' | 'description' | 'title' | 'targetCount' | 'milestones' | 'conditions',
    val: any
  ) => {
    setSavedItemsMap((prev) => ({ ...prev, [id]: false }));
    const updateList = (list: IncentiveItem[]) =>
      list.map((item) => (item.id === id ? { ...item, [field]: val } : item));

    const updatedUniversal = {
      ...universalConfig,
      incentives: updateList(universalConfig.incentives),
    };
    setUniversalConfig(updatedUniversal);

    if (field === 'active') {
      try {
        const minP = isMinPriceValid ? parsedMinPrice : (savedMinPrice ?? 201.5);
        const mKm = isMoneyPerKmValid ? parsedMoneyPerKm : (savedMoneyPerKm ?? 25.5);
        await updatePricing({
          minPricePerDelivery: minP,
          moneyPerKm: mKm,
          pricingBasis: 'UNIVERSAL',
          universalConfig: updatedUniversal,
        }).unwrap();
        setSavedItemsMap((prev) => ({ ...prev, [id]: true }));
        try {
          localStorage.setItem('foodie_universal_pricing_config', JSON.stringify(updatedUniversal));
        } catch (_e) {}
        setToastMsg({
          text: `Incentive "${id}" turned ${val ? 'ON' : 'OFF'} and synced!`,
          type: 'success',
        });
        setTimeout(() => setToastMsg(null), 2500);
      } catch (err: any) {
        setToastMsg({
          text: `Failed to sync toggle: ${err?.data?.error?.message || err?.message || 'Error'}`,
          type: 'error',
        });
        setTimeout(() => setToastMsg(null), 3000);
      }
    }
  };

  const handleAddCustomIncentive = () => {
    const newId = `customBonus_${Date.now()}`;
    const newRule: IncentiveItem = {
      id: newId,
      title: 'Platform Mileage Surge',
      icon: '',
      value: 50,
      unit: '₹ / order',
      active: true,
      description: 'Custom platform incentive bonus active for fulfilled delivery assignments.',
      category: 'Reward & Rating',
    };

    setUniversalConfig((prev) => ({
      ...prev,
      incentives: [...prev.incentives, newRule],
    }));
  };

  const handleRemoveIncentive = (id: string) => {
    setUniversalConfig((prev) => ({
      ...prev,
      incentives: prev.incentives.filter((i) => i.id !== id),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg(null);

    if (!isMinPriceValid) {
      setToastMsg({ text: 'Minimum Price per Delivery must be a valid non-negative number.', type: 'error' });
      return;
    }

    if (!isMoneyPerKmValid) {
      setToastMsg({ text: 'Money per KM distance rate must be a valid non-negative number.', type: 'error' });
      return;
    }

    try {
      localStorage.setItem('foodie_universal_pricing_config', JSON.stringify(universalConfig));

      // Mark all rules as saved
      const allSavedMap: Record<string, boolean> = {};
      currentConfig.incentives.forEach((item) => (allSavedMap[item.id] = true));
      setSavedItemsMap(allSavedMap);

      const updatedUniversalConfig = {
        ...universalConfig,
        minPrice: parsedMinPrice,
        moneyPerKm: parsedMoneyPerKm,
      };

      const res = await updatePricing({
        minPricePerDelivery: parsedMinPrice,
        moneyPerKm: parsedMoneyPerKm,
        pricingBasis: 'UNIVERSAL',
        universalConfig: updatedUniversalConfig,
      }).unwrap();

      const updatedMin = res?.minPricePerDelivery ?? parsedMinPrice;
      const updatedKm = res?.moneyPerKm ?? parsedMoneyPerKm;

      setSavedMinPrice(updatedMin);
      setSavedMoneyPerKm(updatedKm);
      setMinPriceInput(String(updatedMin));
      setMoneyPerKmInput(String(updatedKm));

      setUniversalConfig((prev) => ({
        ...prev,
        minPrice: updatedMin,
        moneyPerKm: updatedKm,
      }));

      setToastMsg({ text: 'Universal platform payout structure and incentives saved successfully!', type: 'success' });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      const errorMsg = err?.data?.error?.message || err?.message || 'Failed to save payout settings to database. Please try again.';
      setToastMsg({
        text: errorMsg,
        type: 'error',
      });
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
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E5E7EB',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            Delivery Partner Payout Structure & Incentives
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.5' }}>
            Configure guaranteed base payouts, distance rates, and incentives across the platform.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#E3F2FD',
              color: '#2196F3',
              padding: '6px 14px',
              borderRadius: '12px',
              border: '1px solid #BFDBFE',
            }}
          >
            Platform Universal Scope
          </span>
        </div>
      </div>

      {/* Alert Notification Toast */}
      {toastMsg && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.25)',
          }}
        >
          <span>{toastMsg.text}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', fontWeight: 600 }}>
          Loading delivery payout & incentive rules...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Main Pricing Rules Inputs */}
          <div className="pricing-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Input Card 1: Minimum Price per Delivery */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '20px',
                borderRadius: '16px',
                border: minPriceFocused ? '1px solid #2196F3' : '1px solid #E5E7EB',
                boxShadow: minPriceFocused ? '0 0 0 3px rgba(33, 150, 243, 0.15)' : 'none',
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
                  color: '#111827',
                  marginBottom: '10px',
                }}
              >
                <span>Minimum Price per Delivery</span>
                <span style={{ fontSize: '0.75rem', color: '#2196F3', fontWeight: 700 }}>Guaranteed Base</span>
              </label>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#2196F3',
                    backgroundColor: '#E3F2FD',
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
                  value={minPriceInput}
                  onFocus={() => setMinPriceFocused(true)}
                  onBlur={() => setMinPriceFocused(false)}
                  onChange={(e) => handleUpdateMinPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#6B7280', lineHeight: '1.4' }}>
                Minimum payout assigned to delivery partners even for very short trips.
              </p>
            </div>

            {/* Input Card 2: Money per KM */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '20px',
                borderRadius: '16px',
                border: moneyKmFocused ? '1px solid #2196F3' : '1px solid #E5E7EB',
                boxShadow: moneyKmFocused ? '0 0 0 3px rgba(33, 150, 243, 0.15)' : 'none',
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
                  color: '#111827',
                  marginBottom: '10px',
                }}
              >
                <span>Money per KM</span>
                <span style={{ fontSize: '0.75rem', color: '#2196F3', fontWeight: 700 }}>Distance Rate</span>
              </label>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#2196F3',
                    backgroundColor: '#E3F2FD',
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
                  value={moneyPerKmInput}
                  onFocus={() => setMoneyKmFocused(true)}
                  onBlur={() => setMoneyKmFocused(false)}
                  onChange={(e) => handleUpdateMoneyPerKm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#6B7280', lineHeight: '1.4' }}>
                Per-kilometer payout multiplier applied as distance increases.
              </p>
            </div>
          </div>

          {/* Dedicated Save Changes Section & Unsaved Indicator */}
          <div
            style={{
              backgroundColor: hasUnsavedChanges ? '#FEFCE8' : '#F9FAFB',
              border: hasUnsavedChanges ? '1.5px solid #FDE047' : '1px solid #E5E7EB',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: hasUnsavedChanges ? '#854D0E' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                {hasUnsavedChanges ? (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EAB308', display: 'inline-block' }} />
                    <span>Unsaved Payout Changes</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#22C55E', fontWeight: 800 }}>✓</span>
                    <span>Payout Settings Synced with Database</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.775rem', color: hasUnsavedChanges ? '#A16207' : '#6B7280', marginTop: '2px' }}>
                {hasUnsavedChanges
                  ? 'You have modified payout settings. Click Save Changes to update the backend database.'
                  : 'Current values reflect active backend database rules.'}
              </div>
            </div>

            <button
              type="submit"
              disabled={!hasUnsavedChanges || isUpdating}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: hasUnsavedChanges
                  ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)'
                  : '#E5E7EB',
                color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: (hasUnsavedChanges && !isUpdating) ? 'pointer' : 'not-allowed',
                boxShadow: hasUnsavedChanges ? '0 4px 14px rgba(33, 150, 243, 0.3)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Section: Rider Incentives & Performance Bonus Matrix */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '20px',
              marginBottom: '28px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Rider Incentives & Performance Bonus Matrix
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
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
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                  }}
                >
                  + Add Custom Rule
                </button>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
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
                      backgroundColor: item.active ? '#FFFFFF' : '#F9FAFB',
                      borderRadius: '12px',
                      border: isItemSaved
                        ? '2px solid #2196F3'
                        : item.active
                        ? '1px solid #BFDBFE'
                        : '1px dashed #D1D5DB',
                      padding: '16px',
                      opacity: item.active ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                      boxShadow: item.active ? '0 1px 3px 0 rgba(0, 0, 0, 0.04)' : 'none',
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
                            fontWeight: 700,
                            color: '#111827',
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
                              color: '#EF4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                            title="Remove custom rule"
                          >
                            ×
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
                            background: item.active ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : '#9CA3AF',
                            color: '#FFFFFF',
                            fontSize: '0.675rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: item.active ? '0 1px 4px rgba(33, 150, 243, 0.3)' : 'none',
                          }}
                        >
                          {item.active ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    {/* Rule Description Textarea */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '4px' }}>
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
                          color: item.active ? '#111827' : '#6B7280',
                          lineHeight: '1.4',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          backgroundColor: item.active ? '#FFFFFF' : '#F9FAFB',
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
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '0.875rem', color: '#6B7280' }}>
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
                            border: '1px solid #E5E7EB',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            backgroundColor: item.active ? '#FFFFFF' : '#F9FAFB',
                            color: '#111827',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', minWidth: '70px' }}>
                        {item.unit}
                      </span>
                    </div>

                    {/* Target Delivery Count */}
                    {(item.targetCount !== undefined || item.category === 'Target & Mileage') && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6B7280', minWidth: '105px' }}>
                          Target Deliveries:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetCount ?? (item.id === 'weeklyTargetBonus' ? 80 : 15)}
                          disabled={!item.active}
                          onChange={(e) => handleIncentiveChange(item.id, 'targetCount', Math.max(1, parseInt(e.target.value) || 1))}
                          style={{
                            width: '70px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E5E7EB',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: item.active ? '#FFFFFF' : '#F9FAFB',
                            color: '#111827',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>orders</span>
                      </div>
                    )}

                    {/* Milestone Tiers for Daily Target Bonus */}
                    {item.id === 'dailyTargetBonus' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E5E7EB' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>
                          Daily Milestone Ladder:
                        </div>
                        <div
                          className="daily-milestone-ladder-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '8px',
                            width: '100%',
                          }}
                        >
                          {(item.milestones || [
                            { trips: 6, reward: 50 },
                            { trips: 9, reward: 75 },
                            { trips: 13, reward: 120 },
                            { trips: 18, reward: 190 },
                          ]).map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="daily-milestone-item"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                padding: '3px 4px',
                                borderRadius: '8px',
                                backgroundColor: item.active ? '#FFFFFF' : '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                boxSizing: 'border-box',
                                height: '36px',
                                minHeight: '36px',
                                width: '100%',
                                minWidth: 0,
                              }}
                            >
                              {/* Editable Trip Count Input */}
                              <input
                                type="number"
                                min="1"
                                value={m.trips ?? (m as any).orders ?? 1}
                                disabled={!item.active}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  const currentMilestones = (item.milestones || [
                                    { trips: 6, reward: 50 },
                                    { trips: 9, reward: 75 },
                                    { trips: 13, reward: 120 },
                                    { trips: 18, reward: 190 },
                                  ]).map((mItem, idx) =>
                                    idx === mIdx ? { ...mItem, trips: val, orders: val } : mItem
                                  );
                                  handleIncentiveChange(item.id, 'milestones', currentMilestones);
                                }}
                                style={{
                                  width: '28px',
                                  minWidth: '28px',
                                  height: '26px',
                                  padding: '0',
                                  borderRadius: '4px',
                                  border: '1px solid #D1D5DB',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: item.active ? '#F9FAFB' : '#F3F4F6',
                                  color: '#111827',
                                  outline: 'none',
                                  textAlign: 'center',
                                  boxSizing: 'border-box',
                                }}
                              />

                              {/* trips label */}
                              <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                trips
                              </span>

                              {/* arrow */}
                              <span style={{ fontSize: '0.625rem', color: '#9CA3AF', fontWeight: 700, margin: '0', lineHeight: 1 }}>
                                →
                              </span>

                              {/* currency symbol */}
                              <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.625rem', margin: '0', lineHeight: 1 }}>
                                ₹
                              </span>

                              {/* Editable Reward Input */}
                              <input
                                type="number"
                                min="0"
                                value={m.reward}
                                disabled={!item.active}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  const currentMilestones = (item.milestones || [
                                    { trips: 6, reward: 50 },
                                    { trips: 9, reward: 75 },
                                    { trips: 13, reward: 120 },
                                    { trips: 18, reward: 190 },
                                  ]).map((mItem, idx) =>
                                    idx === mIdx ? { ...mItem, reward: val } : mItem
                                  );
                                  handleIncentiveChange(item.id, 'milestones', currentMilestones);
                                }}
                                style={{
                                  width: '34px',
                                  minWidth: '34px',
                                  height: '26px',
                                  padding: '0',
                                  borderRadius: '4px',
                                  border: '1px solid #D1D5DB',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: item.active ? '#F9FAFB' : '#F3F4F6',
                                  color: '#111827',
                                  outline: 'none',
                                  textAlign: 'center',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Offer Conditions for Daily Target Bonus */}
                    {item.id === 'dailyTargetBonus' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E5E7EB' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>
                          Offer Conditions:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Login slot condition */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.6875rem' }}>
                            <span style={{ color: '#4B5563', fontWeight: 600 }}>Login Slot:</span>
                            <input
                              type="text"
                              disabled={!item.active}
                              value={item.conditions?.find(c => c.type === 'LOGIN_SLOT')?.timeSlot || '7pm - 12am'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const existing = item.conditions || [
                                  { id: 'loginSlot', type: 'LOGIN_SLOT', title: 'Mandatory Login: Complete below slot', timeSlot: '7pm - 12am', duration: '4h 30m', minDurationMinutes: 270 },
                                  { id: 'orderRejection', type: 'ORDER_REJECTION', title: 'Do not reject', subtext: 'more than 1 order', maxRejections: 1 },
                                ];
                                const updated = existing.map(c => c.type === 'LOGIN_SLOT' ? { ...c, timeSlot: val, value: val } : c);
                                handleIncentiveChange(item.id, 'conditions', updated);
                              }}
                              style={{
                                width: '100px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid #D1D5DB',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                backgroundColor: item.active ? '#F9FAFB' : '#F3F4F6',
                                color: '#111827',
                                outline: 'none',
                              }}
                            />
                          </div>

                          {/* Login duration condition */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.6875rem' }}>
                            <span style={{ color: '#4B5563', fontWeight: 600 }}>Duration:</span>
                            <input
                              type="text"
                              disabled={!item.active}
                              value={item.conditions?.find(c => c.type === 'LOGIN_SLOT')?.duration || '4h 30m'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const existing = item.conditions || [
                                  { id: 'loginSlot', type: 'LOGIN_SLOT', title: 'Mandatory Login: Complete below slot', timeSlot: '7pm - 12am', duration: '4h 30m', minDurationMinutes: 270 },
                                  { id: 'orderRejection', type: 'ORDER_REJECTION', title: 'Do not reject', subtext: 'more than 1 order', maxRejections: 1 },
                                ];
                                const updated = existing.map(c => c.type === 'LOGIN_SLOT' ? { ...c, duration: val, subtext: val } : c);
                                handleIncentiveChange(item.id, 'conditions', updated);
                              }}
                              style={{
                                width: '100px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid #D1D5DB',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                backgroundColor: item.active ? '#F9FAFB' : '#F3F4F6',
                                color: '#111827',
                                outline: 'none',
                              }}
                            />
                          </div>

                          {/* Order rejection limit */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.6875rem' }}>
                            <span style={{ color: '#4B5563', fontWeight: 600 }}>Max Rejections:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min="0"
                                disabled={!item.active}
                                value={item.conditions?.find(c => c.type === 'ORDER_REJECTION')?.maxRejections ?? 1}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  const existing = item.conditions || [
                                    { id: 'loginSlot', type: 'LOGIN_SLOT', title: 'Mandatory Login: Complete below slot', timeSlot: '7pm - 12am', duration: '4h 30m', minDurationMinutes: 270 },
                                    { id: 'orderRejection', type: 'ORDER_REJECTION', title: 'Do not reject', subtext: 'more than 1 order', maxRejections: 1 },
                                  ];
                                  const updated = existing.map(c => c.type === 'ORDER_REJECTION' ? { ...c, maxRejections: val, subtext: `more than ${val} order${val > 1 ? 's' : ''}` } : c);
                                  handleIncentiveChange(item.id, 'conditions', updated);
                                }}
                                style={{
                                  width: '45px',
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #D1D5DB',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: item.active ? '#F9FAFB' : '#F3F4F6',
                                  color: '#111827',
                                  outline: 'none',
                                  textAlign: 'center',
                                }}
                              />
                              <span style={{ color: '#6B7280', fontSize: '0.625rem' }}>orders</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                );
              })}
            </div>
          </div>

          {/* Interactive Payout Simulator Panel */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.975rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Formula & Interactive Payout Simulator
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                  Test real-time trip payouts with active rate multipliers
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddDistanceCard}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Add Test Distance
                </button>
              </div>
            </div>

            {/* Formula Banner */}
            <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: '16px', lineHeight: '1.5' }}>
              Payout = <code style={{ backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E5E7EB', fontWeight: 700, color: '#2196F3' }}>
                Max(₹{currentConfig.minPrice.toFixed(2)}, Distance × ₹{currentConfig.moneyPerKm.toFixed(2)}/km)
              </code>
            </div>

            {/* Custom Distance Calculator Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 700, color: '#111827' }}>
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
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    color: '#111827',
                    outline: 'none',
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <span>km distance</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  {customResult.appliedRule === 'PER_KM' ? `(${customTestKm} km × ₹${currentConfig.moneyPerKm.toFixed(2)})` : `(Base Guaranteed)`}
                </span>
                <strong style={{ fontSize: '1.125rem', fontWeight: 900, color: '#2196F3' }}>
                  = ₹{customResult.payout.toFixed(2)}
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#E3F2FD',
                    border: '1px solid #BFDBFE',
                    color: '#2196F3',
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
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                      transition: 'transform 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#6B7280' }}>Trip:</span>
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
                            border: '1px solid #E5E7EB',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#111827',
                            backgroundColor: '#FFFFFF',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#6B7280' }}>km</span>
                      </div>

                      {simDistances.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDistanceCard(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '0 2px',
                          }}
                          title="Remove test distance"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                      ₹{payout.toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#E3F2FD',
                          border: '1px solid #BFDBFE',
                          color: '#2196F3',
                          display: 'inline-block',
                        }}
                      >
                        {isPerKm ? 'Distance Incentive' : 'Base Guaranteed'}
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#6B7280', fontWeight: 600 }}>
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
                background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{isUpdating ? 'Saving...' : 'Save Universal Payout Structure'}</span>
            </button>
          </div>
        </form>
      )}

      <style jsx global>{`
        .daily-milestone-ladder-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }
        .daily-milestone-item input[type='number']::-webkit-outer-spin-button,
        .daily-milestone-item input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .daily-milestone-item input[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
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
          .daily-milestone-ladder-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 340px) {
          .daily-milestone-ladder-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
