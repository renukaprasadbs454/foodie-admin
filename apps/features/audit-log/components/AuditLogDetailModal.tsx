'use client';

import React, { useEffect } from 'react';
import type { AuditLogRecord } from '../types';

interface Props {
  log: AuditLogRecord;
  onClose: () => void;
}

export function AuditLogDetailModal({ log, onClose }: Props) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Extract all property names
  const before = log.beforeState || {};
  const after = log.afterState || {};
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  const getDiffStatus = (key: string) => {
    const hasBefore = key in before;
    const hasAfter = key in after;
    if (hasBefore && !hasAfter) return 'DELETED';
    if (!hasBefore && hasAfter) return 'ADDED';
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return 'MODIFIED';
    return 'UNCHANGED';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
          }}
        >
          <div>
            <h3 id="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
              Audit Log Details
            </h3>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
              ID: {log.id}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              color: '#FFFFFF',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              backgroundColor: '#F9FAFB',
              padding: 16,
              borderRadius: 14,
              border: '1px solid #E5E7EB',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operator</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                {log.adminUserName || 'System'} ({log.adminUserRole || 'N/A'})
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</div>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2196F3',
                  backgroundColor: '#E3F2FD',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  marginTop: 4,
                }}
              >
                {log.action}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Entity</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                {log.resourceType}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</div>
              <div style={{ fontSize: 14, color: '#111827', marginTop: 2 }}>
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Target ID banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target ID</span>
            <code
              style={{
                backgroundColor: '#F9FAFB',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                fontSize: 13,
                wordBreak: 'break-all',
                color: '#2196F3',
              }}
            >
              {log.resourceId}
            </code>
          </div>

          {/* Before & After State Changes */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              State Changes Comparison
            </div>

            {allKeys.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
                No state parameters recorded for this operation.
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr 1fr',
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#6B7280',
                    padding: '10px 16px',
                  }}
                >
                  <div>Property</div>
                  <div>Before State</div>
                  <div>After State</div>
                </div>

                {/* Table Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflowY: 'auto' }}>
                  {allKeys.map((key) => {
                    const status = getDiffStatus(key);
                    const beforeVal = before[key] !== undefined ? JSON.stringify(before[key]) : '—';
                    const afterVal = after[key] !== undefined ? JSON.stringify(after[key]) : '—';

                    let rowBg = '#FFFFFF';
                    let valBeforeColor = '#111827';
                    let valAfterColor = '#111827';

                    if (status === 'ADDED') {
                      rowBg = '#F0FDF4';
                      valAfterColor = '#15803D';
                    } else if (status === 'DELETED') {
                      rowBg = '#FEF2F2';
                      valBeforeColor = '#EF4444';
                    } else if (status === 'MODIFIED') {
                      rowBg = '#F8FAFC';
                      valBeforeColor = '#9CA3AF';
                      valAfterColor = '#2196F3';
                    }

                    return (
                      <div
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '150px 1fr 1fr',
                          borderBottom: '1px solid #F3F4F6',
                          fontSize: 13,
                          padding: '12px 16px',
                          backgroundColor: rowBg,
                          gap: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>
                          {key}
                        </div>
                        <div
                          style={{
                            color: valBeforeColor,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            wordBreak: 'break-all',
                            textDecoration: status === 'MODIFIED' ? 'line-through' : 'none',
                          }}
                        >
                          {beforeVal}
                        </div>
                        <div
                          style={{
                            color: valAfterColor,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            wordBreak: 'break-all',
                            fontWeight: status === 'MODIFIED' || status === 'ADDED' ? 600 : 'normal',
                          }}
                        >
                          {afterVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#FFFFFF',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
