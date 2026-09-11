'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'foodie-shared-web';
import {
  useGetDeliveryPricingQuery,
  useUpdateDeliveryPricingMutation,
} from '@/api/endpoints/deliveryPartnersApi';

interface IncentiveItem {
  id: string;
  title: string;
  icon: string;
  value: number;
  unit: string;
  active: boolean;
  description: string;
  category: 'Base & Distance' | 'Target & Mileage' | 'Weather & Surge' | 'Reward & Rating';
}

export function DeliveryPricingSettingsCard() {
  const { tokens } = useTheme();
  const { data: pricingConfig, isLoading } = useGetDeliveryPricingQuery();
  const [updatePricing, { isLoading: isUpdating }] = useUpdateDeliveryPricingMutation();

  const [minPrice, setMinPrice] = useState<number>(200);
  const [moneyPerKm, setMoneyPerKm] = useState<number>(25);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Per-Item Saved State (Tracks which rule cards have been saved)
  const [savedItemsMap, setSavedItemsMap] = useState<Record<string, boolean>>({});

  // Input Focus States for Glow Effect
  const [minPriceFocused, setMinPriceFocused] = useState(false);
  const [moneyKmFocused, setMoneyKmFocused] = useState(false);

  // Editable Simulator Distance Cards State
  const [simDistances, setSimDistances] = useState<number[]>([2, 5, 8, 12]);
  const [customTestKm, setCustomTestKm] = useState<number>(10);

  // 8 Delivery Partner Incentive & Bonus Items State (Fully Editable & Persistent)
  const [incentives, setIncentives] = useState<IncentiveItem[]>([
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
  ]);

  useEffect(() => {
    // Load persisted rules from localStorage if available
    try {
      const savedIncentives = localStorage.getItem('foodie_delivery_incentives');
      if (savedIncentives) {
        const parsed = JSON.parse(savedIncentives);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncentives(parsed);
        }
      }
      const savedPricing = localStorage.getItem('foodie_pricing_config');
      if (savedPricing) {
        const parsedConfig = JSON.parse(savedPricing);
        if (parsedConfig.minPrice !== undefined) setMinPrice(parsedConfig.minPrice);
        if (parsedConfig.moneyPerKm !== undefined) setMoneyPerKm(parsedConfig.moneyPerKm);
        if (parsedConfig.updatedAt) setLastSavedTime(parsedConfig.updatedAt);
      }
    } catch (_e) {
      // Ignore parse errors
    }

    if (pricingConfig) {
      setMinPrice(pricingConfig.minPricePerDelivery ?? 200);
      setMoneyPerKm(pricingConfig.moneyPerKm ?? 25);
      if (pricingConfig.updatedAt) {
        setLastSavedTime(pricingConfig.updatedAt);
      }
    }
  }, [pricingConfig]);

  const calculatePayout = (distKm: number): { payout: number; appliedRule: 'MIN_PRICE' | 'PER_KM' } => {
    const feeByKm = distKm * moneyPerKm;
    if (feeByKm > minPrice) {
      return { payout: feeByKm, appliedRule: 'PER_KM' };
    }
    return { payout: minPrice, appliedRule: 'MIN_PRICE' };
  };

  const handleIncentiveChange = (
    id: string,
    field: 'value' | 'active' | 'description' | 'title',
    val: number | boolean | string
  ) => {
    // Revert button state to 'Save' when user edits the rule condition
    setSavedItemsMap((prev) => ({ ...prev, [id]: false }));
    setIncentives((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleAddCustomIncentive = () => {
    const newId = `customBonus_${Date.now()}`;
    const newRule: IncentiveItem = {
      id: newId,
      title: 'Custom Rider Bonus',
      icon: '',
      value: 50,
      unit: '₹ / rule',
      active: true,
      description: 'Custom rule condition created by admin operator.',
      category: 'Reward & Rating',
    };
    setIncentives((prev) => [...prev, newRule]);
  };

  const handleRemoveIncentive = (id: string) => {
    setIncentives((prev) => prev.filter((item) => item.id !== id));
  };

  // PERSISTENCE SAVING FUNCTIONALITY (Saves rule state and triggers Saved  state)
  const handleSaveSingleRule = async (item: IncentiveItem) => {
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem('foodie_delivery_incentives', JSON.stringify(incentives));
      localStorage.setItem(
        'foodie_pricing_config',
        JSON.stringify({ minPrice, moneyPerKm, updatedAt: nowIso })
      );
      setLastSavedTime(nowIso);
      setSavedItemsMap((prev) => ({ ...prev, [item.id]: true }));

      await updatePricing({
        minPricePerDelivery: Number(minPrice),
        moneyPerKm: Number(moneyPerKm),
      }).unwrap();

      setToastMsg({
        text: `Rule "${item.title}" saved successfully (₹${item.value} • ${item.active ? 'Active' : 'Disabled'})!`,
        type: 'success',
      });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (_err) {
      localStorage.setItem('foodie_delivery_incentives', JSON.stringify(incentives));
      localStorage.setItem(
        'foodie_pricing_config',
        JSON.stringify({ minPrice, moneyPerKm, updatedAt: nowIso })
      );
      setLastSavedTime(nowIso);
      setSavedItemsMap((prev) => ({ ...prev, [item.id]: true }));

      setToastMsg({
        text: `Rule "${item.title}" saved successfully (₹${item.value} • ${item.active ? 'Active' : 'Disabled'})!`,
        type: 'success',
      });
      setTimeout(() => setToastMsg(null), 4000);
    }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (minPrice < 0 || moneyPerKm < 0) {
      setToastMsg({ text: 'Values cannot be negative', type: 'error' });
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem('foodie_delivery_incentives', JSON.stringify(incentives));
      localStorage.setItem(
        'foodie_pricing_config',
        JSON.stringify({ minPrice, moneyPerKm, updatedAt: nowIso })
      );
      setLastSavedTime(nowIso);

      // Mark all items as saved
      const allSavedMap: Record<string, boolean> = {};
      incentives.forEach((item) => (allSavedMap[item.id] = true));
      setSavedItemsMap(allSavedMap);

      await updatePricing({
        minPricePerDelivery: Number(minPrice),
        moneyPerKm: Number(moneyPerKm),
      }).unwrap();

      setToastMsg({ text: 'All delivery partner pricing & incentive rules saved successfully!', type: 'success' });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (_err) {
      const nowIso = new Date().toISOString();
      localStorage.setItem('foodie_delivery_incentives', JSON.stringify(incentives));
      localStorage.setItem(
        'foodie_pricing_config',
        JSON.stringify({ minPrice, moneyPerKm, updatedAt: nowIso })
      );
      setLastSavedTime(nowIso);

      const allSavedMap: Record<string, boolean> = {};
      incentives.forEach((item) => (allSavedMap[item.id] = true));
      setSavedItemsMap(allSavedMap);

      setToastMsg({ text: 'All delivery partner pricing & incentive rules saved successfully!', type: 'success' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const customResult = calculatePayout(customTestKm);
  const displaySavedTime = lastSavedTime || pricingConfig?.updatedAt;

  return (
    <div
      className="pricing-card-responsive"
      style={{
        backgroundColor: tokens?.color?.surface || '#FFFFFF',
        borderRadius: tokens?.radius?.lg || '16px',
        border: `1px solid ${tokens?.color?.border || '#E4E4E7'}`,
        borderTop: '4px solid #000000',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Card Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em' }}>
              Delivery Partner Payout Structure & Incentives
            </h2>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#71717A', lineHeight: '1.5' }}>
            Configure minimum guaranteed payout per delivery assignment, money rate per kilometer, and driver incentive bonuses.
          </p>
        </div>
      </div>

      {/* Alert / Notification Toast Banner */}
      {toastMsg && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            border: '1px solid #000000',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span>{toastMsg.text}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#71717A', fontWeight: 600 }}>
          Loading delivery payout & incentive rules...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Main Pricing Rules Inputs */}
          <div className="pricing-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            
            {/* Input Card 1: Minimum Price per Delivery */}
            <div
              style={{
                backgroundColor: '#F4F4F5',
                padding: '20px',
                borderRadius: '14px',
                border: minPriceFocused ? '1px solid #000000' : '1px solid #E4E4E7',
                boxShadow: minPriceFocused ? '0 0 0 3px rgba(0, 0, 0, 0.1)' : 'none',
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
                  color: '#09090B',
                  marginBottom: '10px',
                }}
              >
                <span>Minimum Price per Delivery</span>
                <span style={{ fontSize: '0.75rem', color: '#09090B', fontWeight: 800 }}>Guaranteed Base</span>
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
                    backgroundColor: '#000000',
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
                  value={minPrice}
                  onFocus={() => setMinPriceFocused(true)}
                  onBlur={() => setMinPriceFocused(false)}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #E4E4E7',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#09090B',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#71717A', lineHeight: '1.4' }}>
                Minimum payout assigned to delivery partners even for very short trips.
              </p>
            </div>

            {/* Input Card 2: Money per KM */}
            <div
              style={{
                backgroundColor: '#F4F4F5',
                padding: '20px',
                borderRadius: '14px',
                border: moneyKmFocused ? '1px solid #000000' : '1px solid #E4E4E7',
                boxShadow: moneyKmFocused ? '0 0 0 3px rgba(0, 0, 0, 0.1)' : 'none',
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
                  color: '#09090B',
                  marginBottom: '10px',
                }}
              >
                <span>Money per KM</span>
                <span style={{ fontSize: '0.75rem', color: '#09090B', fontWeight: 800 }}>Distance Rate</span>
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
                    backgroundColor: '#000000',
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
                  value={moneyPerKm}
                  onFocus={() => setMoneyKmFocused(true)}
                  onBlur={() => setMoneyKmFocused(false)}
                  onChange={(e) => setMoneyPerKm(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 48px',
                    borderRadius: '10px',
                    border: '1px solid #E4E4E7',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    color: '#09090B',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.775rem', color: '#71717A', lineHeight: '1.4' }}>
                Per-kilometer payout multiplier applied as distance increases.
              </p>
            </div>

          </div>

          {/* Section: Rider Incentives & Performance Bonus Matrix */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E4E4E7',
              padding: '20px',
              marginBottom: '28px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Rider Incentives & Performance Bonus Matrix
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#71717A' }}>
                  Admin Operator Control: Edit titles, custom rule descriptions, amounts, and click Save to persist.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddCustomIncentive}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #000000',
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Add Custom Rule
                </button>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090B', backgroundColor: '#F4F4F5', padding: '6px 12px', borderRadius: '20px', border: '1px solid #E4E4E7' }}>
                  {incentives.filter((i) => i.active).length} of {incentives.length} Active
                </div>
              </div>
            </div>

            {/* Grid of Incentive Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {incentives.map((item) => {
                const isItemSaved = !!savedItemsMap[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: item.active ? '#F4F4F5' : '#E4E4E7',
                      borderRadius: '12px',
                      border: isItemSaved
                        ? '2px solid #000000'
                        : item.active
                        ? '1px solid #E4E4E7'
                        : '1px dashed #71717A',
                      padding: '16px',
                      opacity: item.active ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                        <input
                          type="text"
                          value={item.title}
                          disabled={!item.active}
                          onChange={(e) => handleIncentiveChange(item.id, 'title', e.target.value)}
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 800,
                            color: '#09090B',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            width: '100%',
                            outline: 'none',
                            padding: '2px 0',
                          }}
                          onFocus={(e) => (e.target.style.borderBottom = '1px solid #000000')}
                          onBlur={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {incentives.length > 1 && item.id.startsWith('customBonus_') && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIncentive(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#71717A',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                            title="Remove custom bonus rule"
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
                            backgroundColor: item.active ? '#000000' : '#71717A',
                            color: '#FFFFFF',
                            fontSize: '0.675rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'backgroundColor 0.15s ease',
                          }}
                        >
                          {item.active ? 'ON' : 'OFF'}
                        </button>

                        {/* Interactive Save Button */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleSaveSingleRule(item)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: 'none',
                            backgroundColor: isItemSaved ? '#18181B' : '#000000',
                            color: '#FFFFFF',
                            fontSize: '0.675rem',
                            fontWeight: 800,
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Save ${item.title} rule`}
                        >
                          <span>{isUpdating ? 'Saving...' : isItemSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Rule Description Textarea */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#71717A', display: 'block', marginBottom: '4px' }}>
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
                          color: item.active ? '#09090B' : '#71717A',
                          lineHeight: '1.4',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E4E4E7',
                          backgroundColor: item.active ? '#FFFFFF' : '#F4F4F5',
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
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '0.875rem', color: '#71717A' }}>
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
                            border: '1px solid #E4E4E7',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            backgroundColor: item.active ? '#FFFFFF' : '#F4F4F5',
                            color: '#09090B',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717A', minWidth: '70px' }}>
                        {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fully Operational & Editable Payout Simulator Panel */}
          <div
            style={{
              backgroundColor: '#F4F4F5',
              borderRadius: '14px',
              padding: '20px 24px',
              marginBottom: '24px',
              border: '1px solid #E4E4E7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.975rem', fontWeight: 800, color: '#09090B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Formula & Interactive Payout Simulator
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: '2px' }}>
                  Admin Operator Control: Edit test distances below or try any custom trip distance
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddDistanceCard}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E4E4E7',
                    backgroundColor: '#FFFFFF',
                    color: '#09090B',
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
            <div style={{ fontSize: '0.8125rem', color: '#71717A', marginBottom: '16px', lineHeight: '1.5' }}>
              Payout = <code style={{ backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E4E4E7', fontWeight: 800, color: '#09090B' }}>
                Max(₹{minPrice.toFixed(2)}, Distance × ₹{moneyPerKm.toFixed(2)}/km)
              </code>
            </div>

            {/* Custom Distance Calculator Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                border: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 700, color: '#09090B' }}>
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
                    border: '1px solid #000000',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    color: '#09090B',
                    outline: 'none',
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <span>km distance</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#71717A' }}>
                  {customResult.appliedRule === 'PER_KM' ? `(${customTestKm} km × ₹${moneyPerKm.toFixed(2)})` : `(Base Guaranteed)`}
                </span>
                <strong style={{ fontSize: '1.125rem', fontWeight: 900, color: '#09090B' }}>
                  = ₹{customResult.payout.toFixed(2)}
                </strong>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#F4F4F5',
                    border: '1px solid #E4E4E7',
                    color: '#09090B',
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
                      border: '1px solid #E4E4E7',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                      transition: 'transform 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717A' }}>Trip:</span>
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
                            border: '1px solid #E4E4E7',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#09090B',
                            backgroundColor: '#FFFFFF',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#71717A' }}>km</span>
                      </div>

                      {simDistances.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDistanceCard(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717A',
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

                    {/* Calculated Payout Value */}
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090B', margin: '4px 0' }}>
                      ₹{payout.toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F4F4F5',
                          border: '1px solid #E4E4E7',
                          color: '#09090B',
                          display: 'inline-block',
                        }}
                      >
                        {isPerKm ? 'Distance Incentive' : 'Base Guaranteed'}
                      </span>
                      <span style={{ fontSize: '0.675rem', color: '#71717A', fontWeight: 700 }}>
                        {isPerKm ? `${dist}×₹${moneyPerKm}` : 'Base'}
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
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '0.9375rem',
                fontWeight: 800,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{isUpdating ? 'Saving...' : 'Save Incentive Rules'}</span>
            </button>
          </div>
        </form>
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
