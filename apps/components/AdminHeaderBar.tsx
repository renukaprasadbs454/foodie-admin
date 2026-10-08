'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';

import { useAppSelector } from '@/store/hooks';

interface AdminHeaderBarProps {
  role?: string | null;
  userId?: string | null;
  onLogout?: () => void;
  loggingOut?: boolean;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

type PolicyTab = 'ABOUT' | 'PRIVACY' | 'TERMS' | 'CONTACT' | null;

export function AdminHeaderBar({
  role,
  userId,
  onLogout,
  loggingOut = false,
  isCompact = false,
  onToggleCompact,
}: AdminHeaderBarProps) {
  const authState = useAppSelector((state) => state.auth);
  const currentUserRole = role || authState.role || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role')) : null) || 'SUPER_ADMIN';
  const currentUserEmail = authState.email || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_email') || sessionStorage.getItem('foodie_admin_email')) : null) || (userId && userId.includes('@') ? userId : null) || 'admin@foodie.local';
  const currentUserName = authState.fullName || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_fullname') || sessionStorage.getItem('foodie_admin_fullname')) : null) || (currentUserRole === 'AUDITOR' ? 'Compliance Auditor' : (currentUserRole === 'FINANCE_ADMIN' ? 'Finance Admin' : 'Admin Operator'));
  const currentUserPhone = authState.phone || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_admin_phone') || sessionStorage.getItem('foodie_admin_phone')) : null) || '+91 98765 43210';

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Active Policy / Info Modal State
  const [activeModalTab, setActiveModalTab] =
    useState<PolicyTab>(null);

  /*
   * Close profile menu when clicking outside
   */
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const clickedProfileButton =
        profileDropdownRef.current?.contains(target);

      const clickedProfileMenu =
        profileMenuRef.current?.contains(target);

      if (!clickedProfileButton && !clickedProfileMenu) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  /*
   * Modal Content
   */
  const renderModalContent = () => {
    switch (activeModalTab) {
      case 'ABOUT':
        return {
          title: 'About us',
          subtitle:
            'Enterprise Hyperlocal Multi-Vendor Platform',
          body: (
            <div
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#0369A1',
              }}
            >
              <p style={{ margin: '0 0 12px 0' }}>
                Foodie Admin is the centralized operational
                console for managing hyperlocal food delivery
                networks, cloud kitchens, bakeries, cafes, and
                courier logistics.
              </p>

              <p style={{ margin: 0 }}>
                Powered by a robust Spring Boot microservice
                backend and Next.js frontend, Foodie connects
                customers, restaurants, and delivery dispatchers
                with real-time order tracking and automated
                payout management.
              </p>
            </div>
          ),
        };

      case 'PRIVACY':
        return {
          title: ' Privacy policy',
          subtitle:
            'Enterprise Data Security & Privacy Guidelines',
          body: (
            <div
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#0369A1',
              }}
            >
              <p style={{ margin: '0 0 10px 0' }}>
                We prioritize user and merchant privacy with
                strict compliance standards:
              </p>

              <ul
                style={{
                  paddingLeft: '20px',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <li>
                  All network communications are secured with
                  256-bit SSL encryption.
                </li>

                <li>
                  Delivery driver KYC documents are stored
                  securely with temporary signed URLs.
                </li>

                <li>
                  Payment transaction data complies with strict
                  PCI-DSS guidelines.
                </li>
              </ul>
            </div>
          ),
        };

      case 'TERMS':
        return {
          title: ' Terms and condition',
          subtitle:
            'Operational Rules & Platform Terms of Service',
          body: (
            <div
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#0369A1',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#F0F9FF',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <strong>Merchant Terms:</strong>{' '}
                  Restaurants agree to keep menu items and
                  availability updated in real-time.
                </div>

                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#F0F9FF',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <strong>
                    Delivery Partner Agreement:
                  </strong>{' '}
                  Delivery partners earn minimum guaranteed
                  payouts per assignment or per-kilometer rates
                  (whichever is greater).
                </div>

                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#F0F9FF',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <strong>Order Fulfillment:</strong>{' '}
                  Order cancellations and refund policies follow
                  standard platform SLAs.
                </div>
              </div>
            </div>
          ),
        };

      case 'CONTACT':
        return {
          title: ' Contact us',
          subtitle: 'Operations & Technical Support Desk',
          body: (
            <div
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#0369A1',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <strong>Phone Support:</strong>{' '}
                  {currentUserPhone}
                </div>

                <div>
                  <strong>Email:</strong> {currentUserEmail}
                </div>

                <div>
                  <strong>Headquarters:</strong> Foodie HQ,
                  Level 2, Avenue 11, Bangalore 560103, India
                </div>

                <div
                  style={{
                    backgroundColor: '#F0F9FF',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontWeight: 600,
                  }}
                >
                  Need operational assistance? Click Support
                  Ticket in the footer to submit an instant
                  ticket to our dispatch desk.
                </div>
              </div>
            </div>
          ),
        };

      default:
        return null;
    }
  };

  const modalDetails = renderModalContent();

  /*
   * Profile Panel
   *
   * Using createPortal means the profile panel is rendered
   * directly under document.body.
   *
   * Therefore it is NOT affected by:
   * overflowX: auto
   * on the navbar.
   */
  const profilePanel =
    isProfileOpen &&
      typeof document !== 'undefined'
      ? createPortal(
        <div
          ref={profileMenuRef}
          className="profile-menu-panel"
          role="menu"
          aria-label="Profile menu"
        >
          {/* ================================
                PROFILE HEADER
            ================================= */}
          <div className="profile-menu-header">
            <div className="profile-avatar-large">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                />
              </svg>
            </div>

            <div className="profile-user-info">
              <div className="profile-user-name">
                {currentUserName}
              </div>

              <div className="profile-user-role">
                {currentUserRole}
              </div>
            </div>
          </div>

          {/* ================================
                USER ID / CONTACT EMAIL
            ================================= */}
          <div className="profile-user-id">
            <span className="profile-id-icon">

            </span>

            <span>
              {currentUserEmail}
            </span>
          </div>

          {/* ================================
                EDIT PROFILE
            ================================= */}
          <Link
            href="/settings"
            className="profile-menu-item"
            role="menuitem"
            onClick={() => {
              setIsProfileOpen(false);
            }}
            style={{ textDecoration: 'none' }}
          >
            <span className="profile-menu-icon">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <span>Edit Profile</span>
          </Link>

          {/* ================================
                LOGOUT
            ================================= */}
          {onLogout && (
            <button
              type="button"
              className="profile-menu-item"
              role="menuitem"
              onClick={() => {
                setIsProfileOpen(false);
                onLogout();
              }}
              disabled={loggingOut}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                borderTop: '1px solid #F3F4F6',
              }}
            >
              <span className="profile-menu-icon" style={{ color: '#EF4444', display: 'flex', alignItems: 'center' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          )}
        </div>,
        document.body
      )
      : null;

  return (
    <>
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header
        className="admin-header-responsive"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* =====================================================
            LEFT SIDE
        ===================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Sidebar Collapse / Expand Menu Toggle */}
          {onToggleCompact ? (
            <button
              type="button"
              onClick={onToggleCompact}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                border: isCompact ? '1px solid #2196F3' : '1px solid #E5E7EB',
                backgroundColor: isCompact ? '#E3F2FD' : '#F5F7FA',
                color: isCompact ? '#2196F3' : '#6B7280',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          ) : null}

          {/* Search */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              backgroundColor: '#F5F7FA',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              color: '#6B7280',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              minWidth: role === 'AUDITOR' ? 320 : 'auto',
              maxWidth: '100%',
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <span
              style={{
                textAlign: 'left',
                whiteSpace: 'nowrap',
                color: '#6B7280',
                fontWeight: 500,
              }}
            >
              {role === 'AUDITOR' ? 'Search by store name, zone, UID...' : 'Search console...'}
            </span>

            {role !== 'AUDITOR' && (
              <kbd
                className="hide-mobile-kbd"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: '#E5E7EB',
                  color: '#4B5563',
                  padding: '2px 6px',
                  borderRadius: 4,
                  marginLeft: 'auto',
                }}
              >
                K
              </kbd>
            )}
          </button>
        </div>

        {/* =====================================================
            NAVBAR
        ===================================================== */}
        <nav
          className="top-navbar-scroll"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginLeft: 'auto',
            gap: 16,
            fontSize: 14,
            fontWeight: 600,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            padding: '4px 0',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Notification Bell */}
          <Link
            href="/notifications"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#F5F7FA',
              border: '1px solid #E5E7EB',
              color: '#6B7280',
              position: 'relative',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Notifications"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </Link>

          {/* =================================================
              PROFILE BUTTON
          ================================================= */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              ref={profileDropdownRef}
              style={{
                position: 'relative',
              }}
            >
              {role === 'AUDITOR' ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#F5F7FA',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    borderRadius: 10,
                    transition: 'all 0.15s ease',
                  }}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: '#E3F2FD',
                      color: '#2196F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    CA
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    Compliance Auditor
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setIsProfileOpen(
                      (previous) => !previous
                    )
                  }
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#E3F2FD',
                    color: '#2196F3',
                    border: isProfileOpen
                      ? '2px solid #2196F3'
                      : '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isProfileOpen
                      ? '0 0 0 3px rgba(33, 150, 243, 0.2)'
                      : 'none',
                    flexShrink: 0,
                  }}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />

                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* =========================================================
          PROFILE PANEL
      ========================================================= */}
      {profilePanel}

      {/* =========================================================
          SEARCH MODAL
      ========================================================= */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* =========================================================
          POLICY / INFORMATION MODAL
      ========================================================= */}
      {activeModalTab && modalDetails ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() =>
            setActiveModalTab(null)
          }
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              color: '#111827',
              border: '1px solid #E5E7EB',
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                    margin: 0,
                  }}
                >
                  {modalDetails.title}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: '#6B7280',
                    margin: '4px 0 0 0',
                  }}
                >
                  {modalDetails.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModalTab(null)
                }
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                marginBottom: 20,
                color: '#374151',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {modalDetails.body}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveModalTab(null)
                }
                style={{
                  padding: '9px 22px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =========================================================
          GLOBAL STYLES
      ========================================================= */}
      <style jsx global>{`
        /*
         * ========================================================
         * PROFILE PANEL - SAAS BLUE THEME
         * ========================================================
         */

        .profile-menu-panel {
          position: fixed;
          top: 68px;
          right: 16px;
          width: 300px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          z-index: 999999;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          animation: profilePanelOpen 0.18s ease-out;
        }

        @keyframes profilePanelOpen {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /*
         * Profile Header
         */

        .profile-menu-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #f3f4f6;
        }

        /*
         * Avatar
         */

        .profile-avatar-large {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          background: #e3f2fd;
          color: #2196f3;
          display: flex;
          align-items: center;
          justifyContent: center;
        }

        /*
         * User Information
         */

        .profile-user-info {
          min-width: 0;
        }

        .profile-user-name {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          line-height: 1.3;
        }

        .profile-user-role {
          font-size: 12px;
          color: #2196f3;
          font-weight: 600;
          margin-top: 3px;
        }

        /*
         * User ID
         */

        .profile-user-id {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 8px 14px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          font-size: 11px;
          color: #6b7280;
          word-break: break-all;
        }

        .profile-id-icon {
          flex-shrink: 0;
        }

        /*
         * Menu Items
         */

        .profile-menu-item {
          width: 100%;
          min-height: 44px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .profile-menu-item:hover {
          background-color: #f5f7fa;
          color: #2196f3;
        }

        /*
         * Icons
         */

        .profile-menu-icon {
          width: 20px;
          min-width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justifyContent: center;
          color: #6b7280;
        }

        .profile-menu-item:hover .profile-menu-icon {
          color: #2196f3;
        }

        /*
         * Divider
         */

        .profile-menu-divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 6px 14px;
        }

        /*
         * Logout
         */

        .logout-item {
          color: #ef4444;
        }

        .logout-item .profile-menu-icon {
          color: #ef4444;
        }

        .logout-item:hover {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .logout-item:hover .profile-menu-icon {
          color: #b91c1c;
        }

        /*
         * Disabled Logout
         */

        .profile-menu-panel button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        } }

        /*
         * ========================================================
         * MOBILE
         * ========================================================
         */

        @media (max-width: 640px) {
          .admin-header-responsive {
            padding: 10px 14px !important;
          }

          .hide-mobile-kbd {
            display: none !important;
          }

          .top-navbar-scroll {
            order: 3;

            width: 100%;

            border-top: 1px solid
              #e0f2fe;

            padding-top: 8px !important;

            margin-top: 4px;
          }

          /*
           * Profile panel stays on screen
           * even on mobile.
           */

          .profile-menu-panel {
            top: 62px;

            right: 0;

            width: 300px;

            max-width: calc(
              100vw - 8px
            );

            border-radius:
              0 0 0 14px;
          }
        }
      `}</style>
    </>
  );
}