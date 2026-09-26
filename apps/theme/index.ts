import { createAppTheme, type ColorMode } from 'foodie-shared-web';

/**
 * Admin theme — Blueprint §19.2.
 * Sky Blue accent extension over foodie-shared-web tokens.
 */
export function createAdminTheme(mode: ColorMode = 'light') {
  return createAppTheme(mode, {
    accent: mode === 'dark' ? '#38BDF8' : '#0284C7',
    accentMuted: mode === 'dark' ? '#075985' : '#E0F2FE',
    color: {
      success: mode === 'dark' ? '#38BDF8' : '#0EA5E9',
      warning: mode === 'dark' ? '#BAE6FD' : '#38BDF8',
      inProgress: mode === 'dark' ? '#38BDF8' : '#0284C7',
      error: mode === 'dark' ? '#7DD3FC' : '#0284C7',
      textPrimary: mode === 'dark' ? '#E0F2FE' : '#0369A1',
      textSecondary: mode === 'dark' ? '#7DD3FC' : '#0284C7',
      border: mode === 'dark' ? '#0369A1' : '#BAE6FD',
      background: mode === 'dark' ? '#082F49' : '#F0F9FF',
      surface: mode === 'dark' ? '#0C4A6E' : '#FFFFFF',
    },
  });
}
