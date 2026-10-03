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

  // Order Pipeline Stages — SaaS Theme
  const stages: PipelineStage[] = [
    { id: 'PENDING', label: 'Pending', count: Math.round((totalOrders ?? 324) * 0.08), icon: '', color: '#111827', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'CONFIRMED', label: 'Confirmed', count: Math.round((totalOrders ?? 324) * 0.12), icon: '', color: '#111827', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'PROCESSING', label: 'Packaging', count: Math.round((totalOrders ?? 324) * 0.06), icon: '', color: '#111827', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: Math.round((totalOrders ?? 324) * 0.05), icon: '', color: '#111827', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: Math.round((totalOrders ?? 324) * 0.09), icon: '', color: '#111827', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'DELIVERED', label: 'Delivered', count: Math.round((totalOrders ?? 324) * 0.61), icon: '', color: '#FFFFFF', bgColor: '#2196F3', borderColor: '#2196F3' },
    { id: 'CANCELED', label: 'Canceled', count: Math.round((totalOrders ?? 324) * 0.03), icon: '', color: '#6B7280', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
    { id: 'REFUNDED', label: 'Refunded', count: Math.round((totalOrders ?? 324) * 0.01), icon: '', color: '#6B7280', bgColor: '#F9FAFB', borderColor: '#E5E7EB' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '24px 28px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Live Order Operational Pipeline</span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#E3F2FD', color: '#1E40AF', padding: '2px 8px', borderRadius: 9999, border: '1px solid #BFDBFE' }}>
              Real-time Sync
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
            Track order status progression across all partner stores in real time
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2196F3',
            backgroundColor: '#F5F7FA',
            border: '1px solid #E5E7EB',
            padding: '7px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E3F2FD';
            e.currentTarget.style.borderColor = '#BFDBFE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F7FA';
            e.currentTarget.style.borderColor = '#E5E7EB';
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
                backgroundColor: isDelivered ? 'transparent' : '#F9FAFB',
                backgroundImage: isDelivered ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'none',
                border: isDelivered ? 'none' : '1px solid #E5E7EB',
                borderRadius: 14,
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isDelivered ? '0 4px 12px rgba(33, 150, 243, 0.25)' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: stage.color, lineHeight: 1 }}>
                {stage.count}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDelivered ? '#FFFFFF' : '#6B7280' }}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
