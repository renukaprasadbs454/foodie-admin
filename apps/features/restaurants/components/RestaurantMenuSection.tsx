'use client';

import React, { useState, useMemo } from 'react';
import { useGetRestaurantMenuQuery } from '@/api/endpoints/restaurantsApi';
import type { MenuItemData } from '../types';

interface RestaurantMenuSectionProps {
  restaurantId: string;
  restaurantName?: string;
}

export function RestaurantMenuSection({ restaurantId, restaurantName }: RestaurantMenuSectionProps) {
  const { data, isLoading, isError, error, refetch } = useGetRestaurantMenuQuery(restaurantId, {
    skip: !restaurantId,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [dietFilter, setDietFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Flatten all items across categories and extract unique categories
  const { allItems, categoriesList, availableCount, unavailableCount } = useMemo(() => {
    if (!data || !Array.isArray(data.categories)) {
      return { allItems: [], categoriesList: [], availableCount: 0, unavailableCount: 0 };
    }

    const items: MenuItemData[] = [];
    const cats: { id: string; name: string; count: number }[] = [];

    data.categories.forEach((cat) => {
      const catItems = Array.isArray(cat.items) ? cat.items : [];
      cats.push({
        id: cat.categoryId || cat.name,
        name: cat.name,
        count: catItems.length,
      });

      catItems.forEach((item) => {
        items.push({
          ...item,
          id: item.id || item.menuItemId,
          categoryName: cat.name,
          categoryId: cat.categoryId,
        });
      });
    });

    const avail = items.filter((i) => i.isAvailable).length;
    const unavail = items.length - avail;

    return {
      allItems: items,
      categoriesList: cats,
      availableCount: avail,
      unavailableCount: unavail,
    };
  }, [data]);

  // Filter items based on active controls
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const matchesCategory =
          item.categoryId === selectedCategory ||
          item.categoryName?.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchesCategory) return false;
      }

      // Availability filter
      if (availabilityFilter === 'AVAILABLE' && !item.isAvailable) return false;
      if (availabilityFilter === 'UNAVAILABLE' && item.isAvailable) return false;

      // Diet filter
      if (dietFilter === 'VEG' && !item.isVeg) return false;
      if (dietFilter === 'NON_VEG' && item.isVeg) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const catMatch = item.categoryName?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [allItems, selectedCategory, availabilityFilter, dietFilter, searchQuery]);

  const handleImageError = (itemId: string) => {
    setBrokenImages((prev) => ({ ...prev, [itemId]: true }));
  };

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setAvailabilityFilter('ALL');
    setDietFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🍽️</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Food Menu & Catalog
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '3px 0 0 0' }}>
                {restaurantName ? `Complete verified menu items for ${restaurantName}` : 'All food items, categories, pricing & live availability'}
              </p>
            </div>
          </div>
        </div>

        {/* Action button: Refresh */}
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isLoading}
          style={{
            padding: '7px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          Refresh Menu
        </button>
      </div>

      {/* Summary KPI Count Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        {/* Total Items */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: 16,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Total Food Items
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>
            {isLoading ? '...' : allItems.length}
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            Across {categoriesList.length} menu {categoriesList.length === 1 ? 'category' : 'categories'}
          </div>
        </div>

        {/* Available Items */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            padding: 16,
            borderRadius: 10,
            border: '1px solid #DCFCE7',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Available Items
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#15803D' }}>
            {isLoading ? '...' : availableCount}
          </div>
          <div style={{ fontSize: 11, color: '#166534' }}>
            Ready to order by customers
          </div>
        </div>

        {/* Unavailable Items */}
        <div
          style={{
            backgroundColor: '#FEF2F2',
            padding: 16,
            borderRadius: 10,
            border: '1px solid #FEE2E2',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
              Unavailable Items
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              ✕
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#B91C1C' }}>
            {isLoading ? '...' : unavailableCount}
          </div>
          <div style={{ fontSize: 11, color: '#991B1B' }}>
            Sold out or turned off by merchant
          </div>
        </div>

        {/* Categories Count */}
        <div
          style={{
            backgroundColor: '#F0F9FF',
            padding: 16,
            borderRadius: 10,
            border: '1px solid #E0F2FE',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
            Menu Categories
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0284C7' }}>
            {isLoading ? '...' : categoriesList.length}
          </div>
          <div style={{ fontSize: 11, color: '#0284C7' }}>
            Organized food classifications
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: 14,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 8,
                  backgroundColor: '#E2E8F0',
                  flexShrink: 0,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ width: '70%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                <div style={{ width: '40%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                <div style={{ width: '50%', height: 12, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div
          style={{
            padding: 24,
            backgroundColor: '#FEF2F2',
            borderRadius: 12,
            border: '1px solid #FECACA',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 32 }}>⚠️</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991B1B', margin: 0 }}>
              Unable to load menu items
            </h3>
            <p style={{ fontSize: 13, color: '#B91C1C', margin: '4px 0 0 0' }}>
              {(error as any)?.data?.message || (error as any)?.message || 'An error occurred while fetching the restaurant menu catalog.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              padding: '8px 18px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State when restaurant has 0 menu items */}
      {!isLoading && !isError && allItems.length === 0 && (
        <div
          style={{
            padding: 48,
            backgroundColor: '#F8FAFC',
            borderRadius: 12,
            border: '1px dashed #CBD5E1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            🍲
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              No Menu Items Registered
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0 0', maxWidth: 440, lineHeight: 1.5 }}>
              This restaurant has not added any food menu items or catalog categories yet. When the restaurant partner creates menu items, they will appear here dynamically.
            </p>
          </div>
        </div>
      )}

      {/* Menu Catalog Loaded */}
      {!isLoading && !isError && allItems.length > 0 && (
        <>
          {/* Controls: Search & Category Pills & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Search and Secondary Filter Row */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    fontSize: 15,
                    pointerEvents: 'none',
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by food name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 2,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status and Diet Toggles */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Availability Toggle */}
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#F1F5F9',
                    padding: 3,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('ALL')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: availabilityFilter === 'ALL' ? '#FFFFFF' : 'transparent',
                      color: availabilityFilter === 'ALL' ? '#0F172A' : '#64748B',
                      boxShadow: availabilityFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    All Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('AVAILABLE')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: availabilityFilter === 'AVAILABLE' ? '#22C55E' : 'transparent',
                      color: availabilityFilter === 'AVAILABLE' ? '#FFFFFF' : '#166534',
                      boxShadow: availabilityFilter === 'AVAILABLE' ? '0 1px 3px rgba(34,197,94,0.3)' : 'none',
                    }}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('UNAVAILABLE')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: availabilityFilter === 'UNAVAILABLE' ? '#EF4444' : 'transparent',
                      color: availabilityFilter === 'UNAVAILABLE' ? '#FFFFFF' : '#991B1B',
                      boxShadow: availabilityFilter === 'UNAVAILABLE' ? '0 1px 3px rgba(239,68,68,0.3)' : 'none',
                    }}
                  >
                    Unavailable
                  </button>
                </div>

                {/* Diet Toggle */}
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#F1F5F9',
                    padding: 3,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setDietFilter('ALL')}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: dietFilter === 'ALL' ? '#FFFFFF' : 'transparent',
                      color: dietFilter === 'ALL' ? '#0F172A' : '#64748B',
                      boxShadow: dietFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('VEG')}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: dietFilter === 'VEG' ? '#FFFFFF' : 'transparent',
                      color: dietFilter === 'VEG' ? '#15803D' : '#64748B',
                      boxShadow: dietFilter === 'VEG' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ color: '#16A34A', fontSize: 13 }}>🟢</span> Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('NON_VEG')}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: dietFilter === 'NON_VEG' ? '#FFFFFF' : 'transparent',
                      color: dietFilter === 'NON_VEG' ? '#B91C1C' : '#64748B',
                      boxShadow: dietFilter === 'NON_VEG' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ color: '#DC2626', fontSize: 13 }}>🔴</span> Non-Veg
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills (Dynamically populated from database categories) */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'thin',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  border: selectedCategory === 'ALL' ? '1px solid #0284C7' : '1px solid #E2E8F0',
                  backgroundColor: selectedCategory === 'ALL' ? '#0284C7' : '#F8FAFC',
                  color: selectedCategory === 'ALL' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  boxShadow: selectedCategory === 'ALL' ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All Categories
                <span
                  style={{
                    backgroundColor: selectedCategory === 'ALL' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                    color: selectedCategory === 'ALL' ? '#FFFFFF' : '#64748B',
                    padding: '2px 7px',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                >
                  {allItems.length}
                </span>
              </button>

              {categoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.id || selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      border: isSelected ? '1px solid #0284C7' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#0284C7' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.name}
                    <span
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                        color: isSelected ? '#FFFFFF' : '#64748B',
                        padding: '2px 7px',
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Count Summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              color: '#64748B',
              paddingTop: 4,
            }}
          >
            <span>
              Showing <strong style={{ color: '#0F172A' }}>{filteredItems.length}</strong> of{' '}
              <strong style={{ color: '#0F172A' }}>{allItems.length}</strong> items
              {selectedCategory !== 'ALL' && (
                <span>
                  {' '}
                  in category{' '}
                  <strong style={{ color: '#0284C7' }}>
                    {categoriesList.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                  </strong>
                </span>
              )}
            </span>

            {(selectedCategory !== 'ALL' || availabilityFilter !== 'ALL' || dietFilter !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Filtered Items Grid */}
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: 36,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                border: '1px dashed #CBD5E1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🔍</span>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  No matching food items found
                </h4>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  No items match the selected category, search keywords, or availability filter.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {filteredItems.map((item) => {
                const hasImage = item.imageUrl && !brokenImages[item.menuItemId];

                return (
                  <div
                    key={item.menuItemId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Food Image Banner */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 150,
                        backgroundColor: '#F1F5F9',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {hasImage ? (
                        <img
                          src={item.imageUrl!}
                          alt={item.name}
                          onError={() => handleImageError(item.menuItemId)}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            color: '#94A3B8',
                          }}
                        >
                          <span style={{ fontSize: 36 }}>🍲</span>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>No Food Photo</span>
                        </div>
                      )}

                      {/* Category Badge Top-Left */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          backgroundColor: 'rgba(15, 23, 42, 0.8)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {item.categoryName}
                      </div>

                      {/* Availability Badge Top-Right */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          backgroundColor: item.isAvailable ? 'rgba(22, 163, 74, 0.95)' : 'rgba(220, 38, 38, 0.95)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          padding: '3px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                      >
                        <span>{item.isAvailable ? '✓' : '✕'}</span>
                        <span>{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                      </div>

                      {/* Diet Indicator Bottom-Left */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 10,
                          backgroundColor: '#FFFFFF',
                          padding: '3px 7px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            border: `2px solid ${item.isVeg ? '#16A34A' : '#DC2626'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              backgroundColor: item.isVeg ? '#16A34A' : '#DC2626',
                            }}
                          />
                        </span>
                        <span style={{ color: item.isVeg ? '#15803D' : '#B91C1C' }}>
                          {item.isVeg ? 'VEG' : 'NON-VEG'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {/* Name & Price Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <h4
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#0F172A',
                            margin: 0,
                            lineHeight: 1.3,
                            flex: 1,
                          }}
                        >
                          {item.name}
                        </h4>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: '#0369A1',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ₹{item.basePrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 12,
                          color: '#64748B',
                          margin: 0,
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          flex: 1,
                        }}
                      >
                        {item.description || 'No description provided by merchant.'}
                      </p>

                      {/* Metadata Row: Prep time, Package, GST, Rating */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        {item.preparationTime && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '2px 7px',
                              borderRadius: 4,
                            }}
                          >
                            ⏱️ {item.preparationTime}
                          </span>
                        )}

                        {item.packageSize && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '2px 7px',
                              borderRadius: 4,
                            }}
                          >
                            📦 {item.packageSize}
                          </span>
                        )}

                        {item.gstPct != null && item.gstPct > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '2px 7px',
                              borderRadius: 4,
                            }}
                          >
                            GST {item.gstPct}%
                          </span>
                        )}

                        {item.avgRating != null && item.avgRating > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#B45309',
                              backgroundColor: '#FEF3C7',
                              padding: '2px 7px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            ⭐ {item.avgRating.toFixed(1)} {item.reviewCount ? `(${item.reviewCount})` : ''}
                          </span>
                        )}

                        {Array.isArray(item.variants) && item.variants.length > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#6366F1',
                              backgroundColor: '#EEF2FF',
                              padding: '2px 7px',
                              borderRadius: 4,
                            }}
                          >
                            ✨ {item.variants.length} {item.variants.length === 1 ? 'Variant' : 'Variants'}
                          </span>
                        )}
                      </div>

                      {/* Variants expanded preview if any */}
                      {Array.isArray(item.variants) && item.variants.length > 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748B',
                            backgroundColor: '#F8FAFC',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <strong style={{ color: '#334155' }}>Variants: </strong>
                          {item.variants.map((v, idx) => {
                            const delta = typeof v.priceDelta === 'number' ? v.priceDelta : Number(v.priceDelta || 0);
                            const sign = delta > 0 ? ` (+₹${delta.toFixed(2)})` : delta < 0 ? ` (-₹${Math.abs(delta).toFixed(2)})` : '';
                            return (
                              <span key={v.id || idx}>
                                {idx > 0 && ', '}
                                {v.name}
                                {sign}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
