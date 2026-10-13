'use client';

import React from 'react';

const GMAPS_API_KEY = 'AIzaSyBef3prJr9YvHFDYczEJ-mzZfSlLd2vHbE';

// Singleton so the <script> tag is only injected once per page load
let gmapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
    if (gmapsLoadPromise) return gmapsLoadPromise;
    gmapsLoadPromise = new Promise<void>((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).google?.maps) {
            resolve();
            return;
        }
        const callbackName = '__gmapsAdminReadyCb__';
        (window as any)[callbackName] = () => resolve();
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error('Google Maps script failed to load'));
        document.head.appendChild(script);
    });
    return gmapsLoadPromise;
}

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
    const mapDivRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<any>(null);
    const circleRef = React.useRef<any>(null);
    const polygonRef = React.useRef<any>(null);
    const markersRef = React.useRef<any[]>([]);
    const clickListenerRef = React.useRef<any>(null);
    const polygonStringRef = React.useRef(polygonString);

    const [mapReady, setMapReady] = React.useState(false);
    const [mapLoadError, setMapLoadError] = React.useState(false);
    const [mapType, setMapType] = React.useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
    const [manualLat, setManualLat] = React.useState('');
    const [manualLng, setManualLng] = React.useState('');
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const parsePins = (str: string): { lat: number; lng: number }[] => {
        if (!str || !str.trim()) return [];
        return str
            .split('|')
            .map((p) => p.trim())
            .filter(Boolean)
            .reduce<{ lat: number; lng: number }[]>((acc, pt) => {
                const coords = pt.split(',').map((c) => parseFloat(c.trim()));
                if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    acc.push({ lat: coords[0], lng: coords[1] });
                }
                return acc;
            }, []);
    };

    const stringifyPins = (pins: { lat: number; lng: number }[]) =>
        pins.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(' | ');

    // Keep ref in sync with the latest prop on every render
    polygonStringRef.current = polygonString;

    const currentPins = parsePins(polygonString);

    // ── Load Google Maps script once ─────────────────────────────────────────────
    React.useEffect(() => {
        loadGoogleMapsScript()
            .then(() => setMapReady(true))
            .catch(() => setMapLoadError(true));
    }, []);

    // ── Initialise map (runs once after script loads + div is mounted) ───────────
    React.useEffect(() => {
        if (!mapReady || !mapDivRef.current || mapRef.current) return;
        const google = (window as any).google;

        const map = new google.maps.Map(mapDivRef.current, {
            center: { lat: centerLat, lng: centerLng },
            zoom: 12,
            mapTypeId: mapType,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: false,
            zoomControl: true,
        });
        mapRef.current = map;

        // Draw initial radius circle
        circleRef.current = new google.maps.Circle({
            map,
            center: { lat: centerLat, lng: centerLng },
            radius: (radiusKm || 5) * 1000,
            strokeColor: '#2196F3',
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: '#2196F3',
            fillOpacity: 0.08,
        });

        // Click-to-place listener — uses ref to always get latest polygonString
        clickListenerRef.current = map.addListener('click', (e: any) => {
            if (!e.latLng) return;
            const lat = parseFloat(e.latLng.lat().toFixed(6));
            const lng = parseFloat(e.latLng.lng().toFixed(6));
            const pins = parsePins(polygonStringRef.current);
            onChangePolygon(stringifyPins([...pins, { lat, lng }]));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady]);

    // ── Sync center + radius ─────────────────────────────────────────────────────
    React.useEffect(() => {
        if (!mapRef.current || !circleRef.current) return;
        const center = { lat: centerLat, lng: centerLng };
        mapRef.current.setCenter(center);
        circleRef.current.setCenter(center);
        circleRef.current.setRadius((radiusKm || 5) * 1000);
    }, [centerLat, centerLng, radiusKm]);

    // ── Sync map type ────────────────────────────────────────────────────────────
    React.useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setMapTypeId(mapType);
    }, [mapType]);

    // ── Rebuild markers + polygon overlay whenever pins change ───────────────────
    React.useEffect(() => {
        if (!mapRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;

        // Remove old markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        // Remove old polygon overlay
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }

        const pins = parsePins(polygonString);

        // Place numbered markers
        markersRef.current = pins.map((pin, idx) => {
            const marker = new google.maps.Marker({
                position: { lat: pin.lat, lng: pin.lng },
                map: mapRef.current,
                title: `Pin #${idx + 1}: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`,
                label: { text: String(idx + 1), color: '#FFFFFF', fontWeight: 'bold', fontSize: '12px' },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: '#2196F3',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2.5,
                },
                zIndex: 100 + idx,
                cursor: 'pointer',
            });

            // Click marker = remove that pin
            marker.addListener('click', () => {
                const updated = parsePins(polygonString).filter((_, i) => i !== idx);
                onChangePolygon(stringifyPins(updated));
            });

            return marker;
        });

        // Draw polygon fill if ≥ 3 pins
        if (pins.length >= 3) {
            polygonRef.current = new google.maps.Polygon({
                paths: pins.map((p) => ({ lat: p.lat, lng: p.lng })),
                map: mapRef.current,
                strokeColor: '#2196F3',
                strokeOpacity: 0.9,
                strokeWeight: 2.5,
                fillColor: '#2196F3',
                fillOpacity: 0.18,
                zIndex: 50,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polygonString, mapReady]);

    // ── Cleanup on unmount ───────────────────────────────────────────────────────
    React.useEffect(() => {
        return () => {
            const google = (window as any).google;
            if (clickListenerRef.current && google?.maps) {
                google.maps.event.removeListener(clickListenerRef.current);
            }
            markersRef.current.forEach((m) => m.setMap(null));
            circleRef.current?.setMap(null);
            polygonRef.current?.setMap(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────────
    const handleManualAdd = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng)) {
            onChangePolygon(stringifyPins([...currentPins, { lat, lng }]));
            setManualLat('');
            setManualLng('');
        }
    };

    const handleRemovePin = (idx: number) => {
        onChangePolygon(stringifyPins(currentPins.filter((_, i) => i !== idx)));
    };

    const handleClearAll = () => onChangePolygon('');

    const handleAutoPreset = (preset: 'CENTER' | '4POINT' | '6POINT') => {
        const offset = (radiusKm || 5.0) / 111.0;
        if (preset === 'CENTER') {
            onChangePolygon(`${centerLat.toFixed(6)},${centerLng.toFixed(6)}`);
        } else if (preset === '4POINT') {
            const pts = [
                { lat: centerLat + offset, lng: centerLng },
                { lat: centerLat, lng: centerLng + offset },
                { lat: centerLat - offset, lng: centerLng },
                { lat: centerLat, lng: centerLng - offset },
            ];
            onChangePolygon(stringifyPins(pts));
        } else {
            const pts: { lat: number; lng: number }[] = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 * Math.PI) / 180;
                pts.push({ lat: centerLat + offset * Math.sin(angle), lng: centerLng + offset * Math.cos(angle) });
            }
            onChangePolygon(stringifyPins(pts));
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div
            style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 24,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                        Click anywhere on the Google Map to drop pins. Click a numbered marker to remove it. The blue circle shows the radius coverage area.
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Map Type Toggle */}
                    <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
                        {(['roadmap', 'satellite', 'hybrid'] as const).map((thm) => (
                            <button
                                key={thm}
                                type="button"
                                onClick={() => setMapType(thm)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: mapType === thm ? '#2196F3' : 'transparent',
                                    color: mapType === thm ? '#FFFFFF' : '#6B7280',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {thm === 'roadmap' ? 'Vector' : thm === 'satellite' ? 'Satellite' : 'Hybrid'}
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

            {/* Google Map */}
            <div
                style={{ position: 'relative', height: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E7EB' }}
            >
                {/* Loading spinner */}
                {!mapReady && !mapLoadError && (
                    <div
                        style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: '#F8FAFC', zIndex: 10,
                            flexDirection: 'column', gap: 12,
                        }}
                    >
                        <div
                            style={{
                                width: 36, height: 36, border: '3px solid #E5E7EB',
                                borderTopColor: '#2196F3', borderRadius: '50%',
                                animation: 'gmaps-spin 0.8s linear infinite',
                            }}
                        />
                        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Loading Google Maps…</span>
                        <style>{`@keyframes gmaps-spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Error state */}
                {mapLoadError && (
                    <div
                        style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: '#FEF2F2', zIndex: 10,
                            flexDirection: 'column', gap: 8,
                        }}
                    >
                        <span style={{ fontSize: 28 }}>⚠️</span>
                        <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>Google Maps failed to load</span>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Check your internet connection or API key.</span>
                    </div>
                )}

                {/* Actual map div */}
                <div ref={mapDivRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />

                {/* Info overlay bottom-left */}
                <div
                    style={{
                        position: 'absolute', bottom: 12, left: 12, zIndex: 5,
                        background: 'rgba(17,24,39,0.75)', color: '#FFFFFF',
                        padding: '6px 12px', borderRadius: 8, fontSize: 11,
                        fontWeight: 600, backdropFilter: 'blur(4px)', pointerEvents: 'none',
                    }}
                >
                    Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)} · Radius: {radiusKm} km
                </div>

                {/* Hint overlay bottom-right */}
                <div
                    style={{
                        position: 'absolute', bottom: 12, right: 12, zIndex: 5,
                        backgroundColor: 'rgba(255,255,255,0.95)', color: '#111827',
                        padding: '4px 10px', borderRadius: 6, fontSize: 11,
                        fontWeight: 600, border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', pointerEvents: 'none',
                    }}
                >
                    Click map to drop pin · Click pin to remove
                </div>
            </div>

            {/* Preset toolbar */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 10, backgroundColor: '#F9FAFB',
                    padding: 12, borderRadius: 12, border: '1px solid #E5E7EB',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Quick Pin Presets:</span>
                    <button
                        type="button"
                        onClick={() => handleAutoPreset('CENTER')}
                        style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >
                        Drop Pin at Center
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAutoPreset('4POINT')}
                        style={{ padding: '6px 12px', background: '#2196F3', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Auto 4-Point Square
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAutoPreset('6POINT')}
                        style={{ padding: '6px 12px', background: '#2196F3', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Auto 6-Point Hexagon
                    </button>
                    {currentPins.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            Clear All ({currentPins.length})
                        </button>
                    )}
                </div>

                {/* Manual coordinate add */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                        type="number"
                        step="0.000001"
                        placeholder="Lat (12.97)"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        style={{ width: 100, padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, backgroundColor: '#FFFFFF', color: '#111827' }}
                    />
                    <input
                        type="number"
                        step="0.000001"
                        placeholder="Lng (77.59)"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        style={{ width: 100, padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, backgroundColor: '#FFFFFF', color: '#111827' }}
                    />
                    <button
                        type="button"
                        onClick={handleManualAdd}
                        style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        + Add Pin
                    </button>
                </div>
            </div>

            {/* Pin list */}
            {currentPins.length > 0 ? (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        Coordinates List ({currentPins.length} points):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {currentPins.map((pin, idx) => (
                            <div
                                key={idx}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                style={{
                                    backgroundColor: hoveredIdx === idx ? '#F3F4F6' : '#FFFFFF',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    border: hoveredIdx === idx ? '1px solid #9CA3AF' : '1px solid #E5E7EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, color: '#111827' }}>Pin #{idx + 1}</div>
                                    <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>
                                        {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemovePin(idx)}
                                    title="Remove pin"
                                    style={{ backgroundColor: 'transparent', color: '#6B7280', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: '4px 8px' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 10, border: '1px dashed #E5E7EB', fontSize: 12, color: '#6B7280' }}>
                    No polygon pins dropped yet. Click anywhere on the Google Map above or use &quot;Auto 4-Point Square&quot; to place boundary markers.
                </div>
            )}
        </div>
    );
}
