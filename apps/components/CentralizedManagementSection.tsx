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
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
              <span style={{ color: '#2196F3' }}>Zone-wise</span> Business Setup
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.6, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              With Foodie, you can choose in which area your food delivery business will be effective by simply adding geo-boundary points on the map. It is unbelievably simple yet a very powerful tool in your hand.
            </p>
          </div>

          {/* Interactive Map Visual */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E5E7EB',
              padding: 14,
            }}
          >
            <div
              style={{
                height: 180,
                backgroundColor: '#F5F7FA',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #D1D5DB',
              }}
            >
              {/* SVG Grid Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.3,
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
                    background: selectedZone.id === z.id ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : '#FFFFFF',
                    color: selectedZone.id === z.id ? '#FFFFFF' : '#4B5563',
                    border: selectedZone.id === z.id ? 'none' : '1px solid #E5E7EB',
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: selectedZone.id === z.id ? '0 2px 8px rgba(33, 150, 243, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transform: selectedZone.id === z.id ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {z.name}
                </button>
              ))}

              <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, fontWeight: 600, color: '#4B5563' }}>
                Active Zone: <span style={{ color: '#2196F3' }}>{selectedZone.name}</span> ({selectedZone.activeStores} Food Outlets)
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
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
              <span style={{ color: '#2196F3' }}>Centralized</span> Business Management
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.6, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
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
              { label: 'Fine Dining & Pizzerias', count: '18 Active Outlets' },
              { label: 'Cafes & Bakery', count: '12 Active Outlets' },
              { label: 'Cloud Kitchens', count: '8 Active Outlets' },
              { label: 'All Food Delivery', count: '42 Total Outlets' },
            ].map((m) => {
              const isSelected = activeModuleTile === m.label;
              return (
                <div
                  key={m.label}
                  onClick={() => setActiveModuleTile(m.label)}
                  style={{
                    backgroundColor: isSelected ? '#2196F3' : '#F9FAFB',
                    backgroundImage: isSelected ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'none',
                    color: isSelected ? '#FFFFFF' : '#111827',
                    borderRadius: 14,
                    padding: '16px',
                    border: isSelected ? 'none' : '1px solid #E5E7EB',
                    boxShadow: isSelected ? '0 4px 12px rgba(33, 150, 243, 0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.85)' : '#6B7280', marginTop: 4 }}>{m.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
