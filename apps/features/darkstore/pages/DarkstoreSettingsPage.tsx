'use client';

import React from 'react';

export function DarkstoreSettingsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
          Darkstore Workstation Settings
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Terminal configuration, barcode scanner pairing, printer setup, and picking audio chimes.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Assigned Workstation Terminal ID
          </label>
          <input
            type="text"
            value="TERM-IND-01 (Packing Station #1)"
            disabled
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Barcode Scanner Status
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
              Bluetooth Handheld Scanner Paired (Zebra DS2208)
            </span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Thermal Bag Seal Printer
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
              Connected (TSP143III Thermal Printer)
            </span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            New Order Chime Audio Volume
          </label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            style={{ width: '100%', accentColor: '#2196F3' }}
          />
        </div>
      </div>
    </div>
  );
}
