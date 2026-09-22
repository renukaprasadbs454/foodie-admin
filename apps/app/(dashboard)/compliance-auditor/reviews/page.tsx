'use client';

import React, { Suspense } from 'react';
import { ReviewsPage } from '@/features/reviews/pages/ReviewsPage';

export default function ComplianceReviewsPage() {
  return (
    <Suspense fallback={<div>Loading compliance reviews…</div>}>
      <ReviewsPage />
    </Suspense>
  );
}
