'use client';

import React, { useState } from 'react';
import type { DarkstoreOrderItem } from '../types';

export function DarkstorePickingPage() {
  const [activeOrderId] = useState('FD-10234');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'COOLER' | 'SNACKS' | 'PENDING'>('ALL');
  const [items, setItems] = useState<DarkstoreOrderItem[]>([
    {
      id: 'doi11111-1111-1111-1111-111111111111',
      productId: 'dp111111-0000-0000-0000-000000000001',
      sku: 'MILK-AMUL-500ML',
      productName: 'Amul Taaza Toned Fresh Milk 500ml',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
      shelfLocation: 'Shelf A-01 (Cooler)',
      quantityRequested: 2,
      quantityPicked: 2,
      unitPrice: 28.0,
      status: 'PICKED',
    },
    {
      id: 'doi22222-2222-2222-2222-222222222222',
      productId: 'dp222222-0000-0000-0000-000000000002',
      sku: 'BREAD-BRIT-400G',
      productName: 'Britannia Brown Bread Whole Wheat 400g',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
      shelfLocation: 'Shelf A-12',
      quantityRequested: 1,
      quantityPicked: 0,
      unitPrice: 45.0,
      status: 'PENDING',
    },
    {
      id: 'doi33333-3333-3333-3333-333333333333',
      productId: 'dp444444-0000-0000-0000-000000000004',
      sku: 'COKE-ZERO-330ML',
      productName: 'Coca-Cola Zero Sugar Can 330ml',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300',
      shelfLocation: 'Shelf C-08 (Chiller)',
      quantityRequested: 2,
      quantityPicked: 1,
      unitPrice: 38.0,
      status: 'PENDING',
    },
    {
      id: 'doi44444-4444-4444-4444-444444444444',
      productId: 'dp333333-0000-0000-0000-000000000003',
      sku: 'CHIPS-LAYS-MAGIC-50G',
      productName: "Lay's India's Magic Masala Chips 50g",
      imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300',
      shelfLocation: 'Shelf B-04 (Snacks)',
      quantityRequested: 3,
      quantityPicked: 0,
      unitPrice: 20.0,
      status: 'PENDING',
    },
    {
      id: 'doi55555-5555-5555-5555-555555555555',
      productId: 'dp555555-0000-0000-0000-000000000005',
      sku: 'YOGURT-EPIG-85G',
      productName: 'Epigamia Greek Yogurt Natural 85g',
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300',
      shelfLocation: 'Shelf A-05 (Cooler)',
      quantityRequested: 2,
      quantityPicked: 0,
      unitPrice: 55.0,
      status: 'PENDING',
    },
    {
      id: 'doi66666-6666-6666-6666-666666666666',
      productId: 'dp666666-0000-0000-0000-000000000006',
      sku: 'CHOC-FERRERO-16P',
      productName: 'Ferrero Rocher Premium Chocolate Box 16 Pcs',
      imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300',
      shelfLocation: 'Shelf D-02 (Premium)',
      quantityRequested: 1,
      quantityPicked: 0,
      unitPrice: 499.0,
      status: 'PENDING',
    },
    {
      id: 'doi77777-7777-7777-7777-777777777777',
      productId: 'dp777777-0000-0000-0000-000000000007',
      sku: 'OIL-FORTUNE-1L',
      productName: 'Fortune Sunlite Refined Sunflower Oil 1L',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
      shelfLocation: 'Shelf E-10 (Pantry)',
      quantityRequested: 1,
      quantityPicked: 0,
      unitPrice: 145.0,
      status: 'PENDING',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePickIncrement = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextPicked = Math.min(item.quantityRequested, item.quantityPicked + 1);
          return {
            ...item,
            quantityPicked: nextPicked,
            status: nextPicked >= item.quantityRequested ? 'PICKED' : 'PENDING',
          };
        }
        return item;
      })
    );
  };

  const handleBatchPickAll = () => {
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'UNAVAILABLE'
          ? item
          : { ...item, quantityPicked: item.quantityRequested, status: 'PICKED' }
      )
    );
    setToastMessage('All remaining items batch-marked as picked!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkUnavailable = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'UNAVAILABLE' } : item))
    );
    setToastMessage('Item marked as unavailable. Customer notification dispatched.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredItems = items.filter((item) => {
    if (zoneFilter === 'COOLER') {
      return item.shelfLocation.toLowerCase().includes('cooler') || item.shelfLocation.toLowerCase().includes('chiller');
    }
    if (zoneFilter === 'SNACKS') {
      return item.shelfLocation.toLowerCase().includes('snacks') || item.shelfLocation.toLowerCase().includes('pantry') || item.shelfLocation.toLowerCase().includes('premium');
    }
    if (zoneFilter === 'PENDING') {
      return item.status === 'PENDING';
    }
    return true;
  });

  const totalRequested = items.reduce((acc, i) => acc + i.quantityRequested, 0);
  const totalPicked = items.reduce((acc, i) => acc + i.quantityPicked, 0);
  const pickProgress = Math.round((totalPicked / totalRequested) * 100);
  const isComplete = items.every((i) => i.status === 'PICKED' || i.status === 'UNAVAILABLE');

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', margin: 0 }}>
             Picker Execution Station
          </h1>
          <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0' }}>
            Active Pick Order: <strong style={{ color: '#0369A1' }}>{activeOrderId}</strong> | Assigned Picker: <strong>Karan Verma</strong> | Total Items: <strong>{items.length} SKUs ({totalRequested} units)</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isComplete && (
            <button
              type="button"
              onClick={handleBatchPickAll}
              style={{
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              Fast Pick All
            </button>
          )}
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0369A1', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: 20 }}>
            Pick Progress: {pickProgress}% Complete ({totalPicked}/{totalRequested} units)
          </span>
        </div>
      </div>

      {toastMessage && (
        <div style={{ backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          {toastMessage}
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ height: 10, width: '100%', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 5, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pickProgress}%`, background: 'linear-gradient(90deg, #38BDF8 0%, #0284C7 100%)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Shelf Zone Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'ALL', label: `All Items (${items.length})` },
          { key: 'COOLER', label: `Cooler & Chiller (${items.filter(i => i.shelfLocation.toLowerCase().includes('cooler') || i.shelfLocation.toLowerCase().includes('chiller')).length})` },
          { key: 'SNACKS', label: `Snacks & Pantry (${items.filter(i => i.shelfLocation.toLowerCase().includes('snacks') || i.shelfLocation.toLowerCase().includes('pantry') || i.shelfLocation.toLowerCase().includes('premium')).length})` },
          { key: 'PENDING', label: `Pending Pick (${items.filter(i => i.status === 'PENDING').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setZoneFilter(tab.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: zoneFilter === tab.key ? 800 : 600,
              backgroundColor: zoneFilter === tab.key ? '#0284C7' : '#F0F9FF',
              color: zoneFilter === tab.key ? '#FFFFFF' : '#0369A1',
              border: zoneFilter === tab.key ? '1px solid #0284C7' : '1px solid #BAE6FD',
              boxShadow: zoneFilter === tab.key ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pick Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: item.status === 'PICKED' ? '#F0F9FF' : item.status === 'UNAVAILABLE' ? '#F8FAFC' : '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              border: item.status === 'PICKED' ? '2px solid #0284C7' : item.status === 'UNAVAILABLE' ? '1px dashed #94A3B8' : '1px solid #BAE6FD',
              boxShadow: item.status === 'PICKED' ? '0 4px 14px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #BAE6FD' }}
                />
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                  Shelf Location: {item.shelfLocation}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>{item.productName}</div>
                <div style={{ fontSize: 12, color: '#0284C7' }}>
                  SKU: {item.sku} | Unit Price: ₹{item.unitPrice.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0369A1' }}>
                  {item.quantityPicked} / {item.quantityRequested}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor:
                      item.status === 'PICKED'
                        ? '#E0F2FE'
                        : item.status === 'UNAVAILABLE'
                        ? '#F1F5F9'
                        : '#F0F9FF',
                    color:
                      item.status === 'PICKED'
                        ? '#0369A1'
                        : item.status === 'UNAVAILABLE'
                        ? '#64748B'
                        : '#0284C7',
                    border:
                      item.status === 'PICKED'
                        ? '1px solid #BAE6FD'
                        : item.status === 'UNAVAILABLE'
                        ? '1px solid #CBD5E1'
                        : '1px solid #BAE6FD',
                  }}
                >
                  STATUS: {item.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handlePickIncrement(item.id)}
                  disabled={item.quantityPicked >= item.quantityRequested}
                  style={{
                    backgroundColor: item.quantityPicked >= item.quantityRequested ? '#BAE6FD' : '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: item.quantityPicked >= item.quantityRequested ? 'not-allowed' : 'pointer',
                    opacity: item.quantityPicked >= item.quantityRequested ? 0.6 : 1,
                    boxShadow: item.quantityPicked >= item.quantityRequested ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  + Pick Item
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkUnavailable(item.id)}
                  style={{
                    backgroundColor: '#F0F9FF',
                    color: '#0369A1',
                    border: '1px solid #BAE6FD',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Report Missing
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Action */}
      {isComplete && (
        <div style={{ marginTop: 32, padding: 20, backgroundColor: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD', textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0369A1', margin: '0 0 8px' }}>
            All {items.length} Items Picked!
          </h3>
          <p style={{ fontSize: 13, color: '#0284C7', margin: '0 0 16px' }}>
            Order {activeOrderId} picking is complete. Please hand over the crate ({totalRequested} items) to the packing station.
          </p>
          <a
            href="/darkstore-admin/packing"
            style={{
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-block',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            Send to Packing Station →
          </a>
        </div>
      )}
    </div>
  );
}


