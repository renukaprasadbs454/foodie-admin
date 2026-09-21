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

const DEFAULT_TOP_RESTAURANTS: TopRestaurant[] = [
  { id: 'r1', name: 'Royal Biryani House', category: 'North Indian & Biryani', rating: 4.9, ordersCount: 428 },
  { id: 'r2', name: 'Bella Italia Pizzeria', category: 'Italian & Wood-Fired Pizza', rating: 4.8, ordersCount: 386 },
  { id: 'r3', name: 'Punjab Grill & Spice', category: 'Tandoori & Mughlai', rating: 4.8, ordersCount: 342 },
  { id: 'r4', name: 'Sweet Dreams Bakery', category: 'Cakes & Desserts', rating: 4.7, ordersCount: 295 },
  { id: 'r5', name: 'The Gourmet Burger Bistro', category: 'Burgers & Fries', rating: 4.7, ordersCount: 274 },
];

const DEFAULT_TOP_ITEMS: TopItem[] = [
  { id: 'i1', name: 'Chicken Dum Biryani (Special)', restaurant: 'Royal Biryani House', price: 340, salesCount: 284 },
  { id: 'i2', name: 'Wood-Fired Margherita Pizza', restaurant: 'Bella Italia Pizzeria', price: 420, salesCount: 231 },
  { id: 'i3', name: 'Paneer Butter Masala Combo', restaurant: 'Punjab Grill & Spice', price: 290, salesCount: 198 },
  { id: 'i4', name: 'Dark Chocolate Truffle Cake', restaurant: 'Sweet Dreams Bakery', price: 550, salesCount: 167 },
  { id: 'i5', name: 'Crispy Double Cheeseburger', restaurant: 'The Gourmet Burger Bistro', price: 260, salesCount: 152 },
];

interface Props {
  restaurants?: TopRestaurant[];
  items?: TopItem[];
}

export function TopPerformersWidget({ restaurants = [], items = [] }: Props) {
  const displayRestaurants = restaurants.length > 0 ? restaurants : DEFAULT_TOP_RESTAURANTS;
  const displayItems = items.length > 0 ? items : DEFAULT_TOP_ITEMS;

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
          boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #BAE6FD', paddingBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0C4A6E' }}>
            Top Rated Stores
          </div>
          <a href="/restaurants" style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
            View All →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayRestaurants.map((res, index) => (
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0C4A6E' }}>{res.name}</div>
                  <div style={{ fontSize: 11, color: '#0369A1' }}>{res.category}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0284C7' }}>
                  ★ {res.rating}
                </div>
                <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 600 }}>{res.ordersCount} orders</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel 2: Top Selling Products */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '20px 22px',
          border: '1px solid #BAE6FD',
          boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #BAE6FD', paddingBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0C4A6E' }}>
            Trending Popular Items
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '2px 8px', borderRadius: 10, border: '1px solid #BAE6FD' }}>
            Top Volume
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayItems.map((item, index) => (
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0C4A6E' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#0369A1' }}>{item.restaurant}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0284C7' }}>₹{item.price.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#0369A1' }}>{item.salesCount} sold</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
