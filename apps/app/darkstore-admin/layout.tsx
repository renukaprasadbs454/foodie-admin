import React, { type ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from 'foodie-shared-web/auth';
import { DarkstoreShell } from '@/features/darkstore/components/DarkstoreShell';

export default async function DarkstoreAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    redirect('/login');
  }

  return <DarkstoreShell>{children}</DarkstoreShell>;
}

