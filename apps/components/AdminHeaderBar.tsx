'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';

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
          title: 'ℹ About us',
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
                  +91 98765 43210
                </div>

                <div>
                  <strong>Email:</strong> support@foodie.com
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
                Admin Console
              </div>

              <div className="profile-user-role">
                {role || 'SUPER_ADMIN'}
              </div>
            </div>
          </div>

          {/* ================================
                USER ID
            ================================= */}
          <div className="profile-user-id">
            <span className="profile-id-icon">

            </span>

            <span>
              {userId || 'admin@foodie.com'}
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
                DIVIDER
            ================================= */}
          <div className="profile-menu-divider" />

          {/* ================================
                LOGOUT
            ================================= */}
          <button
            type="button"
            className="profile-menu-item logout-item"
            role="menuitem"
            onClick={() => {
              setIsProfileOpen(false);
              onLogout?.();
            }}
            disabled={loggingOut}
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line
                  x1="21"
                  y1="12"
                  x2="9"
                  y2="12"
                />
              </svg>
            </span>

            <span>
              {loggingOut
                ? 'Logging out...'
                : 'Logout'}
            </span>
          </button>
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
          borderBottom: '1px solid #BAE6FD',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
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
                border: isCompact ? '1px solid #0284C7' : '1px solid #BAE6FD',
                backgroundColor: isCompact ? '#0284C7' : '#F0F9FF',
                color: isCompact ? '#FFFFFF' : '#0284C7',
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
                strokeWidth="2.5"
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
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 10,
              color: '#0284C7',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              minWidth: role === 'AUDITOR' ? 320 : 'auto',
              maxWidth: '100%',
              transition: 'border-color 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0284C7"
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
                color: '#0369A1',
                fontWeight: 600,
              }}
            >
              {role === 'AUDITOR' ? 'Search by store name, zone, UID...' : 'Search console...'}
            </span>

            {role !== 'AUDITOR' && (
              <kbd
                className="hide-mobile-kbd"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: '#BAE6FD',
                  color: '#0369A1',
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
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              color: '#0284C7',
              position: 'relative',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Notifications"
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
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#38BDF8',
                border: '1.5px solid #FFFFFF',
                boxShadow: '0 0 6px #0EA5E9',
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
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: 10,
                    transition: 'background-color 0.15s ease',
                  }}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    CA
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0369A1',
                    }}
                  >
                    Compliance Auditor
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
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
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: '#F0F9FF',
                    color: '#0284C7',
                    border: isProfileOpen
                      ? '2px solid #0284C7'
                      : '1.5px solid #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isProfileOpen
                      ? '0 0 0 3px rgba(14, 165, 233, 0.25)'
                      : 'none',
                    flexShrink: 0,
                  }}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
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
              borderRadius: 16,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.2)',
              color: '#1E293B',
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#0369A1',
                    margin: 0,
                  }}
                >
                  {modalDetails.title}
                </h3>

                <p
                  style={{
                    fontSize: 12,
                    color: '#0284C7',
                    margin:
                      '4px 0 0 0',
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
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#0284C7',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                marginBottom: 20,
                color: '#0369A1',
              }}
            >
              {modalDetails.body}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveModalTab(null)
                }
                style={{
                  padding: '8px 20px',
                  backgroundColor:
                    '#0284C7',
                  backgroundImage:
                    'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
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
         * PROFILE PANEL - SKY BLUE THEME
         * ========================================================
         */

        .profile-menu-panel {
          position: fixed;

          top: 70px;
          right: 0;

          width: 310px;

          background: #ffffff;

          border: 1px solid #bae6fd;
          border-right: none;

          border-radius: 0 0 0 16px;

          box-shadow:
            -10px 12px 35px rgba(2, 132, 199, 0.15),
            -3px 5px 15px rgba(2, 132, 199, 0.08);

          z-index: 999999;

          padding: 10px 0;

          display: flex;
          flex-direction: column;

          animation: profilePanelOpen 0.18s ease-out;
        }

        @keyframes profilePanelOpen {
          from {
            opacity: 0;
            transform: translateX(12px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
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

          border-bottom: 1px solid #e0f2fe;
        }

        /*
         * Avatar
         */

        .profile-avatar-large {
          width: 48px;
          height: 48px;

          min-width: 48px;

          border-radius: 50%;

          background: #e0f2fe;

          color: #0284c7;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        /*
         * User Information
         */

        .profile-user-info {
          min-width: 0;
        }

        .profile-user-name {
          font-size: 16px;

          font-weight: 800;

          color: #0369a1;

          line-height: 1.3;
        }

        .profile-user-role {
          font-size: 12px;

          color: #0284c7;

          font-weight: 600;

          margin-top: 4px;
        }

        /*
         * User ID
         */

        .profile-user-id {
          display: flex;
          align-items: center;

          gap: 6px;

          margin: 10px 16px;

          padding: 9px 10px;

          border-radius: 7px;

          background: #f0f9ff;

          border: 1px solid #bae6fd;

          font-size: 11px;

          color: #0369a1;

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

          min-height: 48px;

          padding: 0 18px;

          display: flex;
          align-items: center;

          gap: 14px;

          background: transparent;

          border: none;

          color: #0369a1;

          font-size: 14px;

          font-weight: 600;

          text-align: left;

          cursor: pointer;

          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        .profile-menu-item:hover {
          background-color: #f0f9ff;

          color: #0284c7;
        }

        /*
         * Icons
         */

        .profile-menu-icon {
          width: 24px;

          min-width: 24px;

          height: 24px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #0284c7;
        }

        .profile-menu-item:hover
          .profile-menu-icon {
          color: #0284c7;
        }

        /*
         * Divider
         */

        .profile-menu-divider {
          height: 1px;

          background-color: #e0f2fe;

          margin: 8px 16px;
        }

        /*
         * Logout
         */

        .logout-item {
          color: #0284c7;
        }

        .logout-item
          .profile-menu-icon {
          color: #0284c7;
        }

        .logout-item:hover {
          background-color: #f0f9ff;

          color: #0369a1;
        }

        .logout-item:hover
          .profile-menu-icon {
          color: #0369a1;
        }

        /*
         * Disabled Logout
         */

        .profile-menu-panel
          button:disabled {
          opacity: 0.6;

          cursor: not-allowed;
        }

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