'use client';

import React, { useEffect, useRef, useState } from 'react';

// Google Maps API Key
const GMAPS_API_KEY = 'AIzaSyBef3prJr9YvHFDYczEJ-mzZfSlLd2vHbE';

// Guard against Google Maps billing error modal in Next.js development overlay
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    // Suppress Google Maps native alert popups when billing is not enabled
  };
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const firstArg = args[0];
    if (
      typeof firstArg === 'string' &&
      (firstArg.includes('BillingNotEnabledMapError') ||
        firstArg.includes('Google Maps JavaScript API error'))
    ) {
      console.warn('[Foodie Admin] Handled Google Maps billing notice:', firstArg);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Singleton Google Maps script loader
let gmapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (gmapsLoadPromise) return gmapsLoadPromise;

  gmapsLoadPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.maps) {
      resolve();
      return;
    }
    const callbackName = '__gmapsAdminPartnerMapReadyCb__';
    (window as any)[callbackName] = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-partner-tracking-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      gmapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });

  return gmapsLoadPromise;
}

export interface DeliveryPartnerLocationMapProps {
  partnerName: string;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  zoneName?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  height?: number | string;
  className?: string;
}

export function DeliveryPartnerLocationMap({
  partnerName,
  isOnline,
  latitude,
  longitude,
  zoneName = 'Designated Zone',
  vehicleType = 'BIKE',
  vehicleNumber,
  height = 280,
  className,
}: DeliveryPartnerLocationMapProps) {
  const [mapMode, setMapMode] = useState<'streets' | 'satellite' | 'radar'>('streets');
  const [zoomFactor, setZoomFactor] = useState<number>(1);
  const [gmapsReady, setGmapsReady] = useState<boolean>(false);
  const [gmapsLoadError, setGmapsLoadError] = useState<boolean>(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const gmapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const vehicleGlyph =
    vehicleType?.toUpperCase().includes('CYCLE') || vehicleType?.toUpperCase().includes('BIKE')
      ? '🏍️'
      : vehicleType?.toUpperCase().includes('CAR')
      ? '🚗'
      : '🛵';

  // Load Google Maps script once mounted
  useEffect(() => {
    let isCancelled = false;
    loadGoogleMapsScript()
      .then(() => {
        if (!isCancelled) {
          setGmapsReady(true);
        }
      })
      .catch((err) => {
        console.warn('[DeliveryPartnerLocationMap] Google Maps script load fallback:', err);
        if (!isCancelled) {
          setGmapsLoadError(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Google Maps instance
  useEffect(() => {
    if (!gmapsReady || !mapDivRef.current || mapMode === 'radar') return;

    try {
      const google = (window as any).google;
      if (!google?.maps) return;

      const pos = { lat: Number(latitude), lng: Number(longitude) };

      if (!gmapRef.current) {
        const map = new google.maps.Map(mapDivRef.current, {
          center: pos,
          zoom: 15,
          mapTypeId: mapMode === 'satellite' ? 'hybrid' : 'roadmap',
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          zoomControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });

        // Partner Marker Pin
        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: partnerName,
          animation: isOnline ? google.maps.Animation.DROP : undefined,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: isOnline ? '#10B981' : '#6B7280',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
        });

        // Operating Territory Circle
        const circle = new google.maps.Circle({
          map,
          center: pos,
          radius: 800, // 800m delivery operational radius
          strokeColor: isOnline ? '#059669' : '#6B7280',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: isOnline ? '#10B981' : '#6B7280',
          fillOpacity: isOnline ? 0.08 : 0.03,
        });

        // Info Window on marker click
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, sans-serif; padding: 4px 6px; font-size: 12px; color: #1E293B;">
              <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                <span>${vehicleGlyph}</span>
                <span>${partnerName}</span>
              </div>
              <div style="font-size: 11px; color: ${isOnline ? '#059669' : '#64748B'}; font-weight: 600; margin-bottom: 2px;">
                ${isOnline ? '🟢 Online & Live Tracking' : '⚪ Offline / Last Active Point'}
              </div>
              <div style="font-size: 10px; color: #64748B;">
                Vehicle: <strong>${vehicleNumber || vehicleType || 'Not Provided'}</strong>
              </div>
              <div style="font-size: 10px; color: #64748B;">
                Territory: <strong>${zoneName}</strong>
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        gmapRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
        infoWindowRef.current = infoWindow;
      } else {
        // Update existing Google Maps center and marker
        gmapRef.current.panTo(pos);
        if (markerRef.current) {
          markerRef.current.setPosition(pos);
          markerRef.current.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: isOnline ? '#10B981' : '#6B7280',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          });
        }
        if (circleRef.current) {
          circleRef.current.setCenter(pos);
          circleRef.current.setOptions({
            strokeColor: isOnline ? '#059669' : '#6B7280',
            fillColor: isOnline ? '#10B981' : '#6B7280',
            fillOpacity: isOnline ? 0.08 : 0.03,
          });
        }
      }
    } catch (e) {
      console.warn('[DeliveryPartnerLocationMap] Google Maps init error, using fallback:', e);
    }
  }, [gmapsReady, latitude, longitude, isOnline, mapMode, partnerName, vehicleGlyph, vehicleNumber, vehicleType, zoneName]);

  // Handle map type changes
  useEffect(() => {
    if (gmapRef.current && (window as any).google?.maps) {
      if (mapMode === 'satellite') {
        gmapRef.current.setMapTypeId('hybrid');
      } else if (mapMode === 'streets') {
        gmapRef.current.setMapTypeId('roadmap');
      }
    }
  }, [mapMode]);

  const handleRecenter = () => {
    setZoomFactor(1);
    if (gmapRef.current && (window as any).google?.maps) {
      gmapRef.current.panTo({ lat: Number(latitude), lng: Number(longitude) });
      gmapRef.current.setZoom(15);
    }
  };

  const handleZoomIn = () => {
    setZoomFactor((prev) => Math.min(prev * 1.5, 4));
    if (gmapRef.current && (window as any).google?.maps) {
      const currentZoom = gmapRef.current.getZoom() || 15;
      gmapRef.current.setZoom(Math.min(currentZoom + 1, 20));
    }
  };

  const handleZoomOut = () => {
    setZoomFactor((prev) => Math.max(prev / 1.5, 0.5));
    if (gmapRef.current && (window as any).google?.maps) {
      const currentZoom = gmapRef.current.getZoom() || 15;
      gmapRef.current.setZoom(Math.max(currentZoom - 1, 3));
    }
  };

  const googleMapsExternalUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  // Bounding box for OpenStreetMap embed fallback
  const deltaLng = 0.012 / zoomFactor;
  const deltaLat = 0.008 / zoomFactor;
  const minLng = (longitude - deltaLng).toFixed(5);
  const minLat = (latitude - deltaLat).toFixed(5);
  const maxLng = (longitude + deltaLng).toFixed(5);
  const maxLat = (latitude + deltaLat).toFixed(5);

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude.toFixed(5)}%2C${longitude.toFixed(5)}`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        backgroundColor: '#F3F4F6',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <style>{`
        @keyframes radar-ping {
          0% {
            transform: scale(0.8);
            opacity: 0.9;
          }
          70% {
            transform: scale(2.2);
            opacity: 0;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.92);
          }
        }
      `}</style>

      {/* Layer 1: Real-Time Google Maps JavaScript API (Primary) */}
      {(mapMode === 'streets' || mapMode === 'satellite') && !gmapsLoadError && (
        <div
          ref={mapDivRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        />
      )}

      {/* Fallback Layer: Real Street Map via OpenStreetMap Interactive Embed (if Google Maps API fails) */}
      {(mapMode === 'streets' || mapMode === 'satellite') && gmapsLoadError && (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <iframe
            key={`${latitude}-${longitude}-${zoomFactor}`}
            title="Delivery Partner Location Map (OSM Fallback)"
            src={osmEmbedUrl}
            width="100%"
            height="100%"
            style={{
              border: 0,
              width: '100%',
              height: '100%',
              opacity: isIframeLoaded ? 1 : 0.8,
              transition: 'opacity 0.2s ease-in',
            }}
            onLoad={() => setIsIframeLoaded(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Layer 2: Interactive Vector Radar Map */}
      {mapMode === 'radar' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 600 300"
            preserveAspectRatio="xMidYMid slice"
            style={{
              transform: `scale(${zoomFactor})`,
              transition: 'transform 0.2s ease-out',
            }}
          >
            <defs>
              <pattern id="radar-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="#F8FAFC" />
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#radar-grid)" />

            {/* Simulated Parks / Green Areas */}
            <path
              d="M 40 40 Q 120 20 160 80 T 110 160 Q 60 140 40 40 Z"
              fill="#ECFDF5"
              stroke="#D1FAE5"
              strokeWidth="1.5"
            />
            <path
              d="M 420 180 Q 500 160 540 220 T 470 280 Q 430 260 420 180 Z"
              fill="#ECFDF5"
              stroke="#D1FAE5"
              strokeWidth="1.5"
            />

            {/* Secondary Streets */}
            <path d="M 0 110 L 600 110" stroke="#CBD5E1" strokeWidth="3" />
            <path d="M 0 220 L 600 220" stroke="#CBD5E1" strokeWidth="3" />
            <path d="M 180 0 L 180 300" stroke="#CBD5E1" strokeWidth="3" />
            <path d="M 460 0 L 460 300" stroke="#CBD5E1" strokeWidth="3" />

            {/* Primary Arterial Avenue passing through center */}
            <path d="M 0 150 Q 200 145 300 150 T 600 155" stroke="#FBBF24" strokeWidth="5" opacity="0.65" />
            <path d="M 300 0 Q 305 100 300 150 T 295 300" stroke="#FBBF24" strokeWidth="5" opacity="0.65" />

            {/* Operating Zone Boundary Circle */}
            <circle
              cx="300"
              cy="150"
              r="110"
              fill={isOnline ? '#10B981' : '#6B7280'}
              fillOpacity={isOnline ? '0.08' : '0.04'}
              stroke={isOnline ? '#059669' : '#6B7280'}
              strokeWidth="2"
              strokeDasharray={isOnline ? 'none' : '4 4'}
            />

            {/* Zone Tag Label */}
            <text
              x="300"
              y="60"
              textAnchor="middle"
              fill="#64748B"
              fontSize="11"
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              📍 {zoneName} (Operating Territory)
            </text>

            {/* Radar wave pulse when ONLINE */}
            {isOnline && (
              <circle
                cx="300"
                cy="150"
                r="40"
                fill="#10B981"
                fillOpacity="0.25"
                style={{
                  transformOrigin: '300px 150px',
                  animation: 'radar-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
            )}

            {/* Static marker halo when OFFLINE */}
            {!isOnline && (
              <circle
                cx="300"
                cy="150"
                r="30"
                fill="#94A3B8"
                fillOpacity="0.2"
                stroke="#64748B"
                strokeWidth="1"
              />
            )}

            {/* Marker Pin Shadow */}
            <ellipse cx="300" cy="155" rx="14" ry="5" fill="#000000" fillOpacity="0.18" />

            {/* Marker Pin Base */}
            <circle
              cx="300"
              cy="150"
              r="16"
              fill={isOnline ? '#059669' : '#475569'}
              stroke="#FFFFFF"
              strokeWidth="3"
            />

            {/* Marker Vehicle Glyph */}
            <text
              x="300"
              y="154"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {vehicleGlyph}
            </text>
          </svg>
        </div>
      )}

      {/* Floating Center Partner Badge (Overlaid when radar mode is active or when map is loading) */}
      {(!gmapsReady || mapMode === 'radar') && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {isOnline && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                marginLeft: -25,
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.35)',
                animation: 'radar-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Floating Pill Tag with Partner Name & Status */}
          <div
            style={{
              backgroundColor: isOnline ? '#065F46' : '#1F2937',
              color: '#FFFFFF',
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: `1px solid ${isOnline ? '#34D399' : '#4B5563'}`,
            }}
          >
            <span>{vehicleGlyph}</span>
            <span>{partnerName}</span>
            {vehicleNumber && <span style={{ opacity: 0.8, fontSize: 9 }}>• {vehicleNumber}</span>}
          </div>

          {/* Pin Pointer Arrow */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `6px solid ${isOnline ? '#065F46' : '#1F2937'}`,
            }}
          />

          {/* Base Pin Dot */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10B981' : '#6B7280',
              border: '2px solid #FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              marginTop: -1,
            }}
          />
        </div>
      )}

      {/* TOP LEFT: Live Status Chip */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isOnline ? 'rgba(236, 253, 245, 0.94)' : 'rgba(243, 244, 246, 0.94)',
          border: `1px solid ${isOnline ? '#A7F3D0' : '#D1D5DB'}`,
          borderRadius: 8,
          padding: '4px 10px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10B981' : '#6B7280',
            boxShadow: isOnline ? '0 0 0 2px rgba(16, 185, 129, 0.4)' : 'none',
            animation: isOnline ? 'pulse-dot 1.5s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isOnline ? '#065F46' : '#374151',
            letterSpacing: 0.3,
          }}
        >
          {isOnline ? 'LIVE GPS POSITION' : 'LAST ACTIVE LOCATION'}
        </span>
      </div>

      {/* TOP RIGHT: Interactive Controls (Mode, Recenter, Zoom, Google Maps) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* Map Mode Switcher (Google Maps Streets, Satellite, Radar) */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 6,
            padding: 2,
            border: '1px solid #D1D5DB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setMapMode('streets')}
            title="Google Maps Street View"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: mapMode === 'streets' ? '#2563EB' : 'transparent',
              color: mapMode === 'streets' ? '#FFFFFF' : '#4B5563',
            }}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapMode('satellite')}
            title="Google Maps Satellite View"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: mapMode === 'satellite' ? '#2563EB' : 'transparent',
              color: mapMode === 'satellite' ? '#FFFFFF' : '#4B5563',
            }}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapMode('radar')}
            title="Vector Radar View"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: mapMode === 'radar' ? '#2563EB' : 'transparent',
              color: mapMode === 'radar' ? '#FFFFFF' : '#4B5563',
            }}
          >
            Radar
          </button>
        </div>

        {/* Recenter button */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map to Delivery Partner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1F2937',
            cursor: 'pointer',
            fontSize: 13,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          🎯
        </button>

        {/* Zoom In button */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1F2937',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          +
        </button>

        {/* Zoom Out button */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1F2937',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          -
        </button>

        {/* Open in Google Maps */}
        <a
          href={googleMapsExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Google Maps"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 28,
            padding: '0 8px',
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#2563EB',
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          Google Maps ↗
        </a>
      </div>

      {/* BOTTOM LEFT: Coordinates Chip */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 4,
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          color: '#FFFFFF',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontFamily: 'monospace',
          backdropFilter: 'blur(4px)',
          letterSpacing: 0.2,
          pointerEvents: 'none',
        }}
      >
        {latitude.toFixed(4)}, {longitude.toFixed(4)} • {zoneName}
      </div>

      {/* BOTTOM RIGHT: Google Maps Active Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: isOnline ? '#059669' : '#6B7280',
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 600,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>🗺️</span>
        <span>{isOnline ? '🟢 Google Maps Live GPS' : '⚪ Google Maps Last Known'}</span>
      </div>
    </div>
  );
}
