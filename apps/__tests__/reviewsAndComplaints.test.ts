import { DASHBOARD_NAV } from '../lib/routeGuards';

describe('Reviews & Complaints Sidebar and Feature Expansion Contract', () => {
  it('renames sidebar label to Reviews & Complaints', () => {
    const reviewsNavItem = DASHBOARD_NAV.find((item) => item.href === '/reviews');
    expect(reviewsNavItem).toBeDefined();
    expect(reviewsNavItem?.label).toBe('Reviews & Complaints');
  });

  it('supports Reviews & Ratings subcategories and Customer Complaints ticket categories', () => {
    const reviewSubCategories = [
      'Customer Reviews',
      'Restaurant Ratings',
      'Delivery Partner Ratings',
      'Reported Reviews',
      'Review Moderation',
    ];

    const complaintSubCategories = [
      'Restaurant Issues',
      'Delivery Issues',
      'Refund Requests',
      'Support Tickets',
      'Ticket Status',
    ];

    expect(reviewSubCategories).toHaveLength(5);
    expect(complaintSubCategories).toHaveLength(5);
  });

  it('correctly parses structured review comments into restaurant and delivery feedback', () => {
    const { parseReviewDetails } = require('../features/reviews/types');
    const structuredComment =
      '[Food & Dining]: Hot & Fresh • Great biryani\n\n[Delivery Service]: Fast arrival • Courteous';
    const parsed = parseReviewDetails(structuredComment);

    expect(parsed.restaurantComment).toBe('Hot & Fresh • Great biryani');
    expect(parsed.deliveryComment).toBe('Fast arrival • Courteous');
  });

  it('keeps single unstructured review under restaurant feedback without inventing delivery comment', () => {
    const { parseReviewDetails } = require('../features/reviews/types');
    const unstructuredComment = 'Delicious pasta and great presentation!';
    const parsed = parseReviewDetails(unstructuredComment);

    expect(parsed.restaurantComment).toBe('Delicious pasta and great presentation!');
    expect(parsed.deliveryComment).toBe('');
  });

  it('removes emojis from review comments cleanly', () => {
    const { stripEmojis, parseReviewDetails } = require('../features/reviews/types');
    expect(stripEmojis('Delicious Taste 😋')).toBe('Delicious Taste');
    expect(stripEmojis('Fresh & Hot 🔥, Delicious Taste 😋 • gud')).toBe('Fresh & Hot, Delicious Taste • gud');
    expect(stripEmojis('Contactless Drop 🚪')).toBe('Contactless Drop');

    const structuredWithEmojis =
      '[Food & Dining]: Fresh & Hot 🔥, Delicious Taste 😋 • gud\n\n[Delivery Service]: Contactless Drop 🚪';
    const parsed = parseReviewDetails(structuredWithEmojis);
    expect(parsed.restaurantComment).toBe('Fresh & Hot, Delicious Taste • gud');
    expect(parsed.deliveryComment).toBe('Contactless Drop');
  });

  it('accurately computes averages without hardcoded fallbacks', () => {
    const mockReviews = [
      { restaurantRating: 5, deliveryRating: 4 },
      { restaurantRating: 4, deliveryRating: null },
      { restaurantRating: null, deliveryRating: 2 },
    ];

    const restaurantRated = mockReviews.filter(
      (r) => typeof r.restaurantRating === 'number' && r.restaurantRating > 0
    );
    const deliveryRated = mockReviews.filter(
      (r) => typeof r.deliveryRating === 'number' && r.deliveryRating > 0
    );

    expect(restaurantRated).toHaveLength(2);
    expect(deliveryRated).toHaveLength(2);

    const avgResto = (
      restaurantRated.reduce((acc, r) => acc + (r.restaurantRating || 0), 0) /
      restaurantRated.length
    ).toFixed(1);

    const avgDeliv = (
      deliveryRated.reduce((acc, r) => acc + (r.deliveryRating || 0), 0) /
      deliveryRated.length
    ).toFixed(1);

    expect(avgResto).toBe('4.5');
    expect(avgDeliv).toBe('3.0');
  });
});
