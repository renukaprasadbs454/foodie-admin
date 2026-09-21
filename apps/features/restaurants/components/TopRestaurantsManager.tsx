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
        // Only load restaurants that currently have a stored topPosition
        const initialTop = stores.filter(s => s.topPosition != null).sort((a, b) => a.topPosition! - b.topPosition!);
        setArrangedStores(initialTop);
    }, [stores]);

    // Available restaurants to add are those not already in the arranged list
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
        const prev = items[index - 1];
        items[index - 1] = items[index];
        items[index] = prev;
        setArrangedStores(items);
    };

    const moveDown = (index: number) => {
        if (index === arrangedStores.length - 1) return;
        const items = [...arrangedStores];
        const next = items[index + 1];
        items[index + 1] = items[index];
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Text as="h3" variant="heading3">Arrange Top Restaurants</Text>
                    <Text variant="caption" color={tokens.color.textSecondary}>
                        Configure explicit Top Restaurants for the Customer App. Unselected restaurants won't appear in the top list.
                    </Text>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        backgroundColor: '#0284C7',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Top Restaurants'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, padding: 16, backgroundColor: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                <select
                    value={selectedToAdd}
                    onChange={(e) => setSelectedToAdd(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
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
                        padding: '10px 16px',
                        backgroundColor: selectedToAdd ? '#0284C7' : '#94A3B8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: selectedToAdd ? 'pointer' : 'not-allowed',
                        boxShadow: selectedToAdd ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                    }}
                >
                    + Add to List
                </button>
            </div>

            {arrangedStores.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', backgroundColor: '#F0F9FF', border: '1px dashed #BAE6FD', borderRadius: 12 }}>
                    <Text style={{ fontWeight: 600, color: '#0369A1' }}>No top restaurants selected.</Text>
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
                                        backgroundColor: tokens.color.surface,
                                        borderRadius: tokens.radius.md,
                                        border: '1px solid ' + tokens.color.border,
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                        position: 'relative',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 4 }}>
                                        <button onClick={() => moveUp(index)} style={{ padding: 4, cursor: 'pointer', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>⬆️</button>
                                        <button onClick={() => moveDown(index)} style={{ padding: 4, cursor: 'pointer', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>⬇️</button>
                                    </div>

                                    <button
                                        onClick={() => handleRemove(restaurant.id)}
                                        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#EF4444', color: '#FFFFFF', padding: '4px 8px', borderRadius: 12, fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer' }}
                                    >
                                        Remove ✕
                                    </button>

                                    <div style={{ height: 110, width: '100%', backgroundColor: '#F0ECE4', position: 'relative' }}>
                                        <div style={{ position: 'absolute', zIndex: 5, bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                                            Pos: #{index + 1}
                                        </div>
                                        <img
                                            src={imageUrl}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isClosed ? 0.3 : 1 }}
                                        />
                                    </div>

                                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text
                                                variant="label"
                                                style={{ flex: 1, fontWeight: '700', color: tokens.color.textPrimary, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                            >
                                                {restaurant.name}
                                            </Text>
                                        </div>
                                        {restaurant.module ? (
                                            <Text variant="caption" color={tokens.color.textSecondary} style={{ fontWeight: '500', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {restaurant.module}
                                            </Text>
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
