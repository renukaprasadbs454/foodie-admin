import { Suspense } from 'react';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';

export default function ComplianceSettingsRoutePage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsPage />
    </Suspense>
  );
}
