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
}

export function TopPerformersWidget({ restaurants = [], items = [] }: Props) {
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
          borderRadius: 14,
          padding: '20px 22px',
          border: '1px solid #BAE6FD',
          boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #BAE6FD', paddingBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0369A1' }}>
            🏪 Top Rated Stores
          </div>
          <a href="/restaurants" style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textDecoration: 'underline' }}>
            View All →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {restaurants.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#0284C7', fontSize: 13 }}>
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
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0284C7', width: 14 }}>#{index + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>{res.name}</div>
                    <div style={{ fontSize: 11, color: '#0284C7' }}>{res.category}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0284C7' }}>
                    ★ {res.rating}
                  </div>
                  <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 600 }}>{res.ordersCount} orders</div>
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
          borderRadius: 14,
          padding: '20px 22px',
          border: '1px solid #BAE6FD',
          boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #BAE6FD', paddingBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0369A1' }}>
            🔥 Trending Popular Items
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '2px 8px', borderRadius: 10 }}>
            Top Volume
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#0284C7', fontSize: 13 }}>
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
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0284C7', width: 14 }}>#{index + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#0284C7' }}>{item.restaurant}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0369A1' }}>₹{item.price.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#0284C7' }}>{item.salesCount} sold</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
