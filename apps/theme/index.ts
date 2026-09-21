import { createAppTheme, type ColorMode } from 'foodie-shared-web';

/**
 * Admin theme — Blueprint §19.2.
 * Thin accent extension over foodie-shared-web tokens only.
 */
export function createAdminTheme(mode: ColorMode = 'light') {
  return createAppTheme(mode, {
    accent: mode === 'dark' ? '#38BDF8' : '#0284C7',
    accentMuted: mode === 'dark' ? '#075985' : '#E0F2FE',
    color: {
      success: mode === 'dark' ? '#34D399' : '#10B981',
      warning: mode === 'dark' ? '#FBBF24' : '#F59E0B',
      inProgress: mode === 'dark' ? '#38BDF8' : '#0EA5E9',
      error: mode === 'dark' ? '#F87171' : '#EF4444',
    },
  });
}

