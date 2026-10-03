'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { trackAnalyticsEvent } from 'foodie-shared-web';
import { GAP_API_20_GLOBAL_REVIEWS } from '@/constants/gaps';
import { useGetSupportTicketsQuery, useUpdateTicketStatusMutation } from '@/api/endpoints/customersApi';
import { useGetAdminReviewsQuery, useFlagReviewMutation } from '@/api/endpoints/reviewsApi';

export interface CustomerReviewRecord {
  id: string;
  customerName: string;
  restaurantName: string;
  deliveryManName: string;
  module: string;
  rating: number;
  deliveryRating: number;
  comment: string;
  createdAt: string;
  status: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN';
  isReported: boolean;
}

export interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  category: 'RESTAURANT_ISSUE' | 'DELIVERY_ISSUE' | 'REFUND_REQUEST' | 'GENERAL_SUPPORT';
  issueTitle: string;
  details: string;
  assignedAgent: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  refundAmount?: number;
}

type MainTab = 'REVIEWS_RATINGS' | 'CUSTOMER_COMPLAINTS';
type ReviewSubTab = 'ALL' | 'RESTAURANT_RATINGS' | 'DELIVERY_RATINGS' | 'REPORTED_REVIEWS' | 'MODERATION';
type TicketSubTab = 'ALL' | 'RESTAURANT_ISSUES' | 'DELIVERY_ISSUES' | 'REFUND_REQUESTS';

export function ReviewsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('REVIEWS_RATINGS');
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('ALL');
  const [ticketSubTab, setTicketSubTab] = useState<TicketSubTab>('ALL');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');

  const [reviews, setReviews] = useState<CustomerReviewRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch live support tickets and restaurant reviews directly from backend
  const { data: ticketsData } = useGetSupportTicketsQuery();
  const { data: adminReviewsData } = useGetAdminReviewsQuery();
  const [updateTicketStatus] = useUpdateTicketStatusMutation();
  const [flagReviewMutation] = useFlagReviewMutation();

  useEffect(() => {
    trackAnalyticsEvent('admin_reviews_viewed', {
      gapId: GAP_API_20_GLOBAL_REVIEWS,
    });
  }, []);

  // Map real database support tickets
  useEffect(() => {
    if (Array.isArray(ticketsData)) {
      const liveTickets: SupportTicketRecord[] = ticketsData.map((t: any) => {
        let cat: SupportTicketRecord['category'] = 'GENERAL_SUPPORT';
        if (t.category === 'RESTAURANT_ISSUE' || t.category === 'RESTAURANT' || t.category === 'FOOD_QUALITY') cat = 'RESTAURANT_ISSUE';
        else if (t.category === 'DELIVERY_ISSUE' || t.category === 'DELIVERY') cat = 'DELIVERY_ISSUE';
        else if (t.category === 'REFUND_REQUEST' || t.category === 'REFUND') cat = 'REFUND_REQUEST';

        const priority: SupportTicketRecord['priority'] =
          t.priority === 'HIGH' || t.priority === 'URGENT' ? 'HIGH' : t.priority === 'LOW' ? 'LOW' : 'MEDIUM';

        const status: SupportTicketRecord['status'] =
          t.status === 'RESOLVED'
            ? 'RESOLVED'
            : t.status === 'CLOSED'
            ? 'CLOSED'
            : t.status === 'IN_PROGRESS'
            ? 'IN_PROGRESS'
            : 'OPEN';

        return {
          id: String(t.id),
          ticketNumber: t.ticketNumber || `TCK-${String(t.id).slice(0, 6).toUpperCase()}`,
          customerName: t.customerName || t.userName || 'Customer',
          customerPhone: t.customerPhone || t.phone || 'N/A',
          category: cat,
          issueTitle: t.issueTitle || t.subject || 'Support Inquiry',
          details: t.details || t.description || 'Customer request logged in database.',
          assignedAgent: t.assignedAgent || 'Compliance Auditor',
          priority,
          status,
          createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          refundAmount: t.refundAmount || undefined,
        };
      });
      setTickets(liveTickets);
    } else {
      setTickets([]);
    }
  }, [ticketsData]);

  // Map real database reviews
  useEffect(() => {
    if (Array.isArray(adminReviewsData)) {
      const liveReviews: CustomerReviewRecord[] = adminReviewsData.map((rev: any, idx: number) => {
        const status: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN' =
          rev.status === 'FLAGGED' ? 'FLAGGED' : rev.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED';
        return {
          id: rev.id ? String(rev.id) : `rev-${idx + 1}`,
          customerName: rev.customerName || 'Customer',
          restaurantName: rev.restaurantName || 'Restaurant',
          deliveryManName: rev.deliveryPartnerName || 'Delivery Partner',
          module: 'Food Quality',
          rating: typeof rev.restaurantRating === 'number' ? rev.restaurantRating : (typeof rev.rating === 'number' ? rev.rating : 5),
          deliveryRating: typeof rev.deliveryRating === 'number' ? rev.deliveryRating : 5,
          comment: rev.comment || 'Customer submitted review.',
          createdAt: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          status,
          isReported: Boolean(rev.isReported || rev.status === 'FLAGGED'),
        };
      });
      setReviews(liveReviews);
    } else {
      setReviews([]);
    }
  }, [adminReviewsData]);

  const handleModeration = async (id: string, newStatus: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED') => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
    try {
      if (newStatus === 'FLAGGED') {
        await flagReviewMutation({ id, reason: 'Flagged by Admin' }).unwrap();
      }
      setToastMsg(`Review marked as ${newStatus}`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg(`Review marked as ${newStatus} locally`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleTicketStatusChange = async (id: string, newStatus: 'RESOLVED' | 'CLOSED') => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );
    try {
      await updateTicketStatus({ id, status: newStatus }).unwrap();
      setToastMsg(`Ticket ${newStatus.toLowerCase()} successfully`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg(`Ticket marked ${newStatus.toLowerCase()} locally`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.customerName.toLowerCase().includes(q) ||
        r.restaurantName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (reviewSubTab === 'RESTAURANT_RATINGS') return r.rating > 0;
      if (reviewSubTab === 'DELIVERY_RATINGS') return r.deliveryRating > 0;
      if (reviewSubTab === 'REPORTED_REVIEWS') return r.isReported;
      if (reviewSubTab === 'MODERATION') return r.status === 'FLAGGED' || r.status === 'HIDDEN';

      return true;
    });
  }, [reviews, searchQuery, reviewSubTab]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.issueTitle.toLowerCase().includes(q) ||
        t.details.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (ticketSubTab === 'RESTAURANT_ISSUES' && t.category !== 'RESTAURANT_ISSUE') return false;
      if (ticketSubTab === 'DELIVERY_ISSUES' && t.category !== 'DELIVERY_ISSUE') return false;
      if (ticketSubTab === 'REFUND_REQUESTS' && t.category !== 'REFUND_REQUEST') return false;

      if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;

      return true;
    });
  }, [tickets, searchQuery, ticketSubTab, ticketStatusFilter]);

  const avgRestaurantRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const avgDeliveryRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.deliveryRating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Reviews & Customer Complaints Desk
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Manage customer ratings, restaurant feedback, delivery partner scorecards, reported reviews & support complaints
          </p>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search reviews, stores, comments, or tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            fontSize: 13,
            width: 320,
            maxWidth: '100%',
            outline: 'none',
            backgroundColor: '#FFFFFF',
            color: '#111827',
          }}
        />
      </div>

      {/* Main Mode Navigation (Reviews & Ratings vs Customer Complaints) */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          backgroundColor: '#FFFFFF',
          padding: '6px',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setMainTab('REVIEWS_RATINGS')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 12,
            border: 'none',
            background: mainTab === 'REVIEWS_RATINGS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: mainTab === 'REVIEWS_RATINGS' ? '#FFFFFF' : '#6B7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: mainTab === 'REVIEWS_RATINGS' ? '0 4px 14px rgba(33, 150, 243, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Reviews & Ratings ({reviews.length})
        </button>

        <button
          type="button"
          onClick={() => setMainTab('CUSTOMER_COMPLAINTS')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 12,
            border: 'none',
            background: mainTab === 'CUSTOMER_COMPLAINTS' ? 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)' : 'transparent',
            color: mainTab === 'CUSTOMER_COMPLAINTS' ? '#FFFFFF' : '#6B7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: mainTab === 'CUSTOMER_COMPLAINTS' ? '0 4px 14px rgba(33, 150, 243, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Customer Complaints & Tickets ({tickets.length})
        </button>
      </div>

      {/* SECTION 1: REVIEWS & RATINGS */}
      {mainTab === 'REVIEWS_RATINGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sub Feature Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Reviews' },
              { id: 'RESTAURANT_RATINGS', label: `Restaurant Ratings ${Number(avgRestaurantRating) > 0 ? `(${avgRestaurantRating} Avg)` : ''}` },
              { id: 'DELIVERY_RATINGS', label: `Delivery Partner Ratings ${Number(avgDeliveryRating) > 0 ? `(${avgDeliveryRating} Avg)` : ''}` },
              { id: 'REPORTED_REVIEWS', label: 'Reported Reviews' },
              { id: 'MODERATION', label: 'Review Moderation' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewSubTab(tab.id as ReviewSubTab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: reviewSubTab === tab.id ? '1px solid #2196F3' : '1px solid #E5E7EB',
                  background: reviewSubTab === tab.id ? '#E3F2FD' : '#FFFFFF',
                  color: reviewSubTab === tab.id ? '#2196F3' : '#6B7280',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reviews Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer & Store</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ratings</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback Comment</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Partner</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Review Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 20px', color: '#6B7280' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                          No customer reviews found in database
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>
                          Live customer reviews and ratings submitted in the platform will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{r.customerName}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{r.restaurantName}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: '#2196F3' }}>{r.rating}.0 / 5</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>(Food)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontWeight: 500, color: '#6B7280', fontSize: 12 }}>{r.deliveryRating}.0 / 5</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>(Delivery)</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 320 }}>
                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>"{r.comment}"</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{r.createdAt}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
                        {r.deliveryManName}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            backgroundColor: r.status === 'PUBLISHED' ? '#DCFCE7' : r.status === 'FLAGGED' ? '#FEE2E2' : '#F3F4F6',
                            color: r.status === 'PUBLISHED' ? '#15803D' : r.status === 'FLAGGED' ? '#EF4444' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleModeration(r.id, r.status === 'FLAGGED' ? 'PUBLISHED' : 'FLAGGED')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: r.status === 'FLAGGED' ? '#DCFCE7' : '#FEE2E2',
                              color: r.status === 'FLAGGED' ? '#15803D' : '#EF4444',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {r.status === 'FLAGGED' ? 'Unflag' : 'Flag'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeration(r.id, r.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#FFFFFF',
                              color: '#6B7280',
                              border: '1px solid #E5E7EB',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {r.status === 'HIDDEN' ? 'Unhide' : 'Hide'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: CUSTOMER COMPLAINTS & TICKETS */}
      {mainTab === 'CUSTOMER_COMPLAINTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ticket Sub Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Complaints' },
              { id: 'RESTAURANT_ISSUES', label: 'Restaurant Quality Issues' },
              { id: 'DELIVERY_ISSUES', label: 'Delivery Issues' },
              { id: 'REFUND_REQUESTS', label: 'Refund Requests' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTicketSubTab(tab.id as TicketSubTab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: ticketSubTab === tab.id ? '1px solid #2196F3' : '1px solid #E5E7EB',
                  background: ticketSubTab === tab.id ? '#E3F2FD' : '#FFFFFF',
                  color: ticketSubTab === tab.id ? '#2196F3' : '#6B7280',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ticket Status Filter Bar */}
          <div style={{ display: 'flex', gap: 8, backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 16, border: '1px solid #E5E7EB', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Status:</span>
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTicketStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: ticketStatusFilter === st ? '1px solid #2196F3' : '1px solid transparent',
                  background: ticketStatusFilter === st ? '#E3F2FD' : '#F9FAFB',
                  color: ticketStatusFilter === st ? '#2196F3' : '#6B7280',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Complaints Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket # & Customer</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category & Issue</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Agent</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim Amount</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Status</th>
                  <th style={{ padding: '14px 20px', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 20px', color: '#6B7280' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                          No support complaints found in database
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>
                          Customer complaints and escalation tickets logged in the platform will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#2196F3', fontFamily: 'monospace' }}>{t.ticketNumber}</div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600, marginTop: 2 }}>{t.customerName}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{t.customerPhone}</div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 340 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#2196F3', backgroundColor: '#E3F2FD', padding: '2px 8px', borderRadius: 9999, width: 'fit-content', marginBottom: 6 }}>
                          {t.category.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{t.issueTitle}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{t.details}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
                        {t.assignedAgent}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#111827' }}>
                        {t.refundAmount ? `₹${t.refundAmount}` : '—'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            backgroundColor: t.status === 'RESOLVED' ? '#DCFCE7' : t.status === 'IN_PROGRESS' ? '#FEF3C7' : t.status === 'OPEN' ? '#E3F2FD' : '#F3F4F6',
                            color: t.status === 'RESOLVED' ? '#15803D' : t.status === 'IN_PROGRESS' ? '#B45309' : t.status === 'OPEN' ? '#2196F3' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 9999,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {t.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketStatusChange(t.id, 'RESOLVED')}
                              style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)' }}
                            >
                              Resolve
                            </button>
                          )}
                          {t.status !== 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketStatusChange(t.id, 'CLOSED')}
                              style={{ padding: '6px 14px', backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#111827',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
