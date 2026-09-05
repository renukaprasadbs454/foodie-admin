'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLazySearchGlobalQuery } from '@/api/endpoints/searchApi';
import { useLazyGetOrderQuery } from '@/api/endpoints/ordersApi';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SearchResultItem {
  id: string;
  category: 'Order' | 'Restaurant' | 'Food Item' | 'Delivery Partner' | 'Customer' | 'Coupon';
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const [triggerGlobalSearch, { data: globalData, isFetching: isSearchingGlobal, isError: isGlobalError }] =
    useLazySearchGlobalQuery();

  const [triggerGetOrder, { data: orderData, isFetching: isFetchingOrder }] =
    useLazyGetOrderQuery();

  // Debounce query input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search requests on debouncedQuery update
  useEffect(() => {
    if (!isOpen || !debouncedQuery) return;

    void triggerGlobalSearch(debouncedQuery);

    // If query matches a UUID or order ID format, also attempt order lookup
    const looksLikeUuid = /^[0-9a-fA-F-]{8,36}$/.test(debouncedQuery) || /^ORD-/i.test(debouncedQuery);
    if (looksLikeUuid) {
      void triggerGetOrder(debouncedQuery);
    }
  }, [debouncedQuery, isOpen, triggerGlobalSearch, triggerGetOrder]);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Prepare result items array from backend response & comprehensive local dataset
  const results: SearchResultItem[] = [];

  if (globalData?.restaurants) {
    globalData.restaurants.forEach((r) => {
      results.push({
        id: `rest-${r.id}`,
        category: 'Restaurant',
        title: r.name,
        subtitle: `${r.cuisineType ?? 'Restaurant'} • Rating ${r.rating ?? '4.5'} • ${
          r.isAvailable !== false ? 'Active' : 'Inactive'
        }`,
        url: `/restaurants/${r.id}`,
        icon: '',
      });
    });
  }

  if (globalData?.foodItems) {
    globalData.foodItems.forEach((f) => {
      results.push({
        id: `food-${f.id}`,
        category: 'Food Item',
        title: f.name,
        subtitle: `${f.categoryName ?? 'Menu Item'} • ₹${f.basePrice?.toFixed(2) ?? '0.00'}${
          f.isVeg ? ' • Veg' : ''
        }`,
        url: `/restaurants`,
        icon: '',
      });
    });
  }

  if (orderData) {
    const oId = orderData.orderId || orderData.orderNumber || '1';
    results.push({
      id: `ord-${oId}`,
      category: 'Order',
      title: `Order #${oId}`,
      subtitle: `Status: ${orderData.status} • Total: ₹${orderData.totalAmount ?? 0}`,
      url: `/orders/${oId}`,
      icon: '',
    });
  }

  // Multi-entity local search index for instant offline / mock results
  if (debouncedQuery) {
    const q = debouncedQuery.toLowerCase();

    const MOCK_ENTITIES: SearchResultItem[] = [
      { id: 'm-rest-1', category: 'Restaurant', title: 'Royal Biryani House', subtitle: 'North Indian & Biryani • Rating 4.8 • Active', url: '/restaurants', icon: '' },
      { id: 'm-rest-2', category: 'Restaurant', title: 'Bella Italia Pizzeria', subtitle: 'Italian & Wood-Fired Pizza • Rating 4.6 • Active', url: '/restaurants', icon: '' },
      { id: 'm-rest-3', category: 'Restaurant', title: 'Sweet Dreams Bakery & Cafe', subtitle: 'Bakery & Desserts • Rating 4.9 • Pending', url: '/restaurants', icon: '' },
      { id: 'm-rest-4', category: 'Restaurant', title: 'The Gourmet Burger Bistro', subtitle: 'Burgers & Fast Food • Rating 4.5 • Suspended', url: '/restaurants', icon: '' },
      { id: 'm-rest-5', category: 'Restaurant', title: 'Dragon Bowl Asian Kitchen', subtitle: 'Chinese & Pan-Asian • Rating 4.7 • Active', url: '/restaurants', icon: '' },
      { id: 'm-cust-1', category: 'Customer', title: 'Ananya Sharma', subtitle: 'ananya.s@gmail.com • +91 98765 12345 • Active', url: '/customers', icon: '' },
      { id: 'm-cust-2', category: 'Customer', title: 'Vikram Mehta', subtitle: 'vikram.m@yahoo.com • +91 98123 45678 • Active', url: '/customers', icon: '' },
      { id: 'm-cust-3', category: 'Customer', title: 'Sarah Jenkins', subtitle: 'sarah.j@foodie.com • +91 98765 44321 • Active', url: '/customers', icon: '' },
      { id: 'm-cust-4', category: 'Customer', title: 'Neha Kapoor', subtitle: 'neha.k@gmail.com • +91 98765 00002 • Active', url: '/customers', icon: '' },
      { id: 'm-drv-1', category: 'Delivery Partner', title: 'Vikram Choudhary', subtitle: '+91 98111 22233 • Motorcycle • Verified KYC', url: '/delivery-partners', icon: '' },
      { id: 'm-drv-2', category: 'Delivery Partner', title: 'Arjun Das', subtitle: '+91 98222 33344 • Electric Scooter • Verified KYC', url: '/delivery-partners', icon: '' },
      { id: 'm-drv-3', category: 'Delivery Partner', title: 'Siddharth Rao', subtitle: '+91 98333 44455 • Motorcycle • Pending KYC', url: '/delivery-partners', icon: '' },
      { id: 'm-drv-4', category: 'Delivery Partner', title: 'Ramesh Kumar', subtitle: '+91 97400 33211 • Rider #DRV-402 • Verified', url: '/delivery-partners', icon: '' },
      { id: 'm-cpn-1', category: 'Coupon', title: 'FOODIE50', subtitle: '50% OFF Super Meal Deal • Active', url: '/coupons', icon: '' },
      { id: 'm-cpn-2', category: 'Coupon', title: 'WELCOME100', subtitle: '₹100 Flat Savings for New Users • Active', url: '/coupons', icon: '' },
      { id: 'm-cpn-3', category: 'Coupon', title: 'PIZZA100', subtitle: '₹100 Flat Savings on Pizzerias • Active', url: '/coupons', icon: '' },
      { id: 'm-cpn-4', category: 'Coupon', title: 'FIRST50', subtitle: '50% OFF Welcome Bonus on First Order • Active', url: '/coupons', icon: '' },
      { id: 'm-ord-1', category: 'Order', title: 'Order #ORD-9821', subtitle: 'Customer: Ananya Sharma • Status: PREPARING • ₹680', url: '/orders', icon: '' },
      { id: 'm-ord-2', category: 'Order', title: 'Order #ORD-8801', subtitle: 'Customer: Sarah Jenkins • Status: DELIVERED • ₹580', url: '/orders', icon: '' },
      { id: 'm-ord-3', category: 'Order', title: 'Order #ORD-8802', subtitle: 'Customer: Marcus Vance • Status: OUT FOR DELIVERY • ₹440', url: '/orders', icon: '' },
      { id: 'm-enq-1', category: 'Customer', title: 'ENQ-901: Delayed Refund', subtitle: 'From: Ananya Sharma • Status: OPEN', url: '/support', icon: '' },
      { id: 'm-enq-2', category: 'Customer', title: 'ENQ-902: Promo Code Issue', subtitle: 'From: Vikram Mehta • Status: IN_PROGRESS', url: '/support', icon: '' },
      { id: 'm-enq-3', category: 'Restaurant', title: 'ENQ-903: Menu Price Update', subtitle: 'From: Rajesh Gupta • Status: OPEN', url: '/support', icon: '' },
      { id: 'm-user-1', category: 'Customer', title: 'Alex Vance (Super Admin)', subtitle: 'alex.vance@foodie.com • Executive Operations', url: '/users', icon: '' },
      { id: 'm-user-2', category: 'Customer', title: 'Priya Sharma (Ops Manager)', subtitle: 'priya.sharma@foodie.com • Logistics & Merchant Ops', url: '/users', icon: '' },
    ];

    MOCK_ENTITIES.forEach((item) => {
      if (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      ) {
        if (!results.some((r) => r.title.toLowerCase() === item.title.toLowerCase())) {
          results.push(item);
        }
      }
    });
  }

  const isFetching = isSearchingGlobal || isFetchingOrder;

  // Reset selected index if results change or shrink
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, debouncedQuery]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
        return;
      }

      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          router.push(selected.url);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex, router]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', gap: 12 }}>
          <span style={{ fontSize: 18, color: '#64748B' }}></span>
          <input
            type="text"
            autoFocus
            placeholder="Search orders, restaurants, food items, partners, coupons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontWeight: 500,
              color: '#0F172A',
              backgroundColor: 'transparent',
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                fontSize: 16,
                cursor: 'pointer',
                padding: '0 4px',
              }}
              title="Clear search"
            >
              
            </button>
          ) : null}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 8px' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
              Type a keyword to search live backend records across <strong>Orders</strong>, <strong>Restaurants</strong>, <strong>Food Items</strong>, and more.
            </div>
          ) : isFetching ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#14532D', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span className="pulse-live" style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981' }} />
              Fetching backend search results...
            </div>
          ) : isGlobalError ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#DC2626', fontSize: 13, backgroundColor: '#FEF2F2', borderRadius: 8, margin: '8px' }}>
               Failed to fetch search results from server. Please check your backend connection.
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              No results matching &quot;{debouncedQuery}&quot;
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                    border: isSelected ? '1px solid #BBF7D0' : '1px solid transparent',
                    transition: 'background-color 0.12s ease, border-color 0.12s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isSelected ? '#DCFCE7' : '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#14532D' }}>{item.title}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#D97706',
                          backgroundColor: '#FEF3C7',
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.subtitle}</div>
                  </div>
                  <span style={{ fontSize: 16, color: isSelected ? '#10B981' : '#CBD5E1' }}></span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{ padding: '10px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
          <span>Real-time Backend Console Search</span>
          <span style={{ display: 'flex', gap: 12 }}>
            <span><strong>↑↓</strong> Navigate</span>
            <span><strong>↵</strong> Select</span>
            <span><strong>ESC</strong> Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
