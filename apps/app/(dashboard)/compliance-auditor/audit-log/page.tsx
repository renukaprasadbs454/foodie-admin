'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComplianceAuditLogRoutePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/compliance-auditor/dashboard');
  }, [router]);

  return null;
}
