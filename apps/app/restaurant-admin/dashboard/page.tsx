'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantsPage } from '@/features/restaurants/pages/RestaurantsPage';

export default function RestaurantAdminDashboardRoutePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/restaurants');
  }, [router]);

  return <RestaurantsPage />;
}
