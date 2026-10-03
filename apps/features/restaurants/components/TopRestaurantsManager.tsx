'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Text, useTheme } from 'foodie-shared-web';
import type { StoreItem } from '../pages/RestaurantsPage';

const FALLBACK_FOOD_IMAGES = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600',
];

function getRestaurantImage(restaurant: StoreItem): string {
    let hash = 0;
    const name = restaurant.name || '';
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % FALLBACK_FOOD_IMAGES.length;
    return FALLBACK_FOOD_IMAGES[index]!;
}

interface TopRestaurantsManagerProps {
    stores: StoreItem[];
    onSavePositions: (positions: { restaurantId: string; position: number }[]) => Promise<void>;
}

export function TopRestaurantsManager({ stores, onSavePositions }: TopRestaurantsManagerProps) {
    const { tokens } = useTheme();
    const [arrangedStores, setArrangedStores] = useState<StoreItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<string>('');

    useEffect(() => {
        const initialTop = stores.filter(s => s.topPosition != null).sort((a, b) => a.topPosition! - b.topPosition!);
        setArrangedStores(initialTop);
    }, [stores]);

    const availableStores = useMemo(() => {
        const arrangedIds = new Set(arrangedStores.map(s => s.id));
        return stores.filter(s => !arrangedIds.has(s.id));
    }, [stores, arrangedStores]);

    const handleAdd = () => {
        if (!selectedToAdd) return;
        const storeToAdd = stores.find(s => s.id === selectedToAdd);
        if (storeToAdd) {
            setArrangedStores(prev => [...prev, storeToAdd]);
            setSelectedToAdd('');
        }
    };

    const handleRemove = (id: string) => {
        setArrangedStores(prev => prev.filter(s => s.id !== id));
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const items = [...arrangedStores];
        const prev = items[index - 1]!;
        items[index - 1] = items[index]!;
        items[index] = prev;
        setArrangedStores(items);
    };

    const moveDown = (index: number) => {
        if (index === arrangedStores.length - 1) return;
        const items = [...arrangedStores];
        const next = items[index + 1]!;
        items[index + 1] = items[index]!;
        items[index] = next;
        setArrangedStores(items);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const positions = arrangedStores.map((store, index) => ({
            restaurantId: store.id,
            position: index + 1
        }));
        await onSavePositions(positions);
        setIsSaving(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Arrange Top Restaurants</h3>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                        Configure explicit top featured restaurants for customer discovery.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Top Restaurants'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <select
                    value={selectedToAdd}
                    onChange={(e) => setSelectedToAdd(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                >
                    <option value="" disabled>-- Select Restaurant to Add to Top List --</option>
                    {availableStores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleAdd}
                    disabled={!selectedToAdd}
                    style={{
                        padding: '10px 18px',
                        background: selectedToAdd ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : '#F3F4F6',
                        color: selectedToAdd ? '#FFFFFF' : '#9CA3AF',
                        border: selectedToAdd ? 'none' : '1px solid #E5E7EB',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: selectedToAdd ? 'pointer' : 'not-allowed',
                        boxShadow: selectedToAdd ? '0 2px 8px rgba(33, 150, 243, 0.25)' : 'none',
                    }}
                >
                    + Add to List
                </button>
            </div>

            {arrangedStores.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', backgroundColor: '#F9FAFB', border: '1px dashed #E5E7EB', borderRadius: 20 }}>
                    <p style={{ fontWeight: 600, color: '#6B7280', margin: 0 }}>No top restaurants selected.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {arrangedStores.map((restaurant, index) => {
                        const imageUrl = getRestaurantImage(restaurant);
                        const isClosed = false;

                        return (
                            <div key={restaurant.id} style={{ position: 'relative' }}>
                                <div
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 20,
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden',
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                                        position: 'relative',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 4 }}>
                                        <button
                                            type="button"
                                            onClick={() => moveUp(index)}
                                            style={{
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                borderRadius: 6,
                                                border: '1px solid #E5E7EB',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#374151',
                                            }}
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveDown(index)}
                                            style={{
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                borderRadius: 6,
                                                border: '1px solid #E5E7EB',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#374151',
                                            }}
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemove(restaurant.id)}
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 10,
                                            background: '#EF4444',
                                            color: '#FFFFFF',
                                            padding: '4px 10px',
                                            borderRadius: 8,
                                            fontWeight: 600,
                                            fontSize: 12,
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Remove ×
                                    </button>

                                    <div style={{ height: 110, width: '100%', backgroundColor: '#F3F4F6', position: 'relative' }}>
                                        <div style={{ position: 'absolute', zIndex: 5, bottom: 8, left: 8, backgroundColor: '#111827', color: '#FFF', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                            Pos: #{index + 1}
                                        </div>
                                        <img
                                            src={imageUrl}
                                            alt={restaurant.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isClosed ? 0.3 : 1 }}
                                        />
                                    </div>

                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {restaurant.name}
                                        </div>
                                        {restaurant.module ? (
                                            <div style={{ fontWeight: 500, color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {restaurant.module}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
