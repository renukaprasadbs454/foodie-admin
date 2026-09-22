'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
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
type TicketSubTab = 'ALL' | 'RESTAURANT_ISSUES' | 'DELIVERY_ISSUES' | 'REFUND_REQUESTS' | 'SUPPORT_TICKETS';

export function ReviewsPage() {
  const { tokens } = useTheme();

  const [mainTab, setMainTab] = useState<MainTab>('REVIEWS_RATINGS');
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('ALL');
  const [ticketSubTab, setTicketSubTab] = useState<TicketSubTab>('ALL');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');

  const [reviews, setReviews] = useState<CustomerReviewRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch live support tickets and restaurant reviews directly from backend
  const { data: ticketsData, isLoading: isTicketsLoading } = useGetSupportTicketsQuery();
  const { data: adminReviewsData, isLoading: isReviewsLoading } = useGetAdminReviewsQuery();
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
        await flagReviewMutation({ id, reason: 'Flagged for moderation' }).unwrap();
      }
    } catch {
      // optimistic
    }
    setToastMsg(`Review status updated to ${newStatus}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTicketStatusChange = async (id: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );
    try {
      await updateTicketStatus({ id, status: newStatus as any, agentNotes: 'Updated by Compliance Auditor' }).unwrap();
    } catch {
      // update state optimistic
    }
    setToastMsg(`Ticket ${id.slice(0, 8)} status set to ${newStatus}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase());

      if (reviewSubTab === 'REPORTED_REVIEWS') return r.isReported && matchesSearch;
      if (reviewSubTab === 'MODERATION') return r.status === 'FLAGGED' && matchesSearch;
      return matchesSearch;
    });
  }, [reviews, reviewSubTab, searchQuery]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = ticketStatusFilter === 'ALL' || t.status === ticketStatusFilter;
      const matchesSearch =
        searchQuery === '' ||
        t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.issueTitle.toLowerCase().includes(searchQuery.toLowerCase());

      if (ticketSubTab === 'RESTAURANT_ISSUES') return t.category === 'RESTAURANT_ISSUE' && matchesStatus && matchesSearch;
      if (ticketSubTab === 'DELIVERY_ISSUES') return t.category === 'DELIVERY_ISSUE' && matchesStatus && matchesSearch;
      if (ticketSubTab === 'REFUND_REQUESTS') return t.category === 'REFUND_REQUEST' && matchesStatus && matchesSearch;
      return matchesStatus && matchesSearch;
    });
  }, [tickets, ticketSubTab, ticketStatusFilter, searchQuery]);

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
          <Text as="h1" variant="heading1" color="#09090B">
            Reviews & Customer Complaints Desk
          </Text>
          <Text as="p" variant="caption" color="#71717A">
            Manage customer ratings, restaurant feedback, delivery partner scorecards, reported reviews & support complaints
          </Text>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search reviews, stores, comments, or ticket numbers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #E4E4E7',
            fontSize: 13,
            width: 320,
            maxWidth: '100%',
            outline: 'none',
            backgroundColor: '#FFFFFF',
            color: '#09090B',
          }}
        />
      </div>

      {/* Main Mode Navigation (Reviews & Ratings vs Customer Complaints) */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          backgroundColor: '#FFFFFF',
          padding: '8px',
          borderRadius: 12,
          border: '1px solid #E4E4E7',
        }}
      >
        <button
          type="button"
          onClick={() => setMainTab('REVIEWS_RATINGS')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: mainTab === 'REVIEWS_RATINGS' ? '#000000' : 'transparent',
            color: mainTab === 'REVIEWS_RATINGS' ? '#FFFFFF' : '#71717A',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
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
            borderRadius: 8,
            border: 'none',
            backgroundColor: mainTab === 'CUSTOMER_COMPLAINTS' ? '#000000' : 'transparent',
            color: mainTab === 'CUSTOMER_COMPLAINTS' ? '#FFFFFF' : '#71717A',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
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
              { id: 'ALL', label: 'Customer Reviews' },
              { id: 'RESTAURANT_RATINGS', label: `Restaurant Ratings ${Number(avgRestaurantRating) > 0 ? `(${avgRestaurantRating})` : ''}` },
              { id: 'DELIVERY_RATINGS', label: `Delivery Partner Ratings ${Number(avgDeliveryRating) > 0 ? `(${avgDeliveryRating})` : ''}` },
              { id: 'REPORTED_REVIEWS', label: 'Reported Reviews' },
              { id: 'MODERATION', label: 'Review Moderation' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewSubTab(tab.id as ReviewSubTab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: reviewSubTab === tab.id ? '1px solid #000000' : '1px solid #E4E4E7',
                  backgroundColor: reviewSubTab === tab.id ? '#000000' : '#FFFFFF',
                  color: reviewSubTab === tab.id ? '#FFFFFF' : '#09090B',
                  fontSize: 13,
                  fontWeight: reviewSubTab === tab.id ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reviews Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '1px solid #E4E4E7', color: '#09090B', fontWeight: 700 }}>
                  <th style={{ padding: '14px 20px' }}>Customer & Store</th>
                  <th style={{ padding: '14px 20px' }}>Ratings</th>
                  <th style={{ padding: '14px 20px' }}>Feedback Comment</th>
                  <th style={{ padding: '14px 20px' }}>Delivery Partner</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Review Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 20px', color: '#94A3B8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                          No customer reviews found in database
                        </div>
                        <div style={{ fontSize: 13 }}>
                          Live customer reviews and ratings submitted in the platform will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #E4E4E7' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{r.customerName}</div>
                        <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{r.restaurantName}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#F59E0B', fontSize: 14 }}>★</span>
                          <span style={{ fontWeight: 800, color: '#0F172A' }}>{r.rating}.0</span>
                          <span style={{ fontSize: 11, color: '#71717A' }}>(Rest.)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ color: '#0284C7', fontSize: 13 }}>★</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 12 }}>{r.deliveryRating}.0</span>
                          <span style={{ fontSize: 11, color: '#71717A' }}>(Delivery)</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 320 }}>
                        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>"{r.comment}"</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{r.createdAt}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#09090B', fontWeight: 600 }}>
                        {r.deliveryManName}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            backgroundColor: r.status === 'PUBLISHED' ? '#F4F4F5' : '#000000',
                            color: r.status === 'PUBLISHED' ? '#09090B' : '#FFFFFF',
                            border: '1px solid #E4E4E7',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleModeration(r.id, r.status === 'FLAGGED' ? 'PUBLISHED' : 'FLAGGED')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: r.status === 'FLAGGED' ? '#000000' : '#F4F4F5',
                              color: r.status === 'FLAGGED' ? '#FFFFFF' : '#09090B',
                              border: '1px solid #E4E4E7',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
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
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {r.status === 'HIDDEN' ? 'Show' : 'Hide'}
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
                  borderRadius: 8,
                  border: ticketSubTab === tab.id ? '1px solid #000000' : '1px solid #E4E4E7',
                  backgroundColor: ticketSubTab === tab.id ? '#000000' : '#FFFFFF',
                  color: ticketSubTab === tab.id ? '#FFFFFF' : '#09090B',
                  fontSize: 13,
                  fontWeight: ticketSubTab === tab.id ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ticket Status Filter Bar */}
          <div style={{ display: 'flex', gap: 8, backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 10, border: '1px solid #E4E4E7' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#09090B', alignSelf: 'center', marginRight: 8 }}>Ticket Status:</span>
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTicketStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: ticketStatusFilter === st ? '#000000' : '#F4F4F5',
                  color: ticketStatusFilter === st ? '#FFFFFF' : '#09090B',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Complaints Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '1px solid #E4E4E7', color: '#09090B', fontWeight: 700 }}>
                  <th style={{ padding: '14px 20px' }}>Ticket # & Customer</th>
                  <th style={{ padding: '14px 20px' }}>Category & Issue</th>
                  <th style={{ padding: '14px 20px' }}>Assigned Agent</th>
                  <th style={{ padding: '14px 20px' }}>Claim Amount</th>
                  <th style={{ padding: '14px 20px' }}>Ticket Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 20px', color: '#94A3B8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                          No support complaints found in database
                        </div>
                        <div style={{ fontSize: 13 }}>
                          Customer complaints and escalation tickets logged in the platform will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #E4E4E7' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{t.ticketNumber}</div>
                        <div style={{ fontSize: 12, color: '#09090B', fontWeight: 600 }}>{t.customerName}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{t.customerPhone}</div>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: 340 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#09090B', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', padding: '2px 6px', borderRadius: 4, width: 'fit-content', marginBottom: 4 }}>
                          {t.category.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{t.issueTitle}</div>
                        <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{t.details}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#09090B', fontWeight: 600 }}>
                        {t.assignedAgent}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#0F172A' }}>
                        {t.refundAmount ? `₹${t.refundAmount}` : 'N/A'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            backgroundColor: t.status === 'OPEN' ? '#000000' : t.status === 'IN_PROGRESS' ? '#18181B' : '#F4F4F5',
                            color: t.status === 'OPEN' || t.status === 'IN_PROGRESS' ? '#FFFFFF' : '#09090B',
                            border: '1px solid #E4E4E7',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {t.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketStatusChange(t.id, 'RESOLVED')}
                              style={{ padding: '6px 12px', backgroundColor: '#000000', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Resolve
                            </button>
                          )}
                          {t.status !== 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketStatusChange(t.id, 'CLOSED')}
                              style={{ padding: '6px 12px', backgroundColor: '#F4F4F5', color: '#09090B', border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
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
            backgroundColor: '#000000',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 9999,
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
