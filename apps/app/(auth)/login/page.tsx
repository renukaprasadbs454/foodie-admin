'use client';

import React from 'react';
import { AdminLoginForm } from '@/features/auth/AdminLoginForm';

/**
 * Foodie Admin Console — Premium Blue & White SaaS Authentication Portal.
 */
export default function LoginPage() {
  return (
    <main className="foodie-login-page">
      <div className="foodie-login-card">
        {/* Foodie Branding Header Banner */}
        <header className="foodie-login-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Foodie Brand Icon Badge */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            </div>

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                }}
              >
                Foodie <span style={{ opacity: 0.95, fontWeight: 700 }}>Admin</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#E3F2FD',
                  fontWeight: 600,
                  letterSpacing: '0.015em',
                  marginTop: 2,
                }}
              >
                Admin Operations Portal
              </div>
            </div>
          </div>

          {/* Secure Environment Indicator Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 9999,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                boxShadow: '0 0 6px #22C55E',
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            <span>SECURE</span>
          </div>
        </header>

        {/* Form Body Container */}
        <div className="foodie-login-body" suppressHydrationWarning>
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
