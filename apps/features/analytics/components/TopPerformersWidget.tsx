'use client';

import React from 'react';

interface TopRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  ordersCount: number;
  image?: string;
}

interface TopItem {
  id: string;
  name: string;
  restaurant: string;
  price: number;
  salesCount: number;
  icon?: string;
}

interface Props {
  restaurants?: TopRestaurant[];
  items?: TopItem[];
  isLoading?: boolean;
  error?: string | null;
}

export function TopPerformersWidget({ restaurants = [], items = [], isLoading = false, error = null }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
      }}
    >
      {/* Panel 1: Top Restaurants */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '24px 26px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
            Top Rated Stores
          </div>
          <a href="/restaurants" style={{ fontSize: 13, fontWeight: 600, color: '#2196F3', textDecoration: 'none' }}>
            View All →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            ))
          ) : error ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#EF4444', fontSize: 13 }}>
              {error}
            </div>
          ) : restaurants.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              No store performance metrics available.
            </div>
          ) : (
            restaurants.map((res, index) => (
              <div
                key={res.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: index === 0 ? '#E3F2FD' : '#F3F4F6',
                      color: index === 0 ? '#2196F3' : '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{res.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{res.category}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>{res.rating > 0 ? res.rating : 0}</span>

                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{res.ordersCount} orders</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel 2: Top Selling Products */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '24px 26px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
            Trending Popular Items
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '3px 9px', borderRadius: 9999 }}>
            Top Volume
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            ))
          ) : error ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#EF4444', fontSize: 13 }}>
              {error}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              No trending items recorded yet.
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: index === 0 ? '#E3F2FD' : '#F3F4F6',
                      color: index === 0 ? '#2196F3' : '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{item.restaurant}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>₹{item.price.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{item.salesCount} sold</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

