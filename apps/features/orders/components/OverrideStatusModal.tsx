'use client';

import React, { useState } from 'react';
import { Modal, Text, TextInput, useTheme } from 'foodie-shared-web';
import { ORDER_STATUSES, validateOverrideBody } from '../types';

type Props = {
  open: boolean;
  loading?: boolean;
  currentStatus?: string;
  onClose: () => void;
  onConfirm: (targetStatus: string, reason: string) => void;
};

/** Admin override status modal — targetStatus + reason ≤500. */
export function OverrideStatusModal({
  open,
  loading,
  currentStatus,
  onClose,
  onConfirm,
}: Props) {
  const { tokens } = useTheme();
  const [targetStatus, setTargetStatus] = useState<string>(ORDER_STATUSES[0]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const validated = validateOverrideBody(targetStatus, reason);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setError(undefined);
    onConfirm(validated.body.targetStatus, validated.body.reason);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Override Order Status"
      aria-label="Override order status"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ backgroundColor: '#F0F9FF', padding: '12px 16px', borderRadius: 8, border: '1px solid #BAE6FD', color: '#0369A1', fontSize: 13, fontWeight: 600 }}>
          Current status: <strong>{currentStatus ?? '—'}</strong>. Administrative justification reason is required (max 500 chars).
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
            Select Target Status
          </span>
          <select
            aria-label="Target status"
            value={targetStatus}
            disabled={loading}
            onChange={(e) => setTargetStatus(e.target.value)}
            style={{
              minHeight: 42,
              padding: '8px 12px',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              background: '#FFFFFF',
              color: '#0369A1',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
            }}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <TextInput
          label="Override Reason / Audit Note"
          name="overrideReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          errorText={error}
          aria-label="Override reason"
          disabled={loading}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            aria-label="Cancel override"
            disabled={loading}
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: '#F0F9FF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Submit order status override"
            disabled={loading}
            onClick={submit}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            {loading ? 'Submitting...' : 'Submit Override'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
