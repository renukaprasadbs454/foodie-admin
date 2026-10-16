'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Operating Zone Selection Page
 * In accordance with direct-login requirements, users are routed directly to /dashboard.
 * Any direct navigation or bookmark hitting /zone-select is immediately forwarded to /dashboard.
 */
export default function ZoneSelectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
