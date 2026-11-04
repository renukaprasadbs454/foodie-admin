'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { AdminUser } from '../types/usersTypes';

interface OperatingZoneOption {
  id: string;
  zoneName: string;
  cityName?: string;
  status?: string;
}

interface RmZoneMultiSelectDropdownProps {
  user: AdminUser;
  availableZones: OperatingZoneOption[];
  onUpdateAssignedZones: (userId: string, newZones: string[]) => Promise<void>;
}

export function RmZoneMultiSelectDropdown({
  user,
  availableZones,
  onUpdateAssignedZones,
}: RmZoneMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const assignedList = Array.isArray(user.assignedZoneIds)
    ? user.assignedZoneIds
    : (user.assignedZoneId ? [user.assignedZoneId] : []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleZone = async (zoneId: string) => {
    const exists = assignedList.some((id) => id.toLowerCase() === zoneId.toLowerCase());
    let next: string[];
    if (exists) {
      next = assignedList.filter((id) => id.toLowerCase() !== zoneId.toLowerCase());
    } else {
      next = [...assignedList, zoneId];
    }
    try {
      setIsUpdating(true);
      await onUpdateAssignedZones(user.id, next);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAll = async () => {
    const allIds = availableZones.map((z) => z.id);
    try {
      setIsUpdating(true);
      await onUpdateAssignedZones(user.id, allIds);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsUpdating(true);
      await onUpdateAssignedZones(user.id, []);
    } finally {
      setIsUpdating(false);
    }
  };

  const firstZoneName = assignedList.length > 0
    ? (availableZones.find((z) => z.id.toLowerCase() === assignedList[0].toLowerCase())?.zoneName || assignedList[0])
    : '';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        id={`rm-zone-dropdown-btn-${user.id}`}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 6,
          backgroundColor: assignedList.length > 0 ? '#EFF6FF' : '#F3F4F6',
          color: assignedList.length > 0 ? '#1D4ED8' : '#4B5563',
          border: `1px solid ${assignedList.length > 0 ? '#BFDBFE' : '#E5E7EB'}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
        title="Multi-select Operating Zones for Restaurant Manager"
      >
        <span>{assignedList.length > 0 ? '📍' : '🌐'}</span>
        <span>
          {assignedList.length === 0
            ? 'All Zones'
            : assignedList.length === 1
            ? firstZoneName
            : `${assignedList.length} Zones Assigned`}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={`rm-zone-dropdown-menu-${user.id}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: 260,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Assign Zones
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>
                {assignedList.length} of {availableZones.length} selected
                {isUpdating && <span style={{ color: '#2563EB', marginLeft: 6 }}>Saving...</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isUpdating}
                style={{
                  fontSize: 10,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isUpdating}
                style={{
                  fontSize: 10,
                  color: '#DC2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Zone list with checkboxes */}
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
            {availableZones.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: '#64748B' }}>
                No registered zones found
              </div>
            ) : (
              availableZones.map((zone) => {
                const isChecked = assignedList.some(
                  (id) => id.toLowerCase() === zone.id.toLowerCase()
                );
                return (
                  <label
                    key={zone.id}
                    id={`rm-zone-checkbox-${zone.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#1E293B',
                      backgroundColor: isChecked ? '#F0FDF4' : 'transparent',
                      transition: 'background-color 0.1s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isUpdating}
                      onChange={() => handleToggleZone(zone.id)}
                      style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                    />
                    <span style={{ fontSize: 13 }}>📍</span>
                    <span style={{ flex: 1, fontWeight: isChecked ? 600 : 400 }}>
                      {zone.zoneName}
                    </span>
                    {zone.cityName && (
                      <span style={{ fontSize: 10, color: '#64748B' }}>{zone.cityName}</span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}
          >
            <span style={{ fontSize: 10, color: '#64748B' }}>
              Changes save instantly
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

