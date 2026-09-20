import React, { useState } from 'react';
import { Text } from 'foodie-shared-web';
import {
    useGetBannersQuery,
    useCreateBannerMutation,
    useActivateBannerMutation,
    useDeactivateBannerMutation,
    useDeleteBannerMutation,
    PromotionBanner
} from '../../../api/endpoints/couponsApi';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';

const VIBRANT_COLORS = ['#8B5CF6', '#F97316', '#EC4899', '#14B8A6'];

export function BannerManagement() {
    const { data: banners = [], isLoading } = useGetBannersQuery();
    const { data: adminRestaurantsRes } = useGetAdminRestaurantsQuery({ size: 100 }, { skip: false });
    const adminRestaurants = adminRestaurantsRes?.items || [];

    const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
    const [activateBanner] = useActivateBannerMutation();
    const [deactivateBanner] = useDeactivateBannerMutation();
    const [deleteBanner] = useDeleteBannerMutation();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [ctaText, setCtaText] = useState('');
    const [ctaType, setCtaType] = useState('OPEN_COUPON');
    const [ctaTarget, setCtaTarget] = useState('');
    const [displayOrder, setDisplayOrder] = useState('0');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            alert('Title is required');
            return;
        }

        const autoImageUrl = ''; // Removing image url requirement

        let backgroundTarget = '';
        if (ctaType === 'OPEN_RESTAURANT') backgroundTarget = ctaTarget;
        if (ctaType === 'OPEN_COUPON') backgroundTarget = 'WELCOME50';
        if (ctaType === 'EXTERNAL_URL') backgroundTarget = 'https://foodie.com';

        try {
            await createBanner({
                title,
                subtitle,
                imageUrl: autoImageUrl,
                ctaText,
                ctaType,
                ctaTarget: backgroundTarget,
                status: 'ACTIVE',
                displayOrder: parseInt(displayOrder, 10) || 0
            }).unwrap();
            setTitle('');
            setSubtitle('');
            setCtaText('');
            setDisplayOrder('0');
            alert('Banner created successfully');
        } catch (err) {
            alert('Failed to create banner');
        }
    };

    const handleToggleStatus = async (banner: PromotionBanner) => {
        try {
            if (banner.status === 'ACTIVE') {
                await deactivateBanner(banner.id).unwrap();
            } else {
                await activateBanner(banner.id).unwrap();
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this banner?')) {
            try {
                await deleteBanner(id).unwrap();
            } catch (err) {
                alert('Failed to delete banner');
            }
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, padding: '24px 0' }}>
            {/* Create Banner Form */}
            <form
                onSubmit={handleCreate}
                style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E4E4E7',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    height: 'fit-content',
                }}
            >
                <Text as="h2" variant="heading3" color="#09090B">
                    Create Promotional Banner
                </Text>

                <div style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 20,
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#8B5CF6',
                    marginBottom: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ position: 'absolute', top: -10, right: 10, fontSize: 45 }}>✨</div>
                    <div style={{ position: 'absolute', bottom: 10, right: 60, fontSize: 35 }}>🎉</div>

                    <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '75%' }}>
                        <div style={{ fontWeight: 900, fontSize: 24, fontStyle: 'italic', letterSpacing: '-0.5px', color: '#fff', textShadow: '1px 1px 3px rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>
                            {title || 'BUZZ STREAKS'}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#FEF3C7', marginTop: 6, letterSpacing: '0.2px', textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
                            {subtitle || 'Buzz your friends, win up to 1000 Free Cash.'}
                        </div>
                        <div style={{ alignSelf: 'flex-start', backgroundColor: '#fff', padding: '6px 14px', borderRadius: 20, marginTop: subtitle ? 4 : 16, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <span style={{ color: '#E11D48', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>{ctaText || 'PLAY NOW'}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                        required
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Subtitle</label>
                    <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>CTA Text</label>
                        <input
                            type="text"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder="e.g. PLAY NOW"
                            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Action</label>
                        <select
                            value={ctaType}
                            onChange={(e) => {
                                setCtaType(e.target.value);
                                setCtaTarget('');
                            }}
                            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                        >
                            <option value="OPEN_COUPON">Open Coupon</option>
                            <option value="OPEN_RESTAURANT">Open Restaurant</option>
                            <option value="OPEN_CATEGORY">Open Category</option>
                            <option value="EXTERNAL_URL">External Link</option>
                        </select>
                    </div>
                </div>

                {ctaType === 'OPEN_RESTAURANT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Select Restaurant</label>
                        <select
                            value={ctaTarget}
                            onChange={(e) => setCtaTarget(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                            required
                        >
                            <option value="" disabled>-- Choose a Restaurant --</option>
                            {adminRestaurants.map(r => (
                                <option key={r.restaurantId} value={r.restaurantId}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isCreating}
                    style={{
                        padding: '12px 18px',
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: isCreating ? 'not-allowed' : 'pointer',
                        opacity: isCreating ? 0.7 : 1,
                        marginTop: 8
                    }}
                >
                    {isCreating ? 'Creating...' : 'Create Banner'}
                </button>
            </form>

            {/* Banners List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isLoading ? (
                    <div>Loading banners...</div>
                ) : banners.length === 0 ? (
                    <div>No banners configured yet.</div>
                ) : (
                    banners.map((banner: PromotionBanner) => (
                        <div
                            key={banner.id}
                            style={{
                                display: 'flex',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 12,
                                border: '1px solid #E4E4E7',
                                overflow: 'hidden',
                                height: 120,
                            }}
                        >
                            <div style={{
                                width: 140,
                                height: '100%',
                                position: 'relative',
                                backgroundColor: VIBRANT_COLORS[banners.indexOf(banner) % VIBRANT_COLORS.length]
                            }}>
                            </div>
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {banner.title}
                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, backgroundColor: banner.status === 'ACTIVE' ? '#D1FAE5' : '#FEF2F2', color: banner.status === 'ACTIVE' ? '#065F46' : '#991B1B', fontWeight: 700 }}>
                                            {banner.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#71717A', marginTop: 4 }}>
                                        {banner.subtitle || 'No subtitle'} | CTA: {banner.ctaText || 'None'} ({banner.ctaType})
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => handleToggleStatus(banner)}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: banner.status === 'ACTIVE' ? '#F4F4F5' : '#E0E7FF',
                                            color: banner.status === 'ACTIVE' ? '#09090B' : '#3730A3',
                                            border: banner.status === 'ACTIVE' ? '1px solid #E4E4E7' : '1px solid #C7D2FE',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {banner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#FEE2E2',
                                            color: '#991B1B',
                                            border: '1px solid #FECACA',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
