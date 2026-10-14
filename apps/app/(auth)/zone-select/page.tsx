'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetAvailableZonesQuery,
  useSelectOperatingZoneMutation,
  type OperatingZone,
} from '@/api/endpoints/zoneApi';

export default function ZoneSelectPage() {
  const router = useRouter();
  const {
    data: zones = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAvailableZonesQuery();

  const [selectZone, { isLoading: isSubmitting }] = useSelectOperatingZoneMutation();
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restrict to Bangalore Zone and Tumkur Zone
  const approvedZones = React.useMemo(() => {
    const list: OperatingZone[] = [];
    const bgl = zones.find(
      (z) =>
        (z.id === 'dz-bangalore' || z.zoneName.toLowerCase() === 'bangalore zone') &&
        z.zoneName.toLowerCase() !== 'bengaluru zone'
    );
    const tmk = zones.find(
      (z) =>
        (z.id === 'dz-tumkur' || z.zoneName.toLowerCase() === 'tumkur zone') &&
        z.zoneName.toLowerCase() !== 'tumkur zone 1'
    );

    list.push(
      bgl
        ? { ...bgl, id: 'dz-bangalore', zoneName: 'Bangalore Zone', cityName: 'Bangalore' }
        : {
            id: 'dz-bangalore',
            zoneName: 'Bangalore Zone',
            cityName: 'Bangalore',
            latitude: 12.9716,
            longitude: 77.5946,
            radiusKm: 25.0,
            status: 'ACTIVE',
            restaurantEnabled: true,
            deliveryPartnerEnabled: true,
            customerOrderingEnabled: true,
            activeDrivers: 45,
          }
    );

    list.push(
      tmk
        ? { ...tmk, id: 'dz-tumkur', zoneName: 'Tumkur Zone', cityName: 'Tumkur' }
        : {
            id: 'dz-tumkur',
            zoneName: 'Tumkur Zone',
            cityName: 'Tumkur',
            latitude: 13.3379,
            longitude: 77.1173,
            radiusKm: 20.0,
            status: 'ACTIVE',
            restaurantEnabled: true,
            deliveryPartnerEnabled: true,
            customerOrderingEnabled: true,
            activeDrivers: 22,
          }
    );

    return list;
  }, [zones]);

  // Auto-select first active zone if only one or if previously selected in storage
  useEffect(() => {
    if (approvedZones.length > 0 && !selectedZoneId) {
      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem('foodie_active_zone_id') ||
            sessionStorage.getItem('foodie_active_zone_id')
          : null;
      if (stored && approvedZones.some((z) => z.id === stored)) {
        setSelectedZoneId(stored);
      } else {
        setSelectedZoneId(approvedZones[0].id);
      }
    }
  }, [approvedZones, selectedZoneId]);

  const handleContinue = async () => {
    if (!selectedZoneId) {
      setSubmitError('Please select an operating zone to proceed.');
      return;
    }

    setSubmitError(null);
    try {
      const selected = approvedZones.find((z) => z.id === selectedZoneId);
      const res = await selectZone({ zoneId: selectedZoneId }).unwrap();

      const zoneName = res.zoneName || selected?.zoneName || 'Operating Zone';

      if (typeof window !== 'undefined') {
        localStorage.setItem('foodie_active_zone_id', selectedZoneId);
        sessionStorage.setItem('foodie_active_zone_id', selectedZoneId);
        localStorage.setItem('foodie_active_zone_name', zoneName);
        sessionStorage.setItem('foodie_active_zone_name', zoneName);
        // Also set document cookie for immediate client availability
        document.cookie = `foodie_active_zone_id=${encodeURIComponent(
          selectedZoneId
        )}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `foodie_active_zone_name=${encodeURIComponent(
          zoneName
        )}; path=/; max-age=86400; SameSite=Lax`;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const payload = err as { data?: { error?: { message?: string } }; error?: string };
      setSubmitError(
        payload?.data?.error?.message ||
          payload?.error ||
          'Failed to validate and bind operating zone. Please try again.'
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Brand Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            padding: '28px 32px 24px',
            color: '#FFFFFF',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              marginBottom: 14,
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            {/* Compass / Location icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </div>

          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            Select Your Operating Zone
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#E3F2FD',
              lineHeight: 1.5,
            }}
          >
            Choose the zone you want to manage in Foodie Admin.
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 32px 32px' }}>
          {/* Error Message */}
          {submitError && (
            <div
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#E5E7EB',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: '45%',
                        height: 16,
                        backgroundColor: '#E5E7EB',
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        width: '30%',
                        height: 12,
                        backgroundColor: '#E5E7EB',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Loading State */}
          {isError && !isLoading && (
            <div
              style={{
                padding: '24px',
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 12px 0', color: '#991B1B', fontWeight: 600, fontSize: '0.925rem' }}>
                Failed to load operating zones from backend
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  backgroundColor: '#2196F3',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry Loading Zones
              </button>
            </div>
          )}

          {/* Empty Zones State */}
          {!isLoading && !isError && approvedZones.length === 0 && (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: '#6B7280',
                border: '1px dashed #D1D5DB',
                borderRadius: 12,
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#374151' }}>
                No Active Zones Available
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Contact platform administrators to configure active delivery zones.
              </p>
            </div>
          )}

          {/* Zones List */}
          {!isLoading && !isError && approvedZones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {approvedZones.map((zone: OperatingZone) => {
                const isSelected = selectedZoneId === zone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    style={{
                      padding: '18px 20px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #2196F3' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isSelected
                        ? '0 0 0 3px rgba(33, 150, 243, 0.15)'
                        : '0 1px 3px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Radio Circle */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #2196F3' : '2px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                      />

                      {/* Details */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: isSelected ? '#0369A1' : '#111827',
                            }}
                          >
                            {zone.zoneName}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: '#22C55E',
                              }}
                            />
                            Active
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: '0.8rem',
                            color: '#6B7280',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {zone.cityName || 'Karnataka'}
                          </span>

                          {zone.radiusKm != null && (
                            <span>• Radius: {zone.radiusKm} km</span>
                          )}

                          {zone.activeDrivers != null && (
                            <span>• {zone.activeDrivers} Drivers</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Check icon indicator */}
                    {isSelected && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: '#2196F3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              disabled={isSubmitting || isLoading || zones.length === 0 || !selectedZoneId}
              onClick={handleContinue}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                backgroundColor:
                  isSubmitting || isLoading || zones.length === 0 || !selectedZoneId
                    ? '#93C5FD'
                    : '#2196F3',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor:
                  isSubmitting || isLoading || zones.length === 0 || !selectedZoneId
                    ? 'not-allowed'
                    : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background-color 0.15s ease',
                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg
                    style={{ animation: 'spin 1s linear infinite' }}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Validating Zone Access...</span>
                </>
              ) : (
                <>
                  <span>Continue to Admin Panel</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
