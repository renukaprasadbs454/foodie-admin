/**
 * P2-ADM-05 admin reviews helpers — public GET /restaurants/{id}/reviews only.
 * No global list / moderation (GAP-API-20).
 */

export const REVIEW_SORT_WHITELIST = [
  'createdAt',
  '-createdAt',
  '+createdAt',
  'restaurantRating',
  '-restaurantRating',
  '+restaurantRating',
] as const;

export type ReviewSort = (typeof REVIEW_SORT_WHITELIST)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRestaurantUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function isReviewSort(value: string): value is ReviewSort {
  return (REVIEW_SORT_WHITELIST as readonly string[]).includes(value);
}

const EMOJI_REGEX =
  /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

export function stripEmojis(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(EMOJI_REGEX, '')
    .replace(/\s+([,:;!?])/g, '$1')
    .replace(/\s*•\s*/g, ' • ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function parseReviewDetails(comment?: string | null): {
  restaurantComment: string;
  deliveryComment: string;
} {
  if (!comment || !comment.trim()) {
    return { restaurantComment: '', deliveryComment: '' };
  }
  const cleanComment = stripEmojis(comment.trim());
  if (!cleanComment || cleanComment === 'Rating given without comment') {
    return { restaurantComment: cleanComment || 'Rating given without comment', deliveryComment: '' };
  }

  const hasStructuredFeedback =
    cleanComment.includes('[Food & Dining]:') ||
    cleanComment.includes('[Delivery Service]:') ||
    cleanComment.includes('[Restaurant]:') ||
    cleanComment.includes('[Delivery]:');

  if (!hasStructuredFeedback) {
    return {
      restaurantComment: cleanComment,
      deliveryComment: '',
    };
  }

  let restaurantComment = '';
  let deliveryComment = '';

  const sections = cleanComment.split('\n\n').filter(Boolean);
  for (const section of sections) {
    const isFood =
      section.startsWith('[Food & Dining]:') ||
      section.startsWith('[Restaurant]:') ||
      section.startsWith('[Food]:');
    const isDelivery =
      section.startsWith('[Delivery Service]:') ||
      section.startsWith('[Delivery]:');

    const cleanText = section
      .replace(/^\[(Food & Dining|Restaurant|Food|Delivery Service|Delivery)\]:\s*/i, '')
      .trim();

    if (isFood) {
      restaurantComment = restaurantComment ? `${restaurantComment} • ${cleanText}` : cleanText;
    } else if (isDelivery) {
      deliveryComment = deliveryComment ? `${deliveryComment} • ${cleanText}` : cleanText;
    } else {
      restaurantComment = restaurantComment ? `${restaurantComment}\n${section}` : section;
    }
  }

  return { restaurantComment, deliveryComment };
}
