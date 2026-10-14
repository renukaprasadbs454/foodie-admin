import { trackAnalyticsEvent } from 'foodie-shared-web';
import { baseApi } from '@/api/baseApi';
import { authApi } from '@/api/endpoints/authApi';
import { clearSession } from './authSlice';
import type { AppDispatch } from '@/store/store';

/**
 * Admin logout — clear BFF cookies + Redux + RTK (P2-AUTH-04).
 * Always clears local session even if the BFF call fails.
 */
export async function logoutAdmin(dispatch: AppDispatch): Promise<void> {
  trackAnalyticsEvent('logout_tapped');
  try {
    await dispatch(authApi.endpoints.logout.initiate()).unwrap();
  } catch {
    // Still clear local session.
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('foodie_admin_role');
    localStorage.removeItem('foodie_admin_user_id');
    localStorage.removeItem('foodie_admin_email');
    localStorage.removeItem('foodie_admin_token');
    localStorage.removeItem('foodie_active_zone_id');
    localStorage.removeItem('foodie_active_zone_name');
    sessionStorage.removeItem('foodie_admin_role');
    sessionStorage.removeItem('foodie_admin_user_id');
    sessionStorage.removeItem('foodie_admin_email');
    sessionStorage.removeItem('foodie_admin_token');
    sessionStorage.removeItem('foodie_active_zone_id');
    sessionStorage.removeItem('foodie_active_zone_name');
    document.cookie = 'foodie_active_zone_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'foodie_active_zone_name=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'foodie_access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'foodie_refresh_token=; path=/; max-age=0; SameSite=Lax';
  }
  dispatch(clearSession());
  dispatch(baseApi.util.resetApiState());
  trackAnalyticsEvent('session_logged_out');
}
