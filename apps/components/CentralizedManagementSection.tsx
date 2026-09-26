'use client';

import React, { useState } from 'react';

const ZONES = [
  { id: 'z1', name: 'Downtown Central', activeStores: 18, color: '#0284C7', lat: '12.9716° N', lng: '77.5946° E' },
  { id: 'z2', name: 'Tech Park & IT Corridor', activeStores: 14, color: '#0369A1', lat: '12.9279° N', lng: '77.6271° E' },
  { id: 'z3', name: 'Suburban Food Hub', activeStores: 10, color: '#0EA5E9', lat: '13.0358° N', lng: '77.5970° E' },
];

export function CentralizedManagementSection() {
  const [selectedZone, setSelectedZone] = useState(ZONES[0]);
  const [activeModuleTile, setActiveModuleTile] = useState('Fine Dining & Pizzerias');

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: 24,
        marginTop: 28,
        marginBottom: 28,
      }}
    >
      {/* Card 1: Zone-wise Food Business Setup */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '32px 28px',
          border: '1px solid #BAE6FD',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
        }}
      >
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', margin: 0 }}>
              <span style={{ color: '#0284C7' }}>Zone-wise</span> Business Setup
            </h2>
            <p style={{ fontSize: 13, color: '#0284C7', marginTop: 10, lineHeight: 1.6, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              With Foodie, you can choose in which area your food delivery business will be effective by simply adding geo-boundary points on the map. It is unbelievably simple yet a very powerful tool in your hand.
            </p>
          </div>

          {/* Interactive Map Visual */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '2px solid #0284C7',
              padding: 16,
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.12)',
            }}
          >
            <div
              style={{
                height: 180,
                backgroundColor: '#F0F9FF',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #BAE6FD',
              }}
            >
              {/* SVG Grid Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(#0284C7 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.2,
                }}
              />

              {/* Map Geo Pins */}
              {ZONES.map((z, idx) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZone(z)}
                  style={{
                    position: 'absolute',
                    top: `${30 + idx * 25}%`,
                    left: `${25 + idx * 30}%`,
                    backgroundColor: selectedZone.id === z.id ? '#0284C7' : '#FFFFFF',
                    backgroundImage: selectedZone.id === z.id ? 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)' : 'none',
                    color: selectedZone.id === z.id ? '#FFFFFF' : '#0369A1',
                    border: '2px solid #0284C7',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(14, 165, 233, 0.25)',
                    transform: selectedZone.id === z.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  📍 {z.name}
                </button>
              ))}

              <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, fontWeight: 700, color: '#0369A1' }}>
                🗺️ Active Zone: {selectedZone.name} ({selectedZone.activeStores} Food Outlets)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Centralized Food Business Management */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '32px 28px',
          border: '1px solid #BAE6FD',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
        }}
      >
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', margin: 0 }}>
              <span style={{ color: '#0284C7' }}>Centralized</span> Business Management
            </h2>
            <p style={{ fontSize: 13, color: '#0284C7', marginTop: 10, lineHeight: 1.6, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              You can have multiple food delivery modules on your Foodie system, but managing them is simpler than you imagine. One centralized control for managing everything in your entire system.
            </p>
          </div>

          {/* Module Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {[
              { label: 'Fine Dining & Pizzerias', icon: '🍕', count: '18 Active Outlets' },
              { label: 'Cafes & Bakery', icon: '☕', count: '12 Active Outlets' },
              { label: 'Cloud Kitchens', icon: '🍳', count: '8 Active Outlets' },
              { label: 'All Food Delivery', icon: '🛵', count: '42 Total Outlets' },
            ].map((m) => {
              const isSelected = activeModuleTile === m.label;
              return (
                <div
                  key={m.label}
                  onClick={() => setActiveModuleTile(m.label)}
                  style={{
                    backgroundColor: isSelected ? '#0284C7' : '#F0F9FF',
                    backgroundImage: isSelected ? 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)' : 'none',
                    color: isSelected ? '#FFFFFF' : '#0369A1',
                    borderRadius: 12,
                    padding: '16px',
                    border: isSelected ? '2px solid #38BDF8' : '1px solid #BAE6FD',
                    boxShadow: isSelected ? '0 4px 12px rgba(14, 165, 233, 0.35)' : '0 2px 6px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 24 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 11, opacity: isSelected ? 0.95 : 0.8, marginTop: 2 }}>{m.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
