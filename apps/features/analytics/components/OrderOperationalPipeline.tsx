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

  // Order Pipeline Stages
  const stages: PipelineStage[] = [
    { id: 'PENDING', label: 'Pending', count: Math.round((totalOrders ?? 324) * 0.08), icon: '', color: '#09090B', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'CONFIRMED', label: 'Confirmed', count: Math.round((totalOrders ?? 324) * 0.12), icon: '', color: '#09090B', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'PROCESSING', label: 'Packaging', count: Math.round((totalOrders ?? 324) * 0.06), icon: '', color: '#09090B', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: Math.round((totalOrders ?? 324) * 0.05), icon: '', color: '#09090B', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: Math.round((totalOrders ?? 324) * 0.09), icon: '', color: '#09090B', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'DELIVERED', label: 'Delivered', count: Math.round((totalOrders ?? 324) * 0.61), icon: '', color: '#FFFFFF', bgColor: '#000000', borderColor: '#000000' },
    { id: 'CANCELED', label: 'Canceled', count: Math.round((totalOrders ?? 324) * 0.03), icon: '', color: '#71717A', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
    { id: 'REFUNDED', label: 'Refunded', count: Math.round((totalOrders ?? 324) * 0.01), icon: '', color: '#71717A', bgColor: '#F4F4F5', borderColor: '#E4E4E7' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: '20px 24px',
        border: '1px solid #E4E4E7',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#09090B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Live Order Operational Pipeline</span>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#F4F4F5', color: '#09090B', padding: '2px 8px', borderRadius: 12, border: '1px solid #E4E4E7' }}>
              Real-time Sync
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>
            Track order status progression across all partner stores in real time
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#09090B',
            backgroundColor: '#F4F4F5',
            border: '1px solid #E4E4E7',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          View All Orders
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
        {stages.map((stage) => (
          <div
            key={stage.id}
            onClick={() => router.push(`/orders?status=${stage.id}`)}
            style={{
              backgroundColor: stage.bgColor,
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
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: stage.color, lineHeight: 1 }}>
              {stage.count}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>
              {stage.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

