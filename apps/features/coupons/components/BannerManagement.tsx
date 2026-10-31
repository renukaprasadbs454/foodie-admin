import React, { useState, useEffect, useRef } from 'react';
import {
    useGetBannersQuery,
    useCreateBannerMutation,
    useActivateBannerMutation,
    useDeactivateBannerMutation,
    useDeleteBannerMutation,
    useUpdateBannerMutation,
    PromotionBanner,
    CreatePromotionBannerBody,
} from '../../../api/endpoints/couponsApi';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';
import { useGetZonesQuery } from '@/api/endpoints/locationApi';

const VIBRANT_GRADIENTS = [
    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)'
];
const EMOJIS = [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']];

export function BannerManagement() {
    const { data: banners = [], isLoading } = useGetBannersQuery();
    const { data: adminRestaurantsRes } = useGetAdminRestaurantsQuery({ size: 100 }, { skip: false });
    const adminRestaurants = adminRestaurantsRes?.items || [];
    const { data: dbZones = [], isLoading: isLoadingZones } = useGetZonesQuery();

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

    // Zone Selection State
    const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>(['ALL']);
    const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
    const [zoneSearchQuery, setZoneSearchQuery] = useState('');
    const [zoneError, setZoneError] = useState<string | null>(null);
    const zoneDropdownRef = useRef<HTMLDivElement>(null);

    // Outside click listener to dismiss zone dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
                setZoneDropdownOpen(false);
            }
        }
        if (zoneDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [zoneDropdownOpen]);

    const handleToggleAllZones = () => {
        // Selecting "All Zones" targets all existing zones and clears individual zone selections
        setSelectedZoneIds(['ALL']);
        setZoneError(null);
    };

    const handleToggleZone = (zoneId: string) => {
        setZoneError(null);
        let updated: string[];
        if (selectedZoneIds.includes('ALL')) {
            // If "All Zones" was selected, automatically clear "All Zones" and select this zone
            updated = [zoneId];
        } else if (selectedZoneIds.includes(zoneId)) {
            updated = selectedZoneIds.filter((id) => id !== zoneId);
        } else {
            updated = [...selectedZoneIds, zoneId];
        }
        setSelectedZoneIds(updated);
    };

    const handleRemoveZone = (zoneId: string) => {
        if (zoneId === 'ALL') {
            setSelectedZoneIds([]);
        } else {
            const updated = selectedZoneIds.filter((id) => id !== zoneId);
            setSelectedZoneIds(updated);
        }
    };

    const resolveZoneNames = (zoneIds: string[]): string[] => {
        if (zoneIds.includes('ALL') || zoneIds.length === 0) {
            return ['All Zones'];
        }
        return zoneIds.map((id) => {
            const found = dbZones.find((z) => z.id === id);
            return found ? found.zoneName : id;
        });
    };

    const getBannerZoneBadgeText = (banner: PromotionBanner): string => {
        if (banner.isAllZones || !banner.targetZoneIds || banner.targetZoneIds.length === 0 || banner.targetZoneIds.includes('ALL')) {
            return 'Zone: All Zones';
        }
        const names = banner.targetZoneNames && banner.targetZoneNames.length > 0
            ? banner.targetZoneNames
            : banner.targetZoneIds.map((id) => {
                const found = dbZones.find((z) => z.id === id);
                return found ? found.zoneName : id;
            });
        if (names.length === 1) {
            return `Zone: ${names[0]}`;
        }
        return `Zones: ${names.join(', ')}`;
    };

    const filteredZones = dbZones.filter((z) => {
        if (!zoneSearchQuery.trim()) return true;
        const q = zoneSearchQuery.toLowerCase();
        return (
            (z.zoneName && z.zoneName.toLowerCase().includes(q)) ||
            (z.cityName && z.cityName.toLowerCase().includes(q))
        );
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Title is required');
            return;
        }

        if (selectedZoneIds.length === 0) {
            setZoneError('Please select at least one zone or All Zones.');
            return;
        }

        const autoImageUrl = 'auto-generated';

        let backgroundTarget = '';
        if (ctaType === 'OPEN_RESTAURANT') backgroundTarget = ctaTarget;
        if (ctaType === 'OPEN_COUPON') backgroundTarget = 'WELCOME50';
        if (ctaType === 'EXTERNAL_URL') backgroundTarget = 'https://foodie.com';

        const isAllZones = selectedZoneIds.includes('ALL');
        const targetZoneNames = resolveZoneNames(selectedZoneIds);

        const bannerPayload: CreatePromotionBannerBody = {
            title: title.trim(),
            subtitle: subtitle.trim(),
            imageUrl: autoImageUrl,
            ctaText: ctaText.trim(),
            ctaType,
            ctaTarget: backgroundTarget,
            status: 'ACTIVE',
            displayOrder: parseInt(displayOrder, 10) || 0,
            targetZoneIds: isAllZones ? ['ALL'] : selectedZoneIds,
            targetZoneNames,
            isAllZones,
        };

        try {
            if (editBannerId) {
                await updateBanner({
                    id: editBannerId,
                    body: bannerPayload,
                }).unwrap();
            } else {
                await createBanner(bannerPayload).unwrap();
            }

            setEditBannerId(null);
            setTitle('');
            setSubtitle('');
            setCtaText('');
            setCtaType('OPEN_COUPON');
            setCtaTarget('');
            setDisplayOrder('0');
            setSelectedZoneIds(['ALL']);
            setZoneError(null);
            setZoneDropdownOpen(false);
            setZoneSearchQuery('');
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

        // Load existing zone selection safely
        if (banner.isAllZones || banner.targetZoneIds?.includes('ALL') || !banner.targetZoneIds || banner.targetZoneIds.length === 0) {
            setSelectedZoneIds(['ALL']);
        } else {
            setSelectedZoneIds([...banner.targetZoneIds]);
        }
        setZoneError(null);
        setZoneDropdownOpen(false);
        setZoneSearchQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderBannerPreview = (bTitle: string, bSubtitle: string, bCtaText: string, bCtaType: string, bCtaTarget: string, index: number = 0) => {
        const bgGradient = VIBRANT_GRADIENTS[index % VIBRANT_GRADIENTS.length];

        const displayTitle = bTitle || 'BUZZ STREAKS';
        const displaySubtitle = bSubtitle || 'Buzz your friends, win up to 1000 Free Cash.';

        return (
            <div style={{
                width: '100%',
                maxWidth: 420,
                height: 145,
                borderRadius: 20,
                overflow: 'hidden',
                background: bgGradient,
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignSelf: 'center',
            }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Promotional Banners</h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Manage Dynamic Promotional Content across the Customer App Highlights Feed.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: 24, alignItems: 'start' }}>

                {/* Left Side: Creation Form with Live Preview on Top */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>{editBannerId ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}</h4>
                        {editBannerId && (
                            <button type="button" onClick={() => {
                                setEditBannerId(null);
                                setTitle('');
                                setSubtitle('');
                                setCtaText('');
                                setCtaType('OPEN_COUPON');
                                setCtaTarget('');
                                setDisplayOrder('0');
                                setSelectedZoneIds(['ALL']);
                                setZoneError(null);
                                setZoneDropdownOpen(false);
                                setZoneSearchQuery('');
                            }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#EF4444', fontWeight: 600, fontSize: 13 }}>Cancel Edit</button>
                        )}
                    </div>

                    {/* Preview placed at the top of the form */}
                    <div style={{ marginTop: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Live Preview</span>
                        {renderBannerPreview(title, subtitle, ctaText, ctaType, ctaTarget, 0)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Banner Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. MEGA WEEKEND SALE"
                            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Subtitle (Optional)</label>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="e.g. Up to 50% Off on all orders"
                            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                        />
                    </div>

                    {/* Searchable Multi-Select Zone Dropdown */}
                    <div ref={zoneDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Select Zone <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            {selectedZoneIds.length > 0 && (
                                <span style={{ fontSize: 11, color: '#6B7280' }}>
                                    {selectedZoneIds.includes('ALL') ? 'Targets all operational zones' : `${selectedZoneIds.length} zone${selectedZoneIds.length > 1 ? 's' : ''} selected`}
                                </span>
                            )}
                        </div>

                        {/* Dropdown trigger box */}
                        <div
                            id="zone-select-dropdown-trigger"
                            role="button"
                            tabIndex={0}
                            onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setZoneDropdownOpen(!zoneDropdownOpen);
                                }
                            }}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: zoneError ? '1px solid #EF4444' : '1px solid #E5E7EB',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                minHeight: 42,
                                boxShadow: zoneDropdownOpen ? '0 0 0 3px rgba(33, 150, 243, 0.15)' : 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                                {selectedZoneIds.length === 0 ? (
                                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>-- Select Zone(s) --</span>
                                ) : selectedZoneIds.includes('ALL') ? (
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        🌐 All Zones (Global Distribution)
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>
                                        {resolveZoneNames(selectedZoneIds).join(', ')}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8, transform: zoneDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                                ▼
                            </span>
                        </div>

                        {/* Zone selection error message */}
                        {zoneError && (
                            <span id="zone-select-error-msg" style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                                {zoneError}
                            </span>
                        )}

                        {/* Dropdown Menu Popup */}
                        {zoneDropdownOpen && (
                            <div
                                id="zone-select-dropdown-menu"
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: 6,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 12,
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    zIndex: 50,
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    maxHeight: 340,
                                }}
                            >
                                {/* Search Input */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: 10, fontSize: 13, color: '#9CA3AF' }}>🔍</span>
                                    <input
                                        id="zone-search-input"
                                        type="text"
                                        value={zoneSearchQuery}
                                        onChange={(e) => setZoneSearchQuery(e.target.value)}
                                        placeholder="Search zones by name or city..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 32px',
                                            borderRadius: 8,
                                            border: '1px solid #D1D5DB',
                                            fontSize: 12,
                                            color: '#111827',
                                            outline: 'none',
                                        }}
                                        autoFocus
                                    />
                                    {zoneSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setZoneSearchQuery('')}
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontSize: 13,
                                                color: '#9CA3AF',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Zones Options List */}
                                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, paddingRight: 4 }}>
                                    {/* 1. All Zones Option */}
                                    {('all zones'.includes(zoneSearchQuery.toLowerCase()) || zoneSearchQuery === '') && (
                                        <label
                                            id="zone-option-all"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                backgroundColor: selectedZoneIds.includes('ALL') ? '#EFF6FF' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.1s ease',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedZoneIds.includes('ALL')}
                                                onChange={handleToggleAllZones}
                                                style={{ width: 16, height: 16, accentColor: '#2196F3', cursor: 'pointer' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: selectedZoneIds.includes('ALL') ? '#1D4ED8' : '#111827' }}>
                                                    All Zones
                                                </span>
                                                <span style={{ fontSize: 11, color: '#6B7280' }}>
                                                    Targets customers across all existing and newly created zones
                                                </span>
                                            </div>
                                        </label>
                                    )}

                                    <div style={{ height: 1, backgroundColor: '#F3F4F6', margin: '4px 0' }} />

                                    {/* 2. Dynamic Zone Options from existing database */}
                                    {isLoadingZones ? (
                                        <div style={{ padding: '8px', fontSize: 12, color: '#6B7280' }}>Loading available zones...</div>
                                    ) : filteredZones.length === 0 && !('all zones'.includes(zoneSearchQuery.toLowerCase())) ? (
                                        <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
                                            No operating zones found matching "{zoneSearchQuery}"
                                        </div>
                                    ) : (
                                        filteredZones.map((z) => {
                                            const isChecked = selectedZoneIds.includes(z.id);
                                            return (
                                                <label
                                                    key={z.id}
                                                    id={`zone-option-${z.id}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '8px 10px',
                                                        borderRadius: 8,
                                                        backgroundColor: isChecked ? '#F3E8FF' : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.1s ease',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleZone(z.id)}
                                                        style={{ width: 16, height: 16, accentColor: '#9333EA', cursor: 'pointer' }}
                                                    />
                                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                        <span style={{ fontSize: 13, fontWeight: isChecked ? 700 : 500, color: isChecked ? '#6B21A8' : '#111827' }}>
                                                            {z.zoneName}
                                                        </span>
                                                        {z.cityName && (
                                                            <span style={{ fontSize: 11, color: '#6B7280' }}>
                                                                City: {z.cityName} {z.status ? `• ${z.status}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Dropdown Footer */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                                        {selectedZoneIds.includes('ALL') ? 'All Zones selected' : `${selectedZoneIds.length} of ${dbZones.length} selected`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setZoneDropdownOpen(false)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: 6,
                                            border: 'none',
                                            backgroundColor: '#2196F3',
                                            color: '#FFFFFF',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Selected Zone Removable Chips */}
                        {selectedZoneIds.length > 0 && !selectedZoneIds.includes('ALL') && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {selectedZoneIds.map((id) => {
                                    const zone = dbZones.find((z) => z.id === id);
                                    const name = zone ? zone.zoneName : id;
                                    return (
                                        <span
                                            key={id}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                backgroundColor: '#F3E8FF',
                                                border: '1px solid #E9D5FF',
                                                color: '#6B21A8',
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveZone(id)}
                                                style={{
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    color: '#9333EA',
                                                    fontSize: 12,
                                                    padding: 0,
                                                    marginLeft: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>CTA Text</label>
                            <input
                                type="text"
                                value={ctaText}
                                onChange={(e) => setCtaText(e.target.value)}
                                placeholder="e.g. EXPLORE NOW"
                                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Action</label>
                            <select
                                value={ctaType}
                                onChange={(e) => {
                                    setCtaType(e.target.value);
                                    setCtaTarget('');
                                }}
                                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
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
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Select Restaurant</label>
                            <select
                                value={ctaTarget}
                                onChange={(e) => setCtaTarget(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', outline: 'none' }}
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
                            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: (isCreating || isUpdating) ? 'not-allowed' : 'pointer',
                            opacity: (isCreating || isUpdating) ? 0.7 : 1,
                            marginTop: 8,
                            boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                        }}
                    >
                        {isCreating || isUpdating ? 'Saving...' : (editBannerId ? 'Update Banner' : 'Create Banner')}
                    </button>
                </form>

                {/* Right Side: List of Banners */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>Created Banners ({banners.length})</h4>

                    {isLoading ? (
                        <div style={{ fontSize: 14, color: '#6B7280' }}>Loading banners...</div>
                    ) : banners.length === 0 ? (
                        <div style={{ fontSize: 14, color: '#6B7280' }}>No banners configured yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {banners.map((banner: PromotionBanner, index: number) => {
                                const isGlobal = banner.isAllZones || !banner.targetZoneIds || banner.targetZoneIds.length === 0 || banner.targetZoneIds.includes('ALL');
                                return (
                                    <div key={banner.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>Banner #{index + 1}</h4>
                                                {/* Selected Zone Badge (Requirement 3) */}
                                                <span
                                                    id={`banner-${banner.id}-zone-badge`}
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '3px 9px',
                                                        borderRadius: 6,
                                                        backgroundColor: isGlobal ? '#EFF6FF' : '#F3E8FF',
                                                        color: isGlobal ? '#1D4ED8' : '#7E22CE',
                                                        border: isGlobal ? '1px solid #BFDBFE' : '1px solid #E9D5FF',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    📍 {getBannerZoneBadgeText(banner)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, backgroundColor: banner.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: banner.status === 'ACTIVE' ? '#15803D' : '#EF4444', fontWeight: 600 }}>
                                                    {banner.status}
                                                </span>
                                                <button onClick={() => startEdit(banner)} style={{ padding: '6px 12px', backgroundColor: '#E3F2FD', border: 'none', color: '#2196F3', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                                <button onClick={() => handleToggleStatus(banner)} style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                    {banner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button onClick={() => handleDelete(banner.id)} style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                                            </div>
                                        </div>

                                        {/* Show Preview of created banner in the list */}
                                        {renderBannerPreview(banner.title, banner.subtitle || '', banner.ctaText || '', banner.ctaType || '', banner.ctaTarget || '', index)}

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
