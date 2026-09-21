'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Text, useTheme } from 'foodie-shared-web';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';

export interface CommissionSettingsData {
  commissionPct: number;
  deliveryCommissionPct: number;
  commissionModel: 'PERCENTAGE' | 'FLAT_FEE' | 'HYBRID';
  payoutFrequency: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'INSTANT';
  contractType: 'STANDARD_PLATFORM' | 'CUSTOM_PARTNER' | 'PROMOTIONAL';
  tcsDeductionEnabled: boolean;
  effectiveFrom: string;
}

export interface SelectedRestaurantTarget {
  id: string;
  name: string;
  isAllStores?: boolean;
}

type Props = {
  open: boolean;
  restaurantName: string;
  restaurantId: string;
  initialCommission?: number | string | null;
  loading?: boolean;
  showRestaurantSelector?: boolean;
  onClose: () => void;
  onSave: (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => void;
};

interface RestaurantOption {
  id: string;
  name: string;
  zone: string;
  status: string;
  commissionRate: number;
}

export function RestaurantCommissionModal({
  open,
  restaurantName,
  restaurantId,
  initialCommission,
  loading,
  showRestaurantSelector = true,
  onClose,
  onSave,
}: Props) {
  const { tokens } = useTheme();

  // Fetch all registered restaurants so admin can select any store
  const { data: adminRestaurantsData } = useGetAdminRestaurantsQuery(
    { size: 100 },
    { skip: !open }
  );

  const [selectedStoreId, setSelectedStoreId] = useState<string>(restaurantId);
  const [commissionRate, setCommissionRate] = useState<string>('15.0');
  const [deliveryCommissionRate, setDeliveryCommissionRate] = useState<string>('10.0');
  const [commissionModel, setCommissionModel] = useState<'PERCENTAGE' | 'FLAT_FEE' | 'HYBRID'>('PERCENTAGE');
  const [payoutFrequency, setPayoutFrequency] = useState<'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'INSTANT'>('WEEKLY');
  const [contractType, setContractType] = useState<'STANDARD_PLATFORM' | 'CUSTOM_PARTNER' | 'PROMOTIONAL'>('CUSTOM_PARTNER');
  const [tcsDeductionEnabled, setTcsDeductionEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compile available registered restaurant list
  const availableStores: RestaurantOption[] = React.useMemo(() => {
    const list: RestaurantOption[] = [];
    const seen = new Set<string>();

    // Add current restaurant first
    if (restaurantId) {
      list.push({
        id: restaurantId,
        name: restaurantName || 'Current Restaurant',
        zone: 'Assigned Zone',
        status: 'ACTIVE',
        commissionRate: typeof initialCommission === 'number' ? initialCommission : parseFloat(String(initialCommission || 15)) || 15,
      });
      seen.add(restaurantId);
    }

    // Add restaurants from API
    if (adminRestaurantsData?.items?.length) {
      adminRestaurantsData.items.forEach((item) => {
        if (item.restaurantId && !seen.has(item.restaurantId)) {
          seen.add(item.restaurantId);
          list.push({
            id: item.restaurantId,
            name: item.name || 'Unnamed Restaurant',
            zone: item.address?.city || 'Default Zone',
            status: item.status || 'PENDING',
            commissionRate: typeof item.commissionPct === 'number' ? item.commissionPct : 15,
          });
        }
      });
    }

    return list;
  }, [adminRestaurantsData, restaurantId, restaurantName, initialCommission]);

  // Sync state when modal opens or initialCommission changes
  useEffect(() => {
    if (open) {
      setSelectedStoreId(restaurantId);
      if (initialCommission != null && initialCommission !== '') {
        const parsed = typeof initialCommission === 'number' ? initialCommission : parseFloat(String(initialCommission));
        if (!isNaN(parsed)) {
          setCommissionRate(parsed.toFixed(1));
        }
      }
    }
  }, [open, restaurantId, initialCommission]);

  // When user picks another restaurant from the dropdown, auto-populate its commission rate
  const handleRestaurantSelectChange = (newId: string) => {
    setSelectedStoreId(newId);
    if (newId === '__ALL_STORES__') {
      return;
    }
    const store = availableStores.find((s) => s.id === newId);
    if (store && store.commissionRate) {
      setCommissionRate(store.commissionRate.toFixed(1));
    }
  };

  const selectedStore = availableStores.find((s) => s.id === selectedStoreId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(commissionRate);
    const deliveryRateNum = parseFloat(deliveryCommissionRate);

    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setError('Food commission rate must be a valid number between 0% and 100%.');
      return;
    }
    if (isNaN(deliveryRateNum) || deliveryRateNum < 0 || deliveryRateNum > 100) {
      setError('Delivery commission rate must be a valid number between 0% and 100%.');
      return;
    }

    setError(null);
    const isAll = selectedStoreId === '__ALL_STORES__';
    const targetInfo: SelectedRestaurantTarget = {
      id: isAll ? 'ALL' : selectedStoreId,
      name: isAll ? 'All Registered Stores' : (selectedStore?.name || restaurantName),
      isAllStores: isAll,
    };

    onSave(
      {
        commissionPct: rateNum,
        deliveryCommissionPct: deliveryRateNum,
        commissionModel,
        payoutFrequency,
        contractType,
        tcsDeductionEnabled,
        effectiveFrom: new Date().toISOString().split('T')[0],
      },
      targetInfo
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Commission & Settlement Settings"
      aria-label="Restaurant Commission Settings Modal"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Store Identifier / Preview */}
        {!showRestaurantSelector ? (
          <div style={{ backgroundColor: '#F4F4F5', padding: '12px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>
              {restaurantName || 'Restaurant'}
            </div>
            <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace', marginTop: 2 }}>
              ID: {restaurantId}
            </div>
          </div>
        ) : (
          <>
            {/* Registered Restaurant Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#09090B' }}>
                Select Registered Restaurant
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => handleRestaurantSelectChange(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E4E4E7',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#09090B',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <optgroup label="Single Store Selection">
                  {availableStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.zone ? `(${store.zone})` : ''} — Current: {store.commissionRate}% [{store.status}]
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bulk Operation">
                  <option value="__ALL_STORES__">
                    ✦ Apply to All Registered Stores (Global Bulk Update)
                  </option>
                </optgroup>
              </select>
            </div>

            {/* Selected Store Badge / Information Preview */}
            <div style={{ backgroundColor: '#F4F4F5', padding: '12px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>
                    {selectedStoreId === '__ALL_STORES__' ? 'All Registered Restaurants' : (selectedStore?.name || restaurantName)}
                  </div>
                  <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace', marginTop: 2 }}>
                    {selectedStoreId === '__ALL_STORES__' ? 'Scope: Multi-Vendor Platform Wide' : `ID: ${selectedStoreId}`}
                  </div>
                </div>
                {selectedStore && selectedStoreId !== '__ALL_STORES__' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      color: '#09090B',
                      border: '1px solid #E4E4E7',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {selectedStore.zone} · {selectedStore.status}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: 8, padding: '10px 14px', color: '#991B1B', fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>
              Food Commission Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                fontSize: 13,
                fontWeight: 700,
                color: '#09090B',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>
              Delivery Split Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={deliveryCommissionRate}
              onChange={(e) => setDeliveryCommissionRate(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                fontSize: 13,
                fontWeight: 700,
                color: '#09090B',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>
              Commission Structure
            </label>
            <select
              value={commissionModel}
              onChange={(e) => setCommissionModel(e.target.value as any)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                fontSize: 13,
                color: '#09090B',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="PERCENTAGE">Percentage Per Order (%)</option>
              <option value="FLAT_FEE">Flat ₹ Fee per Order</option>
              <option value="HYBRID">Hybrid (Base % + Fixed Fee)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>
              Payout Settlement Cycle
            </label>
            <select
              value={payoutFrequency}
              onChange={(e) => setPayoutFrequency(e.target.value as any)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                fontSize: 13,
                color: '#09090B',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="WEEKLY">Weekly (Every Monday)</option>
              <option value="BI_WEEKLY">Bi-Weekly (1st & 15th)</option>
              <option value="MONTHLY">Monthly End</option>
              <option value="INSTANT">Instant Daily Auto-Settlement</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>
            Contract Agreement Tier
          </label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as any)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              fontSize: 13,
              color: '#09090B',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="STANDARD_PLATFORM">Standard Marketplace Agreement (15%)</option>
            <option value="CUSTOM_PARTNER">Custom Key Merchant Contract</option>
            <option value="PROMOTIONAL">Promotional Early Onboarding Tier (10%)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <input
            type="checkbox"
            id="tcs-toggle"
            checked={tcsDeductionEnabled}
            onChange={(e) => setTcsDeductionEnabled(e.target.checked)}
            disabled={loading}
            style={{ width: 16, height: 16, accentColor: '#0284C7' }}
          />
          <label htmlFor="tcs-toggle" style={{ fontSize: 13, color: '#0C4A6E', fontWeight: 600, cursor: 'pointer' }}>
            Auto-deduct 1% TCS & statutory GST on payouts
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            {loading ? 'Saving...' : 'Save Commission Settings'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
