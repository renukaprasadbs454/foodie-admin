'use client';

import React, { useEffect, useState } from 'react';
import { trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import Select from 'react-select';
import { State, City } from 'country-state-city';
import {
  useGetZonesQuery,
  useCreateZoneMutation,
  useUpdateZoneTogglesMutation,
  useUpdateZoneStatusMutation,
  useDeleteZoneMutation,
  useGetCitiesQuery,
  useCreateCityMutation,
  useUpdateCityStatusMutation,
  useDeleteCityMutation,
  useGetUnserviceableRequestsQuery,
  useCreateUnserviceableRequestMutation,
  useApproveUnserviceableRequestMutation,
  useGetServiceAreasQuery,
  useGetDeliveryChargesQuery,
  useUpdateDeliveryChargesMutation,
  useGetRadiusSettingsQuery,
  useUpdateRadiusSettingsMutation,
} from '../../../api/endpoints/locationApi';
import type {
  CityDto,
  ServiceAreaDto,
  LocationZoneDto,
  UnserviceableRequestDto,
} from '../../../api/endpoints/locationApi';

export type CityRecord = CityDto;
export type ServiceAreaRecord = ServiceAreaDto;
export type DeliveryZoneRecord = LocationZoneDto;
export type UnserviceableRequestRecord = UnserviceableRequestDto;

type LocationTab = 'CITIES' | 'SERVICE_AREAS' | 'DELIVERY_ZONES' | 'UNSERVICEABLE_REQUESTS' | 'DELIVERY_CHARGES' | 'RADIUS_SETTINGS';

interface GoogleMapsPolygonPinPickerProps {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  polygonString: string;
  onChangePolygon: (newPolygonStr: string) => void;
  title?: string;
}

export function GoogleMapsPolygonPinPicker({
  centerLat,
  centerLng,
  radiusKm,
  polygonString,
  onChangePolygon,
  title = 'Google Maps Interactive Polygon Pin Picker',
}: GoogleMapsPolygonPinPickerProps) {
  const [mapTheme, setMapTheme] = useState<'VECTOR' | 'SATELLITE' | 'HYBRID'>('VECTOR');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [hoveredPinIndex, setHoveredPinIndex] = useState<number | null>(null);

  const parsePins = (str: string) => {
    if (!str || !str.trim()) return [];
    const parts = str.split('|').map((p) => p.trim()).filter(Boolean);
    const pins: { id: string; lat: number; lng: number }[] = [];
    parts.forEach((pt, idx) => {
      const coords = pt.split(',').map((c) => parseFloat(c.trim()));
      if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        pins.push({ id: `pin-${idx}-${coords[0]}-${coords[1]}`, lat: coords[0], lng: coords[1] });
      }
    });
    return pins;
  };

  const currentPins = parsePins(polygonString);

  const stringifyPins = (pins: { lat: number; lng: number }[]) => {
    return pins.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(' | ');
  };

  const handleAddPin = (lat: number, lng: number) => {
    const updated = [...currentPins, { id: `pin-${Date.now()}-${lat}-${lng}`, lat, lng }];
    onChangePolygon(stringifyPins(updated));
  };

  const handleRemovePin = (index: number) => {
    const updated = currentPins.filter((_, i) => i !== index);
    onChangePolygon(stringifyPins(updated));
  };

  const handleClearAll = () => {
    onChangePolygon('');
  };

  const handleAutoPreset = (preset: 'CENTER' | '4POINT' | '6POINT') => {
    const offset = (radiusKm || 5.0) / 111.0;
    if (preset === 'CENTER') {
      onChangePolygon(`${centerLat.toFixed(4)},${centerLng.toFixed(4)}`);
    } else if (preset === '4POINT') {
      const p1 = `${(centerLat + offset).toFixed(4)},${centerLng.toFixed(4)}`;
      const p2 = `${centerLat.toFixed(4)},${(centerLng + offset).toFixed(4)}`;
      const p3 = `${(centerLat - offset).toFixed(4)},${centerLng.toFixed(4)}`;
      const p4 = `${centerLat.toFixed(4)},${(centerLng - offset).toFixed(4)}`;
      onChangePolygon(`${p1} | ${p2} | ${p3} | ${p4}`);
    } else if (preset === '6POINT') {
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        const pLat = centerLat + offset * Math.sin(angle);
        const pLng = centerLng + offset * Math.cos(angle);
        points.push(`${pLat.toFixed(4)},${pLng.toFixed(4)}`);
      }
      onChangePolygon(points.join(' | '));
    }
  };

  const handleManualAdd = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      handleAddPin(lat, lng);
      setManualLat('');
      setManualLng('');
    }
  };

  const getSvgCoords = (pLat: number, pLng: number) => {
    const latSpan = ((radiusKm || 5.0) / 111.0) * 2.8;
    const lngSpan = latSpan / Math.max(0.1, Math.cos((centerLat * Math.PI) / 180));
    const xPct = 50 + ((pLng - centerLng) / lngSpan) * 100;
    const yPct = 50 - ((pLat - centerLat) / latSpan) * 100;
    return {
      x: Math.max(8, Math.min(92, xPct)),
      y: Math.max(8, Math.min(92, yPct)),
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const normX = (clickX / rect.width - 0.5) * 2;
    const normY = (0.5 - clickY / rect.height) * 2;

    const latSpan = ((radiusKm || 5.0) / 111.0) * 1.4;
    const lngSpan = latSpan / Math.max(0.1, Math.cos((centerLat * Math.PI) / 180));

    const clickedLat = parseFloat((centerLat + normY * latSpan).toFixed(4));
    const clickedLng = parseFloat((centerLng + normX * lngSpan).toFixed(4));

    handleAddPin(clickedLat, clickedLng);
  };

  const svgPolygonPoints = currentPins.map((p) => {
    const coords = getSvgCoords(p.lat, p.lng);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Click anywhere on the interactive map canvas below to drop pins and dynamically construct the polygon boundary.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
            {(['VECTOR', 'SATELLITE', 'HYBRID'] as const).map((thm) => (
              <button
                key={thm}
                type="button"
                onClick={() => setMapTheme(thm)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: mapTheme === thm ? '#2196F3' : 'transparent',
                  color: mapTheme === thm ? '#FFFFFF' : '#6B7280',
                  boxShadow: mapTheme === thm ? '0 1px 3px rgba(33, 150, 243, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {thm === 'VECTOR' ? 'Vector' : thm === 'SATELLITE' ? 'Satellite' : 'Hybrid'}
              </button>
            ))}
          </div>

          <span
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#E3F2FD',
              color: '#2196F3',
            }}
          >
            {currentPins.length} Pins Placed
          </span>
        </div>
      </div>

      {/* Interactive Google Maps Grid Canvas */}
      <div
        onClick={handleMapClick}
        style={{
          position: 'relative',
          height: 320,
          borderRadius: 14,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          cursor: 'crosshair',
          backgroundColor: mapTheme === 'SATELLITE' ? '#0F172A' : mapTheme === 'HYBRID' ? '#1E293B' : '#F8FAFC',
          backgroundImage:
            mapTheme === 'VECTOR'
              ? 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)'
              : 'radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5, background: 'rgba(17, 24, 39, 0.75)', color: '#FFFFFF', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)' }}>
          Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)} (Scale: {radiusKm} KM Circle)
        </div>

        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#111827', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Click Canvas to Drop Pin
        </div>

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 16,
            height: 16,
            marginLeft: -8,
            marginTop: -8,
            border: '2px dashed #2196F3',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
          <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#2196F3" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
        </svg>

        {currentPins.length >= 2 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
            <polygon
              points={svgPolygonPoints}
              fill="rgba(33, 150, 243, 0.15)"
              stroke="#2196F3"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {currentPins.map((pin, idx) => {
          const coords = getSvgCoords(pin.lat, pin.lng);
          const isHovered = hoveredPinIndex === idx;

          return (
            <div
              key={pin.id || idx}
              style={{
                position: 'absolute',
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: isHovered ? 20 : 10,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              title={`Pin #${idx + 1}: ${pin.lat}, ${pin.lng}`}
              onMouseEnter={() => setHoveredPinIndex(idx)}
              onMouseLeave={() => setHoveredPinIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePin(idx);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    background: '#111827',
                    color: '#FFFFFF',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    marginBottom: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  Pin #{idx + 1}
                </div>

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50% 50% 50% 0',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    transform: 'rotate(-45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.4)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transform: 'rotate(45deg)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Pin Action Presets Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          backgroundColor: '#F9FAFB',
          padding: 12,
          borderRadius: 12,
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Quick Pin Presets:</span>

          <button
            type="button"
            onClick={() => handleAutoPreset('CENTER')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Drop Pin at Center
          </button>

          <button
            type="button"
            onClick={() => handleAutoPreset('4POINT')}
            style={{
              padding: '6px 12px',
              background: '#2196F3',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Auto 4-Point Square Pins
          </button>

          <button
            type="button"
            onClick={() => handleAutoPreset('6POINT')}
            style={{
              padding: '6px 12px',
              background: '#2196F3',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Auto 6-Point Hexagon Pins
          </button>

          {currentPins.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear All ({currentPins.length})
            </button>
          )}
        </div>

        {/* Manual Lat/Lng Add Form */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            step="0.0001"
            placeholder="Lat (12.97)"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            style={{ width: 100, padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, backgroundColor: '#FFFFFF', color: '#111827' }}
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Lng (77.59)"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            style={{ width: 100, padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, backgroundColor: '#FFFFFF', color: '#111827' }}
          />
          <button
            type="button"
            onClick={handleManualAdd}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Pin
          </button>
        </div>
      </div>

      {/* Pins Cards List */}
      {currentPins.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Coordinates List ({currentPins.length} points):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {currentPins.map((pin, idx) => (
              <div
                key={pin.id || idx}
                onMouseEnter={() => setHoveredPinIndex(idx)}
                onMouseLeave={() => setHoveredPinIndex(null)}
                style={{
                  backgroundColor: hoveredPinIndex === idx ? '#F3F4F6' : '#FFFFFF',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: hoveredPinIndex === idx ? '1px solid #9CA3AF' : '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>
                    Pin #{idx + 1}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePin(idx)}
                  title="Remove this pin"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#6B7280',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 10, border: '1px dashed #E5E7EB', fontSize: 12, color: '#6B7280' }}>
          No polygon pins dropped yet. Click anywhere on the map above or click "Auto 4-Point Square Pins" to place boundary markers.
        </div>
      )}
    </div>
  );
}

export function LocationManagementPage() {
  const { tokens } = useTheme();
  const [activeTab, setActiveTab] = useState<LocationTab>('DELIVERY_ZONES');

  // Real backend queries
  const { data: dbCities = [], isLoading: isLoadingCities, isError: isErrorCities, refetch: refetchCities } = useGetCitiesQuery();
  const [createCity] = useCreateCityMutation();
  const { data: dbDeliveryZones = [], isLoading: isLoadingZones, isError: isErrorZones, refetch: refetchZones } = useGetZonesQuery();
  const [createZone] = useCreateZoneMutation();
  const [updateZoneToggles] = useUpdateZoneTogglesMutation();
  const [updateZoneStatus] = useUpdateZoneStatusMutation();
  const [deleteZone] = useDeleteZoneMutation();
  const [updateCityStatus] = useUpdateCityStatusMutation();
  const [deleteCity] = useDeleteCityMutation();

  const { data: dbUnserviceableRequests = [], isLoading: isLoadingReqs, isError: isErrorReqs, refetch: refetchReqs } = useGetUnserviceableRequestsQuery();
  const [createUnserviceableRequest] = useCreateUnserviceableRequestMutation();
  const [approveUnserviceableRequest] = useApproveUnserviceableRequestMutation();

  const { data: dbServiceAreas = [], isLoading: isLoadingAreas, isError: isErrorAreas, refetch: refetchAreas } = useGetServiceAreasQuery();

  const { data: dbDeliveryCharges, isLoading: isLoadingCharges } = useGetDeliveryChargesQuery();
  const [updateDeliveryCharges] = useUpdateDeliveryChargesMutation();

  const { data: dbRadiusSettings, isLoading: isLoadingRadius } = useGetRadiusSettingsQuery();
  const [updateRadiusSettings] = useUpdateRadiusSettingsMutation();

  const cities = dbCities as CityRecord[];
  const deliveryZones = dbDeliveryZones as DeliveryZoneRecord[];
  const unserviceableRequests = dbUnserviceableRequests as UnserviceableRequestRecord[];
  const serviceAreas = dbServiceAreas as ServiceAreaRecord[];

  const pendingRequestsCount = unserviceableRequests.filter((r) => r.status === 'PENDING').length;

  const [newCityName, setNewCityName] = useState('');
  const [newState, setNewState] = useState('');
  const [newStateIsoCode, setNewStateIsoCode] = useState('');

  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCity, setNewZoneCity] = useState('');

  const [newLat, setNewLat] = useState('12.9716');
  const [newLng, setNewLng] = useState('77.5946');
  const [newRadiusKm, setNewRadiusKm] = useState('10.0');
  const [newPolygon, setNewPolygon] = useState('12.9716,77.5946 | 12.9800,77.6000 | 12.9600,77.6100');
  const [newRestEnabled, setNewRestEnabled] = useState(true);
  const [newDriverEnabled, setNewDriverEnabled] = useState(true);
  const [newCustomerEnabled, setNewCustomerEnabled] = useState(true);
  const [editingZoneMap, setEditingZoneMap] = useState<DeliveryZoneRecord | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqRestName, setReqRestName] = useState('');
  const [reqContactPerson, setReqContactPerson] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [reqCity, setReqCity] = useState('Bangalore');
  const [reqLat, setReqLat] = useState('12.9698');
  const [reqLng, setReqLng] = useState('77.7499');

  // Delivery Charges local form state
  const [baseCharge, setBaseCharge] = useState('35');
  const [baseDistanceKm, setBaseDistanceKm] = useState('3');
  const [additionalChargePerKm, setAdditionalChargePerKm] = useState('10');
  const [freeDeliveryMinOrder, setFreeDeliveryMinOrder] = useState('499');
  const [nightSurcharge, setNightSurcharge] = useState('25');
  const [surgeMultiplier, setSurgeMultiplier] = useState('1.15');

  // Radius Settings local form state
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState('15');
  const [customerSearchRadius, setCustomerSearchRadius] = useState('10');
  const [driverDispatchRadius, setDriverDispatchRadius] = useState('5');
  const [distanceCalculationMode, setDistanceCalculationMode] = useState<'GPS_ROAD' | 'HAVERSINE'>('GPS_ROAD');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent('admin_location_management_viewed', {});
  }, []);

  useEffect(() => {
    if (dbDeliveryCharges) {
      setBaseCharge(String(dbDeliveryCharges.baseCharge));
      setBaseDistanceKm(String(dbDeliveryCharges.baseDistanceKm));
      setAdditionalChargePerKm(String(dbDeliveryCharges.additionalChargePerKm));
      setFreeDeliveryMinOrder(String(dbDeliveryCharges.freeDeliveryMinOrder));
      setNightSurcharge(String(dbDeliveryCharges.nightSurcharge));
      setSurgeMultiplier(String(dbDeliveryCharges.surgeMultiplier));
    }
  }, [dbDeliveryCharges]);

  useEffect(() => {
    if (dbRadiusSettings) {
      setMaxDeliveryRadius(String(dbRadiusSettings.maxDeliveryRadius));
      setCustomerSearchRadius(String(dbRadiusSettings.customerSearchRadius));
      setDriverDispatchRadius(String(dbRadiusSettings.driverDispatchRadius));
      setDistanceCalculationMode(dbRadiusSettings.distanceCalculationMode);
    }
  }, [dbRadiusSettings]);

  useEffect(() => {
    if (cities.length > 0 && !cities.some(c => c.cityName === newZoneCity)) {
      const targetCity = cities[0].cityName;
      setNewZoneCity(targetCity);
    }
  }, [cities, newZoneCity]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCityMapUpdate = async (selectedCity: string) => {
    const predefined: Record<string, { lat: string, lng: string }> = {
      'Bangalore': { lat: '12.9716', lng: '77.5946' },
      'Mumbai': { lat: '19.0760', lng: '72.8777' },
      'Delhi-NCR': { lat: '28.6139', lng: '77.2090' },
      'Hyderabad': { lat: '17.3850', lng: '78.4867' },
    };

    if (predefined[selectedCity]) {
      const p = predefined[selectedCity];
      setNewLat(p.lat);
      setNewLng(p.lng);
      setNewPolygon('');
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(selectedCity)},India&format=json&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat).toFixed(4);
          const lon = parseFloat(data[0].lon).toFixed(4);
          setNewLat(lat);
          setNewLng(lon);
          setNewPolygon('');
          showToast(`Map centered to ${selectedCity}!`);
        }
      }
    } catch (e) {
      console.error('City Geocoding Error', e);
    }
  };

  const handleToggleZonePower = (zoneId: string, powerType: 'RESTAURANT' | 'DRIVER' | 'CUSTOMER') => {
    const activeZone = deliveryZones.find(z => z.id === zoneId);
    if (!activeZone) return;

    if (powerType === 'RESTAURANT') {
      void updateZoneToggles({ id: zoneId, restaurantEnabled: !activeZone.restaurantEnabled });
    }
    if (powerType === 'DRIVER') {
      void updateZoneToggles({ id: zoneId, deliveryPartnerEnabled: !activeZone.deliveryPartnerEnabled });
    }
    if (powerType === 'CUSTOMER') {
      void updateZoneToggles({ id: zoneId, customerOrderingEnabled: !activeZone.customerOrderingEnabled });
    }
    showToast(`Zone permission updated for ${powerType}.`);
  };

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      alert('Please enter a Zone Name');
      return;
    }
    createZone({
      zoneName: newZoneName.trim(),
      cityName: newZoneCity || (cities[0]?.cityName ?? 'Bangalore'),
      latitude: parseFloat(newLat) || 12.9716,
      longitude: parseFloat(newLng) || 77.5946,
      radiusKm: parseFloat(newRadiusKm) || 5.0,
      polygonCoordinates: newPolygon.trim(),
      activeDrivers: 0,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      restaurantEnabled: newRestEnabled,
      deliveryPartnerEnabled: newDriverEnabled,
      customerOrderingEnabled: newCustomerEnabled,
    }).unwrap().then(() => {
      setIsCreatingZone(false);
      showToast(`Multi-Zone "${newZoneName.trim()}" created successfully in database!`);
      setNewZoneName('');
    }).catch((err) => {
      showToast(`Failed to create zone: ${err?.data?.message || err?.message || 'Server Error'}`);
    });
  };

  const handleSubmitUnserviceableRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqRestName.trim() || !reqAddress.trim()) {
      alert('Please enter restaurant name and address');
      return;
    }
    createUnserviceableRequest({
      restaurantName: reqRestName.trim(),
      contactPerson: reqContactPerson.trim() || 'Restaurant Manager',
      contactEmail: reqEmail.trim() || 'contact@restaurant.com',
      contactPhone: reqPhone.trim() || '+91 98000 00000',
      address: reqAddress.trim(),
      cityName: reqCity,
      latitude: parseFloat(reqLat) || 12.9716,
      longitude: parseFloat(reqLng) || 77.5946,
      status: 'PENDING',
    }).unwrap().then(() => {
      setShowRequestModal(false);
      setReqRestName('');
      setReqAddress('');
      showToast(`Unserviceable restaurant request submitted to backend database!`);
    }).catch((err) => {
      showToast(`Failed to submit request: ${err?.data?.message || err?.message || 'Server Error'}`);
    });
  };

  const handleApproveRequestAndCreateZone = (req: UnserviceableRequestRecord) => {
    approveUnserviceableRequest(req.id).unwrap().then(() => {
      showToast(`Approved request and created new active Multi-Zone for ${req.restaurantName}!`);
    }).catch((err) => {
      showToast(`Approval failed: ${err?.data?.message || err?.message || 'Server Error'}`);
    });
  };

  const handleSaveDeliveryCharges = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeliveryCharges({
      baseCharge: parseFloat(baseCharge) || 35,
      baseDistanceKm: parseFloat(baseDistanceKm) || 3,
      additionalChargePerKm: parseFloat(additionalChargePerKm) || 10,
      freeDeliveryMinOrder: parseFloat(freeDeliveryMinOrder) || 499,
      nightSurcharge: parseFloat(nightSurcharge) || 25,
      surgeMultiplier: parseFloat(surgeMultiplier) || 1.15,
    }).unwrap().then(() => {
      showToast('Delivery charge parameters persisted to database!');
    }).catch((err) => {
      showToast(`Failed to save delivery charges: ${err?.data?.message || err?.message || 'Server Error'}`);
    });
  };

  const handleSaveRadiusSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateRadiusSettings({
      maxDeliveryRadius: parseFloat(maxDeliveryRadius) || 15,
      customerSearchRadius: parseFloat(customerSearchRadius) || 10,
      driverDispatchRadius: parseFloat(driverDispatchRadius) || 5,
      distanceCalculationMode,
    }).unwrap().then(() => {
      showToast('Radius settings persisted to backend database!');
    }).catch((err) => {
      showToast(`Failed to save radius settings: ${err?.data?.message || err?.message || 'Server Error'}`);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            backgroundColor: '#111827',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            border: '1px solid #374151',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Multi-Zone & Location Operations
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Create polygon and radius zones, manage 3-way permissions (Restaurants, Drivers, Customers) & review location requests
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            + Request Unserviceable Location
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingZone(true)}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            + Create Multi-Zone
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          backgroundColor: '#FFFFFF',
          padding: 6,
          borderRadius: 14,
          border: '1px solid #E5E7EB',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'DELIVERY_ZONES', label: `Delivery Multi-Zones (${deliveryZones.length})` },
          { id: 'UNSERVICEABLE_REQUESTS', label: `Unserviceable Requests (${pendingRequestsCount} Pending)` },
          { id: 'CITIES', label: `Cities (${cities.length})` },
          { id: 'SERVICE_AREAS', label: `Service Areas (${serviceAreas.length})` },
          { id: 'DELIVERY_CHARGES', label: 'Delivery Charges' },
          { id: 'RADIUS_SETTINGS', label: 'Radius Settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as LocationTab)}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: isActive ? '#E3F2FD' : 'transparent',
                color: isActive ? '#2196F3' : '#6B7280',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* MULTI-ZONE CREATION DRAWER */}
      {isCreatingZone && (
        <form
          onSubmit={handleCreateZone}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              Create Multi-Zone & 3-Way Power Switches
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingZone(false)}
              style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Zone Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Whitefield Tech Corridor"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                City
              </label>
              <select
                value={newZoneCity}
                onChange={(e) => {
                  setNewZoneCity(e.target.value);
                  void handleCityMapUpdate(e.target.value);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.cityName}>
                    {c.cityName} ({c.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Operational Radius (KM)
              </label>
              <input
                type="number"
                step="0.5"
                value={newRadiusKm}
                onChange={(e) => setNewRadiusKm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Center Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Center Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Polygon Boundary Coordinates String (lat1,lng1 | lat2,lng2 | ...)
              </label>
              <input
                type="text"
                value={newPolygon}
                onChange={(e) => setNewPolygon(e.target.value)}
                placeholder="e.g. 12.9716,77.5946 | 12.9800,77.6000 | 12.9600,77.6100"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'monospace', backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>
          </div>

          <GoogleMapsPolygonPinPicker
            centerLat={parseFloat(newLat) || 12.9716}
            centerLng={parseFloat(newLng) || 77.5946}
            radiusKm={parseFloat(newRadiusKm) || 5.0}
            polygonString={newPolygon}
            onChangePolygon={(str) => setNewPolygon(str)}
            title="Interactive Multi-Zone Pin Picker & Polygon Builder"
          />

          {/* 3-WAY POWER SWITCHES */}
          <div style={{ backgroundColor: '#F9FAFB', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              Service Power Switches (Enable / Disable per Zone)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Restaurant Onboarding</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Allow restaurants to register & accept orders</div>
                </div>
                <input
                  type="checkbox"
                  checked={newRestEnabled}
                  onChange={(e) => setNewRestEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2196F3' }}
                />
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Delivery Partner Dispatch</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Allow driver fleet dispatch & payouts</div>
                </div>
                <input
                  type="checkbox"
                  checked={newDriverEnabled}
                  onChange={(e) => setNewDriverEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2196F3' }}
                />
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Customer Ordering</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Allow customers to place food orders</div>
                </div>
                <input
                  type="checkbox"
                  checked={newCustomerEnabled}
                  onChange={(e) => setNewCustomerEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2196F3' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsCreatingZone(false)}
              style={{ padding: '10px 18px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
            >
              Create Multi-Zone Now
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: DELIVERY MULTI-ZONES TABLE */}
      {activeTab === 'DELIVERY_ZONES' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          {isLoadingZones ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
              Loading delivery multi-zones from database...
            </div>
          ) : isErrorZones ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#DC2626' }}>
              <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>Failed to load delivery zones.</p>
              <button onClick={() => void refetchZones()} style={{ padding: '6px 14px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : deliveryZones.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
              No delivery multi-zones recorded in database yet. Click "+ Create Multi-Zone" to add one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Zone & Map Center</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage Radius</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>3-Way Service Switches</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Surge Multiplier</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveryZones.map((dz) => (
                  <tr key={dz.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{dz.zoneName}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        Lat: {dz.latitude}, Lng: {dz.longitude}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#374151' }}>{dz.cityName}</td>

                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>
                      {dz.radiusKm} KM Circle
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleZonePower(dz.id, 'RESTAURANT')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: dz.restaurantEnabled ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                            background: dz.restaurantEnabled ? '#F0FDF4' : '#F9FAFB',
                            color: dz.restaurantEnabled ? '#15803D' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span>Restaurant Service:</span>
                          <span>{dz.restaurantEnabled ? 'ON' : 'OFF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleZonePower(dz.id, 'DRIVER')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: dz.deliveryPartnerEnabled ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                            background: dz.deliveryPartnerEnabled ? '#F0FDF4' : '#F9FAFB',
                            color: dz.deliveryPartnerEnabled ? '#15803D' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span>Driver Dispatch:</span>
                          <span>{dz.deliveryPartnerEnabled ? 'ON' : 'OFF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleZonePower(dz.id, 'CUSTOMER')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: dz.customerOrderingEnabled ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                            background: dz.customerOrderingEnabled ? '#F0FDF4' : '#F9FAFB',
                            color: dz.customerOrderingEnabled ? '#15803D' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span>Customer Ordering:</span>
                          <span>{dz.customerOrderingEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>
                      {dz.surgeMultiplier}x
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: dz.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                          color: dz.status === 'ACTIVE' ? '#15803D' : '#991B1B',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {dz.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setEditingZoneMap(dz)}
                        style={{
                          padding: '6px 12px',
                          background: '#FFFFFF',
                          color: '#2196F3',
                          border: '1px solid #2196F3',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Edit Pins ({dz.polygonCoordinates ? dz.polygonCoordinates.split('|').length : 0})
                      </button>
                      <button onClick={() => updateZoneStatus({ id: dz.id, status: dz.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).unwrap().then(() => showToast(`Zone status updated to ${dz.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}`))} style={{ padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>{dz.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => { if (confirm('Are you sure you want to permanently delete this zone? This action cannot be undone.')) { deleteZone(dz.id).unwrap().then(() => showToast('Zone deleted permanently.')); } }} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Existing Zone Map Pins Edit Modal */}
      {editingZoneMap && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #E5E7EB', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Boundary Pins — {editingZoneMap.zoneName}
                </h3>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  City: {editingZoneMap.cityName} | Center Lat: {editingZoneMap.latitude}, Lng: {editingZoneMap.longitude}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingZoneMap(null)}
                style={{ padding: '6px 14px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
              >
                Close
              </button>
            </div>

            <GoogleMapsPolygonPinPicker
              centerLat={editingZoneMap.latitude}
              centerLng={editingZoneMap.longitude}
              radiusKm={editingZoneMap.radiusKm}
              polygonString={editingZoneMap.polygonCoordinates}
              onChangePolygon={(str) => {
                setEditingZoneMap((prev) => (prev ? { ...prev, polygonCoordinates: str } : null));
              }}
              title={`Pin Picker — ${editingZoneMap.zoneName}`}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setEditingZoneMap(null);
                  showToast(`Map pin coordinates updated for ${editingZoneMap.zoneName}!`);
                }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
              >
                Save Map Pins & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UNSERVICEABLE REQUESTS */}
      {activeTab === 'UNSERVICEABLE_REQUESTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', padding: 16, borderRadius: 14, color: '#374151', fontSize: 13, fontWeight: 500 }}>
            Restaurants outside existing active zones submit location expansion requests here. Review their map coordinates & convert them into new active Multi-Zones.
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            {isLoadingReqs ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                Loading unserviceable location requests from backend...
              </div>
            ) : isErrorReqs ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#DC2626' }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>Failed to load unserviceable requests.</p>
                <button onClick={() => void refetchReqs()} style={{ padding: '6px 14px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
              </div>
            ) : unserviceableRequests.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                No unserviceable location requests found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurant & Location</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Person</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Map Coordinates</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted Date</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unserviceableRequests.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{req.restaurantName}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{req.address}, {req.cityName}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{req.contactPerson}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{req.contactPhone}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 500, color: '#374151' }}>
                        Lat: {req.latitude}, Lng: {req.longitude}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12 }}>
                        {req.createdAt ? String(req.createdAt).replace('T', ' ').slice(0, 16) : '-'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: req.status === 'PENDING' ? '#FEF3C7' : '#DCFCE7',
                            color: req.status === 'PENDING' ? '#B45309' : '#15803D',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {req.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveRequestAndCreateZone(req)}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                            }}
                          >
                            Approve & Create Zone
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT UNSERVICEABLE LOCATION REQUEST MODAL */}
      {showRequestModal && (
        <form
          onSubmit={handleSubmitUnserviceableRequest}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              Submit Unserviceable Restaurant Expansion Request
            </h3>
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Restaurant Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Punjabi Rasoi"
                value={reqRestName}
                onChange={(e) => setReqRestName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vikram Singh"
                value={reqContactPerson}
                onChange={(e) => setReqContactPerson(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Contact Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={reqPhone}
                onChange={(e) => setReqPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                City
              </label>
              <select
                value={reqCity}
                onChange={(e) => setReqCity(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.cityName}>
                    {c.cityName}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Full Address *
              </label>
              <input
                type="text"
                placeholder="e.g. Shop 12, MG Road Cyber Hub"
                value={reqAddress}
                onChange={(e) => setReqAddress(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Latitude Coordinates
              </label>
              <input
                type="number"
                step="0.0001"
                value={reqLat}
                onChange={(e) => setReqLat(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Longitude Coordinates
              </label>
              <input
                type="number"
                step="0.0001"
                value={reqLng}
                onChange={(e) => setReqLng(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              style={{ padding: '10px 18px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}
            >
              Submit Expansion Request
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: CITIES */}
      {activeTab === 'CITIES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCityName.trim() || !newState.trim()) return;
              const addedCityName = newCityName.trim();
              createCity({
                cityName: addedCityName,
                state: newState.trim(),
                activeZonesCount: 0,
                activeMerchantsCount: 0,
                status: 'ACTIVE',
              })
                .unwrap()
                .then(() => {
                  showToast('City added successfully!');
                  setNewCityName('');
                  setNewState('');
                  setNewStateIsoCode('');
                  if (isCreatingZone) {
                    setNewZoneCity(addedCityName);
                  }
                })
                .catch(() => {
                  showToast(`Failed to establish new city record.`);
                });
            }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              height: 'fit-content',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Operating City</h3>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>State / Region</label>
              <Select
                options={State.getStatesOfCountry('IN').map((s: { isoCode: string; name: string }) => ({ value: s.isoCode, label: s.name }))}
                placeholder="Search State..."
                onChange={(option: { value: string; label: string } | null) => {
                  setNewStateIsoCode(option?.value || '');
                  setNewState(option?.label || '');
                  setNewCityName('');
                }}
                value={newState ? { label: newState, value: newStateIsoCode } : null}
                styles={{ control: (base: Record<string, unknown>) => ({ ...base, borderRadius: 10, borderColor: '#E5E7EB', fontSize: 13 }) }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>City Name</label>
              <Select
                options={newStateIsoCode ? City.getCitiesOfState('IN', newStateIsoCode).map((c: { name: string }) => ({ value: c.name, label: c.name })) : []}
                placeholder="Search City..."
                onChange={(option: { value: string; label: string } | null) => {
                  setNewCityName(option?.value || '');
                }}
                value={newCityName ? { label: newCityName, value: newCityName } : null}
                isDisabled={!newStateIsoCode}
                styles={{ control: (base: Record<string, unknown>) => ({ ...base, borderRadius: 10, borderColor: '#E5E7EB', fontSize: 13 }) }}
              />
            </div>
            <button type="submit" style={{ padding: '12px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8, boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}>
              Add City
            </button>
          </form>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            {isLoadingCities ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                Loading operating cities from database...
              </div>
            ) : isErrorCities ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#DC2626' }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>Failed to load operating cities.</p>
                <button onClick={() => void refetchCities()} style={{ padding: '6px 14px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
              </div>
            ) : cities.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                No operating cities registered in database.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>City & State</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Zones</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Merchants</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{c.cityName}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{c.state}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{c.activeZonesCount} Zones</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{c.activeMerchantsCount} Outlets</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: c.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: c.status === 'ACTIVE' ? '#15803D' : '#991B1B', padding: '3px 8px', borderRadius: 6 }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button onClick={() => updateCityStatus({ id: c.id, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).unwrap().then(() => showToast(`City status updated to ${c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}`))} style={{ padding: '6px 12px', marginRight: 8, background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>{c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => { if (confirm('Are you sure you want to permanently delete this city? This action cannot be undone.')) { deleteCity(c.id).unwrap().then(() => showToast('City deleted permanently.')); } }} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SERVICE AREAS */}
      {activeTab === 'SERVICE_AREAS' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
          {isLoadingAreas ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
              Loading service areas from database...
            </div>
          ) : isErrorAreas ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#DC2626' }}>
              <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>Failed to load service areas.</p>
              <button onClick={() => void refetchAreas()} style={{ padding: '6px 14px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : serviceAreas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
              No service area records found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Area & City</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pincode</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage Level</th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Outlets</th>
                </tr>
              </thead>
              <tbody>
                {serviceAreas.map((sa) => (
                  <tr key={sa.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{sa.areaName}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{sa.cityName}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{sa.pincode}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 6 }}>
                        {sa.coverageStatus ? sa.coverageStatus.replace('_', ' ') : 'FULL COVERAGE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>{sa.totalOutlets} Outlets</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 5: DELIVERY CHARGES */}
      {activeTab === 'DELIVERY_CHARGES' && (
        <form
          onSubmit={handleSaveDeliveryCharges}
          style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Distance-Based Delivery Charge Matrix</h3>
          {isLoadingCharges ? (
            <div style={{ padding: 24, color: '#6B7280', fontSize: 13 }}>Loading configuration from backend...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Base Delivery Fee (₹)</label>
                <input type="number" value={baseCharge} onChange={(e) => setBaseCharge(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Base Distance Coverage (KM)</label>
                <input type="number" value={baseDistanceKm} onChange={(e) => setBaseDistanceKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Additional Fee per KM (₹)</label>
                <input type="number" value={additionalChargePerKm} onChange={(e) => setAdditionalChargePerKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Free Delivery Order Threshold (₹)</label>
                <input type="number" value={freeDeliveryMinOrder} onChange={(e) => setFreeDeliveryMinOrder(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Night Dispatch Surcharge (₹)</label>
                <input type="number" value={nightSurcharge} onChange={(e) => setNightSurcharge(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Peak Surge Multiplier</label>
                <input type="number" step="0.05" value={surgeMultiplier} onChange={(e) => setSurgeMultiplier(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}>
              Save Delivery Charges
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: RADIUS SETTINGS */}
      {activeTab === 'RADIUS_SETTINGS' && (
        <form
          onSubmit={handleSaveRadiusSettings}
          style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Operational Radius & Dispatch Parameters</h3>
          {isLoadingRadius ? (
            <div style={{ padding: 24, color: '#6B7280', fontSize: 13 }}>Loading configuration from backend...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Maximum Operating Delivery Radius (KM)</label>
                <input type="number" value={maxDeliveryRadius} onChange={(e) => setMaxDeliveryRadius(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Customer Restaurant Discovery Radius (KM)</label>
                <input type="number" value={customerSearchRadius} onChange={(e) => setCustomerSearchRadius(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Driver Auto-Dispatch Broadcast Radius (KM)</label>
                <input type="number" value={driverDispatchRadius} onChange={(e) => setDriverDispatchRadius(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Distance Calculation Engine Mode</label>
                <select value={distanceCalculationMode} onChange={(e) => setDistanceCalculationMode(e.target.value as 'GPS_ROAD' | 'HAVERSINE')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#FFFFFF', color: '#111827' }}>
                  <option value="GPS_ROAD">Google Maps GPS Road Navigation Distance</option>
                  <option value="HAVERSINE">Straight Line Haversine Distance (Fast)</option>
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)' }}>
              Save Radius Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
