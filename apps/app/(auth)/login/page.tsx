'use client';

import React from 'react';
import { AdminLoginForm } from '@/features/auth/AdminLoginForm';

/**
 * Foodie Admin Console — Email & Password Login Page.
 */
export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#082F49',
        backgroundImage: 'radial-gradient(circle at 50% 25%, #0369A1 0%, #082F49 80%)',
        padding: '32px 16px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.35), 0 0 0 1px rgba(56, 189, 248, 0.2)',
          overflow: 'hidden',
          border: '1px solid #BAE6FD',
        }}
      >
        {/* Brand Header Banner */}
        <div
          style={{
            backgroundColor: '#0284C7',
            backgroundImage: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            padding: '28px 32px',
            color: '#FFFFFF',
            borderBottom: '4px solid #38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
                Foodie <span style={{ color: '#BAE6FD' }}>Admin</span>
              </div>
              <div style={{ fontSize: 12, color: '#E0F2FE', fontWeight: 600, marginTop: 2 }}>
                Hyperlocal Operations Portal
              </div>
            </div>
          </div>
        </div>

        {/* Form Body Container */}
        <div style={{ padding: '32px 32px 36px 32px' }}>
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}


