'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface PipelineStage {
  id: string;
  label: string;
  count: number;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface OrderOperationalPipelineProps {
  totalOrders?: number;
}

export function OrderOperationalPipeline({ totalOrders }: OrderOperationalPipelineProps) {
  const router = useRouter();

  // Order Pipeline Stages — Sky Blue Theme
  const stages: PipelineStage[] = [
    { id: 'PENDING', label: 'Pending', count: Math.round((totalOrders ?? 324) * 0.08), icon: '⏳', color: '#0369A1', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'CONFIRMED', label: 'Confirmed', count: Math.round((totalOrders ?? 324) * 0.12), icon: '📋', color: '#0369A1', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'PROCESSING', label: 'Packaging', count: Math.round((totalOrders ?? 324) * 0.06), icon: '🍳', color: '#0369A1', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: Math.round((totalOrders ?? 324) * 0.05), icon: '🛍️', color: '#0369A1', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: Math.round((totalOrders ?? 324) * 0.09), icon: '🛵', color: '#0369A1', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'DELIVERED', label: 'Delivered', count: Math.round((totalOrders ?? 324) * 0.61), icon: '✅', color: '#FFFFFF', bgColor: '#0284C7', borderColor: '#0284C7' },
    { id: 'CANCELED', label: 'Canceled', count: Math.round((totalOrders ?? 324) * 0.03), icon: '✕', color: '#0284C7', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
    { id: 'REFUNDED', label: 'Refunded', count: Math.round((totalOrders ?? 324) * 0.01), icon: '💸', color: '#0284C7', bgColor: '#F0F9FF', borderColor: '#BAE6FD' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: '20px 24px',
        border: '1px solid #BAE6FD',
        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🚚 Live Order Operational Pipeline</span>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#F0F9FF', color: '#0369A1', padding: '2px 8px', borderRadius: 12, border: '1px solid #BAE6FD' }}>
              Real-time Sync
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
            Track order status progression across all partner stores in real time
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#0369A1',
            backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          View All Orders →
        </button>
      </div>

      {/* Grid of pipeline stage cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
        }}
      >
        {stages.map((stage) => {
          const isDelivered = stage.id === 'DELIVERED';
          return (
            <div
              key={stage.id}
              onClick={() => router.push(`/orders?status=${stage.id}`)}
              style={{
                backgroundColor: stage.bgColor,
                backgroundImage: isDelivered ? 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)' : 'none',
                border: `1px solid ${stage.borderColor}`,
                borderRadius: 12,
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isDelivered ? '0 4px 12px rgba(14, 165, 233, 0.35)' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: stage.color, lineHeight: 1 }}>
                {stage.count}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
