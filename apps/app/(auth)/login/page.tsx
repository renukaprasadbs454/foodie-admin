'use client';

import React from 'react';
import { AdminLoginForm } from '@/features/auth/AdminLoginForm';

/**
 * Foodie Admin Console — Email & Password Login Page (Sky Blue Theme).
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
        backgroundImage: 'radial-gradient(circle at 50% 20%, #075985 0%, #0C4A6E 40%, #082F49 100%)',
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
          boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.2)',
          overflow: 'hidden',
          border: '1px solid #BAE6FD',
        }}
      >
        {/* Brand Header Banner */}
        <div
          style={{
            backgroundColor: '#075985',
            backgroundImage: 'linear-gradient(135deg, #075985 0%, #0284C7 100%)',
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
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
                Foodie <span style={{ color: '#38BDF8' }}>Admin</span>
              </div>
              <div style={{ fontSize: 11, color: '#BAE6FD', fontWeight: 600 }}>
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
