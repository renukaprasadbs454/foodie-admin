'use client';

import React from 'react';

export function DarkstoreSettingsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0369A1', margin: 0 }}>
          Darkstore Workstation Settings
        </h1>
        <p style={{ fontSize: 13, color: '#0284C7', margin: '4px 0 0' }}>
          Terminal configuration, barcode scanner pairing, printer setup, and picking audio chimes.
        </p>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, border: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
            Assigned Workstation Terminal ID:
          </label>
          <input type="text" value="TERM-IND-01 (Packing Station #1)" disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF', color: '#0369A1', fontSize: 13, fontWeight: 600 }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
            Barcode Scanner Status:
          </label>
          <div style={{ fontSize: 13, color: '#0369A1', fontWeight: 800 }}>
            🔵 Bluetooth Handheld Scanner Paired (Zebra DS2208)
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
            Thermal Bag Seal Printer:
          </label>
          <div style={{ fontSize: 13, color: '#0369A1', fontWeight: 800 }}>
            🔵 Connected (TSP143III Thermal Printer)
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 6 }}>
            New Order Chime Audio Volume:
          </label>
          <input type="range" min="0" max="100" defaultValue="80" style={{ width: '100%', accentColor: '#0284C7' }} />
        </div>
      </div>
    </div>
  );
}
