'use client';

import React, { useEffect } from 'react';
import { Text, useTheme } from 'foodie-shared-web';
import type { AuditLogRecord } from '../types';

interface Props {
  log: AuditLogRecord;
  onClose: () => void;
}

export function AuditLogDetailModal({ log, onClose }: Props) {
  const { tokens } = useTheme();

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
        backgroundColor: 'rgba(12, 74, 110, 0.45)',
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
          borderRadius: 16,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 35px -5px rgba(2, 132, 199, 0.2), 0 10px 15px -6px rgba(2, 132, 199, 0.15)',
          animation: 'modalFadeIn 0.2s ease-out',
          border: '1px solid #BAE6FD',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #BAE6FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #075985 0%, #0C4A6E 100%)',
            borderTopLeftRadius: 15,
            borderTopRightRadius: 15,
          }}
        >
          <div>
            <h3 id="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
              Audit Log Details
            </h3>
            <span style={{ fontSize: 12, color: '#BAE6FD', fontWeight: 600 }}>
              ID: {log.id}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
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
              backgroundColor: '#F0F9FF',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #BAE6FD',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Operator</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0C4A6E', marginTop: 2 }}>
                {log.adminUserName || 'System'} ({log.adminUserRole || 'N/A'})
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Action</div>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0284C7',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #BAE6FD',
                  padding: '2px 8px',
                  borderRadius: 4,
                  marginTop: 4,
                }}
              >
                {log.action}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Target Entity</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0C4A6E', marginTop: 2 }}>
                {log.resourceType}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Timestamp</div>
              <div style={{ fontSize: 14, color: '#0C4A6E', marginTop: 2 }}>
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Target ID banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Target ID</span>
            <code
              style={{
                backgroundColor: '#F0F9FF',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #BAE6FD',
                fontSize: 13,
                wordBreak: 'break-all',
                color: '#0C4A6E',
              }}
            >
              {log.resourceId}
            </code>
          </div>

          {/* Before & After State Changes */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0C4A6E', marginBottom: 12 }}>
              State Changes Comparison
            </div>

            {allKeys.length === 0 ? (
              <div style={{ color: '#0369A1', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
                No state parameters recorded for this operation.
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #BAE6FD',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr 1fr',
                    backgroundColor: '#E0F2FE',
                    borderBottom: '1px solid #BAE6FD',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0C4A6E',
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
                    let valBeforeColor = '#0C4A6E';
                    let valAfterColor = '#0C4A6E';

                    if (status === 'ADDED') {
                      rowBg = '#F0F9FF';
                      valAfterColor = '#0284C7';
                    } else if (status === 'DELETED') {
                      rowBg = '#F0F9FF';
                      valBeforeColor = '#94A3B8';
                    } else if (status === 'MODIFIED') {
                      rowBg = '#F0F9FF';
                      valBeforeColor = '#94A3B8';
                      valAfterColor = '#0284C7';
                    }

                    return (
                      <div
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '150px 1fr 1fr',
                          borderBottom: '1px solid #BAE6FD',
                          fontSize: 13,
                          padding: '12px 16px',
                          backgroundColor: rowBg,
                          gap: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#0C4A6E', wordBreak: 'break-all' }}>
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
                            fontWeight: status === 'MODIFIED' || status === 'ADDED' ? 700 : 'normal',
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
            borderTop: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F0F9FF',
            borderBottomLeftRadius: 15,
            borderBottomRightRadius: 15,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
