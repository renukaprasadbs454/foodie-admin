import React, { useState } from 'react';
import { Text } from 'foodie-shared-web';
import {
    useGetBannersQuery,
    useCreateBannerMutation,
    useActivateBannerMutation,
    useDeactivateBannerMutation,
    useDeleteBannerMutation,
    useUpdateBannerMutation,
    PromotionBanner
} from '../../../api/endpoints/couponsApi';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';

const VIBRANT_GRADIENTS = [
    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)'
];
const EMOJIS = [['✨', '🎉', '🎁'], ['🍔', '🔥', '🛵'], ['🎊', '🤑', '💥'], ['🍰', '✨', '🎈']];

export function BannerManagement() {
    const { data: banners = [], isLoading } = useGetBannersQuery();
    const { data: adminRestaurantsRes } = useGetAdminRestaurantsQuery({ size: 100 }, { skip: false });
    const adminRestaurants = adminRestaurantsRes?.items || [];

    const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
    const [updateBanner, { isLoading: isUpdating }] = useUpdateBannerMutation();
    const [activateBanner] = useActivateBannerMutation();
    const [deactivateBanner] = useDeactivateBannerMutation();
    const [deleteBanner] = useDeleteBannerMutation();

    const [editBannerId, setEditBannerId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [ctaText, setCtaText] = useState('');
    const [ctaType, setCtaType] = useState('OPEN_COUPON');
    const [ctaTarget, setCtaTarget] = useState('');
    const [displayOrder, setDisplayOrder] = useState('0');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            alert('Title is required');
            return;
        }

        const autoImageUrl = 'auto-generated'; // Must not be blank to pass validation

        let backgroundTarget = '';
        if (ctaType === 'OPEN_RESTAURANT') backgroundTarget = ctaTarget;
        if (ctaType === 'OPEN_COUPON') backgroundTarget = 'WELCOME50';
        if (ctaType === 'EXTERNAL_URL') backgroundTarget = 'https://foodie.com';

        try {
            if (editBannerId) {
                await updateBanner({
                    id: editBannerId,
                    body: {
                        title,
                        subtitle,
                        imageUrl: autoImageUrl,
                        ctaText,
                        ctaType,
                        ctaTarget: backgroundTarget,
                        status: 'ACTIVE',
                        displayOrder: parseInt(displayOrder, 10) || 0
                    }
                }).unwrap();
            } else {
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
            }

            setEditBannerId(null);
            setTitle('');
            setSubtitle('');
            setCtaText('');
            setCtaType('OPEN_COUPON');
            setCtaTarget('');
            setDisplayOrder('0');
            alert(editBannerId ? 'Banner updated successfully!' : 'Banner created successfully!');
        } catch (err) {
            console.error('Failed to save banner:', err);
            alert('Failed to save banner');
        }
    };

    const handleToggleStatus = (banner: PromotionBanner) => {
        if (banner.status === 'ACTIVE') {
            deactivateBanner(banner.id);
        } else {
            activateBanner(banner.id);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this banner?')) {
            deleteBanner(id);
        }
    };

    const startEdit = (banner: PromotionBanner) => {
        setEditBannerId(banner.id);
        setTitle(banner.title);
        setSubtitle(banner.subtitle || '');
        setCtaText(banner.ctaText || '');
        setCtaType(banner.ctaType || 'OPEN_COUPON');
        setCtaTarget(banner.ctaTarget || '');
        setDisplayOrder(String(banner.displayOrder || 0));
        window.scrollTo({ top: 0, behavior: 'smooth' }); // scroll to form 
    };

    const renderBannerPreview = (bTitle: string, bSubtitle: string, bCtaText: string, bCtaType: string, bCtaTarget: string, index: number = 0) => {
        const bgGradient = VIBRANT_GRADIENTS[index % VIBRANT_GRADIENTS.length];
        const activeEmojis = EMOJIS[index % EMOJIS.length];

        const displayTitle = bTitle || 'BUZZ STREAKS';
        const displaySubtitle = bSubtitle || 'Buzz your friends, win up to 1000 Free Cash.';

        return (
            <div style={{
                width: '100%',
                maxWidth: 420,
                height: 145, // Match customer app smaller size
                borderRadius: 20,
                overflow: 'hidden',
                background: bgGradient,
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignSelf: 'center',
            }}>
                <div style={{ position: 'absolute', top: -10, right: 10, fontSize: 45, opacity: 0.8 }}>{activeEmojis[0]}</div>
                <div style={{ position: 'absolute', bottom: 10, right: 60, fontSize: 35, opacity: 0.8 }}>{activeEmojis[1]}</div>
                <div style={{ position: 'absolute', top: 20, left: 160, fontSize: 30, opacity: 0.8 }}>{activeEmojis[2]}</div>
                <div style={{
                    flex: 1,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '75%',
                }}>
                    <h3 style={{
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: 22,
                        fontStyle: 'italic',
                        letterSpacing: '-0.5px',
                        textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
                        margin: 0,
                        lineHeight: 1.2
                    }}>
                        {displayTitle}
                    </h3>

                    <p style={{
                        color: '#FEF3C7',
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 4,
                        marginBottom: 8,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
                        lineHeight: 1.2
                    }}>
                        {displaySubtitle}
                    </p>

                    <div style={{
                        alignSelf: 'flex-start',
                        backgroundColor: '#FFFFFF',
                        padding: '6px 14px',
                        borderRadius: 20,
                        marginTop: displaySubtitle ? 0 : 12,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    }}>
                        <span style={{
                            color: '#E11D48',
                            fontWeight: 800,
                            fontSize: 11,
                            textTransform: 'uppercase'
                        }}>
                            {bCtaText || 'EXPLORE NOW'}
                        </span>
                    </div>
                </div>

                {bCtaType === 'OPEN_COUPON' && (
                    <div style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        backgroundColor: '#EC4899',
                        border: '2px solid #FFFFFF',
                        padding: '6px 10px',
                        borderRadius: 16,
                        transform: 'rotate(-3deg)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    }}>
                        <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 13 }}>
                            USE {bCtaTarget || 'CODE'}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <Text as="h2" variant="heading2">Promotional Banners</Text>
                <Text variant="caption">Manage Dynamic Promotional Content across the Customer App Highlights Feed.</Text>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: 32, alignItems: 'start' }}>

                {/* Left Side: Creation Form with Live Preview on Top */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: '#FAFAFA', padding: 24, borderRadius: 12, border: '1px solid #E4E4E7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{editBannerId ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}</h4>
                        {editBannerId && (
                            <button type="button" onClick={() => {
                                setEditBannerId(null);
                                setTitle('');
                                setSubtitle('');
                                setCtaText('');
                                setCtaType('OPEN_COUPON');
                                setCtaTarget('');
                                setDisplayOrder('0');
                            }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#EF4444', fontWeight: 600 }}>Cancel Edit</button>
                        )}
                    </div>

                    {/* Preview placed at the top of the form as requested */}
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Live Preview</span>
                        {renderBannerPreview(title, subtitle, ctaText, ctaType, ctaTarget, 0)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Banner Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. MEGA WEEKEND SALE"
                            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E4E7' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Subtitle (Optional)</label>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="e.g. Up to 50% Off on all orders"
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
                                placeholder="e.g. EXPLORE NOW"
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
                        disabled={isCreating || isUpdating}
                        style={{
                            padding: '12px 18px',
                            background: 'linear-gradient(135deg, #000000 0%, #1A1A1A 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            cursor: (isCreating || isUpdating) ? 'not-allowed' : 'pointer',
                            opacity: (isCreating || isUpdating) ? 0.7 : 1,
                            marginTop: 8
                        }}
                    >
                        {isCreating || isUpdating ? 'Saving...' : (editBannerId ? 'Update Banner' : 'Create Banner')}
                    </button>
                </form>

                {/* Right Side: List of Banners */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: '#F3F4F6', padding: 24, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Created Banners</h4>

                    {isLoading ? (
                        <div style={{ fontSize: 14 }}>Loading banners...</div>
                    ) : banners.length === 0 ? (
                        <div style={{ fontSize: 14, color: '#6B7280' }}>No banners configured yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {banners.map((banner: PromotionBanner, index: number) => {
                                return (
                                    <div key={banner.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, border: '1px solid #E4E4E7', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Banner #{index + 1}</h4>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 12, backgroundColor: banner.status === 'ACTIVE' ? '#D1FAE5' : '#FEF2F2', color: banner.status === 'ACTIVE' ? '#065F46' : '#991B1B', fontWeight: 700 }}>
                                                    {banner.status}
                                                </span>
                                                <button onClick={() => startEdit(banner)} style={{ padding: '6px 12px', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                                <button onClick={() => handleToggleStatus(banner)} style={{ padding: '6px 12px', backgroundColor: banner.status === 'ACTIVE' ? '#F4F4F5' : '#E0E7FF', color: banner.status === 'ACTIVE' ? '#09090B' : '#3730A3', border: banner.status === 'ACTIVE' ? '1px solid #E4E4E7' : '1px solid #C7D2FE', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                    {banner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button onClick={() => handleDelete(banner.id)} style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                                            </div>
                                        </div>

                                        {/* Show Preview of created banner in the list */}
                                        {renderBannerPreview(banner.title, banner.subtitle || '', banner.ctaText || '', banner.ctaType, banner.ctaTarget || '', index)}

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
