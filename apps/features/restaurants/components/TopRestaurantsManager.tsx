'use client';

import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        // Sort by existing rank or keep current order
        // But since topPosition is missing in StoreItem right now, we will add it to the type shortly
        const sorted = [...stores].sort((a, b) => {
            const posA = a.topPosition ?? 999;
            const posB = b.topPosition ?? 999;
            if (posA !== posB) return posA - posB;
            return a.name.localeCompare(b.name);
        });
        setArrangedStores(sorted);
    }, [stores]);

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
                        These restaurants will be displayed in the Customer App when "Top Restaurants" is selected. Use the up and down arrows to arrange them, then click Save.
                    </Text>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        backgroundColor: '#14532D',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Top Restaurants'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {arrangedStores.map((restaurant, index) => {
                    const imageUrl = getRestaurantImage(restaurant);
                    const isClosed = false; // We can adjust in the real app if needed

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

                                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#14532D', color: '#FCD34D', padding: '4px 8px', borderRadius: 12, fontWeight: 800, fontSize: 12 }}>
                                    #{index + 1}
                                </div>

                                <div style={{ height: 110, width: '100%', backgroundColor: '#F0ECE4', position: 'relative' }}>
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
                                        {restaurant.rating ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                backgroundColor: '#14532D',
                                                padding: '2px 5px',
                                                borderRadius: tokens.radius.sm,
                                                marginLeft: 4,
                                            }}>
                                                <span style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: 10, marginRight: 2 }}>★</span>
                                                <span style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 10 }}>
                                                    {restaurant.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {restaurant.module ? (
                                        <Text variant="caption" color={tokens.color.textSecondary} style={{ fontWeight: '500', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {restaurant.module}
                                        </Text>
                                    ) : null}

                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, gap: 2 }}>
                                        <span style={{ fontSize: 11 }}>⏱️</span>
                                        <span style={{ fontSize: 11, color: '#14532D', fontWeight: '700' }}>20-25m</span>
                                        <span style={{ color: '#D1D5DB', fontSize: 9, margin: '0 1px' }}>|</span>
                                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>2.5 km</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
